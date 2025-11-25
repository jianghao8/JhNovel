// src/main/crawler.ts
import axios from "axios";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import UserAgent from "user-agents";
import { SOURCES, SiteRule } from "./rules";
import { join } from "path";
import * as fs from "fs";

// 辅助：随机 UA
function getRandomUA() {
  return new UserAgent({ deviceCategory: "desktop" }).toString();
}

// 简单 sleep
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带重试的页面获取
 */
async function fetchPage(
  url: string,
  encoding: "utf-8" | "gbk" = "utf-8",
  method: "get" | "post" = "get",
  data: any = null,
  maxRetry = 3
): Promise<cheerio.CheerioAPI | null> {
  for (let attempt = 1; attempt <= maxRetry; attempt++) {
    try {
      const response = await axios({
        url,
        method,
        data,
        responseType: "arraybuffer",
        headers: {
          "User-Agent": getRandomUA(),
          Referer: new URL(url).origin,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          Connection: "keep-alive",
        },
        timeout: 15000,
      });

      const buffer = response.data as Buffer;
      const content = iconv.decode(
        buffer,
        encoding === "gbk" ? "gbk" : "utf-8"
      );

      // 反爬提示
      if (
        content.includes("Checking your browser") ||
        content.includes("Just a moment") ||
        content.includes("访问过于频繁") ||
        content.includes("系统检测到异常访问")
      ) {
        console.warn("[Anti-Bot] Blocked by", url);
        return null;
      }

      return cheerio.load(content);
    } catch (err: any) {
      const code = err?.code || err?.message || "UNKNOWN_ERROR";
      console.error(`[Fetch Fail] (${attempt}/${maxRetry}) ${url} - ${code}`);
      if (attempt === maxRetry) {
        console.error("[Fetch Fail] Giving up:", url);
        return null;
      }
      await sleep(1000);
    }
  }

  return null;
}

export class NovelCrawler {
  /**
   * 聚合搜索
   */
  static async search(keyword: string) {
    const results: any[] = [];
    console.log("[Search] Keyword:", keyword);

    const tasks = SOURCES.map(async (source) => {
      try {
        if (!source.searchUrl) return;

        let targetUrl = source.searchUrl;
        let postData: any = null;

        if (source.method === "post") {
          const params = new URLSearchParams();
          // 这里不同网站字段不一样，只做一个兜底
          params.append("searchkey", keyword);
          postData = params;
        } else {
          targetUrl = targetUrl.replace("%s", encodeURIComponent(keyword));
        }

        const $ = await fetchPage(
          targetUrl,
          source.searchEncoding,
          source.method,
          postData
        );
        if (!$) return;

        $(source.searchList).each((_, el) => {
          const $el = $(el);
          const titleEl = $el.find(source.searchTitle);
          const authorEl = $el.find(source.searchAuthor);
          const linkEl = $el.find(source.searchId);

          const title = titleEl.text().trim();
          const author = authorEl.text().trim();
          let link = linkEl.attr("href");

          if (title && link) {
            if (!link.startsWith("http")) {
              try {
                link = new URL(link, source.url).toString();
              } catch {
                // URL 解析失败就跳过
                return;
              }
            }

            results.push({
              id: link,
              title,
              author: author || "未知",
              description: `来源：${source.name}`,
              source: source.name,
            });
          }
        });
      } catch {
        // 单个源失败不要影响总体
      }
    });

    await Promise.all(tasks);

    // 去重
    const unique = results.reduce((acc: any[], cur) => {
      const exists = acc.find(
        (x) => x.title === cur.title && x.author === cur.author
      );
      return exists ? acc : acc.concat(cur);
    }, []);

    console.log(
      `[Search] Found ${unique.length} books total. (raw: ${results.length})`
    );
    return unique;
  }

  /**
   * 下载整本书
   */
  static async download(bookUrl: string, saveDir: string, sourceName: string) {
    // 根据名称匹配源；若失败再尝试根据域名匹配
    const source =
      SOURCES.find((s) => s.name === sourceName) ||
      SOURCES.find((s) =>
        bookUrl.includes(new URL(s.url).hostname.replace("www.", ""))
      ) ||
      SOURCES[0];

    console.log("[Download] Target:", bookUrl);
    console.log("[Download] Using Rule:", source.name);

    const $page = await fetchPage(bookUrl, source.searchEncoding);
    if (!$page) {
      throw new Error("网站连接失败，请稍后重试或更换其他源。");
    }
    let $ = $page;

    // 尝试抓书名
    let bookTitle =
      $(source.searchTitle).first().text().trim() ||
      $('meta[property="og:novel:book_name"]').attr("content") ||
      $('meta[property="og:title"]').attr("content") ||
      "未命名书籍";

    // 解析目录
    let chapters = this.parseChapters($, source, bookUrl);

    // 如果解析不到章节，有可能当前是简介页 → 寻找“开始阅读 / 目录”按钮
    if (!chapters.length) {
      console.log(
        "[Download] 0 chapters found. Trying to locate catalog link from <a> tags..."
      );

      let tocUrl = "";
      const keywords = ["开始阅读", "章节列表", "目录", "全部章节", "查看目录"];
      let found = false;

      $("a[href]").each((_, el) => {
        if (found) return;

        const text = $(el).text().trim();
        if (!text) return;

        if (keywords.some((k) => text.includes(k))) {
          // 这里不再用 cheerio.Element 类型，直接用 jQuery 风格的 attr
          let href = $(el).attr("href") || "";
          if (!href) return;

          if (!href.startsWith("http")) {
            try {
              href = new URL(href, bookUrl).toString();
            } catch {
              return;
            }
          }
          tocUrl = href;
          found = true;
        }
      });

      if (tocUrl) {
        console.log("[Download] Redirecting to catalog page:", tocUrl);
        const $page2 = await fetchPage(tocUrl, source.searchEncoding);
        if ($page2) {
          $ = $page2;
          chapters = this.parseChapters($, source, tocUrl);
        }
      }
    }

    console.log("[Download] Final chapter count:", chapters.length);

    if (!chapters.length) {
      throw new Error(
        "未找到章节目录：该源的页面结构可能已改版或存在反爬验证，请尝试更换其他源。"
      );
    }

    // 写入 TXT
    const safeTitle = bookTitle.replace(/[\\/:*?"<>|]/g, "_");
    const filename = `${safeTitle}.txt`;
    const filepath = join(saveDir, filename);
    const stream = fs.createWriteStream(filepath, { flags: "w" });

    stream.write(`《${bookTitle}》\n来源：${source.name}\n网址：${bookUrl}\n\n`);

    const CONCURRENCY = 5;
    let successCount = 0;

    for (let i = 0; i < chapters.length; i += CONCURRENCY) {
      const chunk = chapters.slice(i, i + CONCURRENCY);

      const chunkResults = await Promise.all(
        chunk.map(async (chap) => {
          try {
            const $c = await fetchPage(chap.url, source.searchEncoding);
            if (!$c) return null;

            let contentHtml = $c(source.contentText).html();
            if (!contentHtml) return null;

            // HTML → 文本
            contentHtml = contentHtml.replace(/<br\s*\/?>/gi, "\n");
            contentHtml = contentHtml.replace(/<p[^>]*>/gi, "\n");
            contentHtml = contentHtml.replace(/<\/p>/gi, "");
            contentHtml = contentHtml.replace(/&nbsp;/g, " ");

            if (source.contentRemove) {
              contentHtml = contentHtml.replace(
                new RegExp(source.contentRemove, "g"),
                ""
              );
            }

            const text = cheerio.load(contentHtml).text();

            return `\n\n${chap.title}\n\n${text}\n`;
          } catch {
            return null;
          }
        })
      );

      for (const part of chunkResults) {
        if (part) {
          stream.write(part);
          successCount++;
        }
      }

      if (i % 20 === 0) {
        console.log(`[Download] Progress: ${i}/${chapters.length}`);
      }
    }

    stream.end();
    console.log(
      `[Download] Completed. Saved ${successCount}/${chapters.length} chapters.`
    );
    return filepath;
  }

  /**
   * 章节解析：兼容 tocList 选到父节点 或 直接选到 <a> 的两种写法
   */
  private static parseChapters(
    $: cheerio.CheerioAPI,
    source: SiteRule,
    baseUrl: string
  ) {
    const list: { title: string; url: string }[] = [];

    if (!source.tocList) {
      // 没配置目录选择器，直接放弃
      return list;
    }

    $(source.tocList).each((_, el) => {
      const $el = $(el);
      let $a: cheerio.Cheerio<any>;

      if (!source.tocLink || source.tocLink.trim() === "") {
        // 没有指定 tocLink，就把 tocList 当 <a> 用
        $a = $el;
      } else {
        // 如果当前元素本身就是 tocLink（例如 <a>），直接用它
        if ($el.is(source.tocLink)) {
          $a = $el;
        } else {
          $a = $el.find(source.tocLink);
        }
      }

      if ($a.length === 0) return;

      const title = $a.text().trim();
      let href = $a.attr("href");

      if (!title || !href) return;

      if (!href.startsWith("http")) {
        try {
          href = new URL(href, baseUrl).toString();
        } catch {
          return;
        }
      }

      list.push({
        title,
        url: href,
      });
    });

    return list;
  }
}
