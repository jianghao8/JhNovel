import React, { useState, useRef } from "react";
import { Search, Download } from "lucide-react";
import { db } from "@/lib/db";

interface SearchResult {
  id: string; // 详情页 URL
  title: string;
  author?: string;
  description?: string;
  source?: string;
}

interface DownloadResponse {
  success: boolean;
  path?: string;
  message?: string;
  title?: string;
  author?: string;
}

export const CrawlerPage: React.FC = () => {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const downloadTimerRef = useRef<number | null>(null);

  const handleSearch = async () => {
    const kw = keyword.trim();
    if (!kw) {
      setError("请输入要搜索的书名。");
      setResults([]);
      return;
    }

    if (!window.api || typeof (window.api as any).searchNovel !== "function") {
      console.error("[Crawler] window.api.searchNovel 未定义");
      setError("搜索功能未启用，请检查 preload/index.ts 中是否暴露了 searchNovel。");
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResults([]);

      console.log("[Crawler] searching:", kw);
      const raw = await (window.api as any).searchNovel(kw);
      console.log("[Crawler] search result raw =", raw);

      let list: SearchResult[] = [];

      if (Array.isArray(raw)) {
        list = raw as SearchResult[];
      } else if (raw && Array.isArray((raw as any).items)) {
        list = (raw as any).items as SearchResult[];
      } else if (raw && Array.isArray((raw as any).results)) {
        list = (raw as any).results as SearchResult[];
      }

      if (!list || list.length === 0) {
        setError("没有找到相关书籍，试试换个关键词。");
        setResults([]);
        return;
      }

      setResults(list);
    } catch (e: any) {
      console.error("[Crawler] search error:", e);
      setError(e?.message || "搜索失败，请稍后重试。");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const clearDownloadTimer = () => {
    if (downloadTimerRef.current != null) {
      window.clearInterval(downloadTimerRef.current);
      downloadTimerRef.current = null;
    }
  };

  const startFakeProgress = () => {
    clearDownloadTimer();
    setDownloadProgress(0);
    downloadTimerRef.current = window.setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 2;
      });
    }, 200);
  };

  const handleDownload = async (item: SearchResult) => {
    if (!window.api || typeof (window.api as any).downloadNovel !== "function") {
      console.error("[Crawler] window.api.downloadNovel 未定义");
      alert("下载功能未启用，请检查 preload/index.ts 中是否暴露了 downloadNovel。");
      return;
    }

    try {
      setDownloadingId(item.id || item.title);
      startFakeProgress();

      const res = (await (window.api as any).downloadNovel(
        item
      )) as DownloadResponse;

      console.log("[Crawler] download result =", res);

      if (!res || !res.success || !res.path) {
        clearDownloadTimer();
        setDownloadProgress(0);
        setDownloadingId(null);
        alert(res?.message || "下载失败，请稍后重试。");
        return;
      }

      const now = new Date().toISOString();
      const title = res.title || item.title || "未命名书籍";
      const author = res.author || item.author || "未知";

      await db.books.add({
        title,
        author,
        filePath: res.path,
        fileType: "txt",
        createdAt: now,
        updatedAt: now,
        lastReadAt: null,
        lastChapter: 0,
        lastOffset: 0,
        progress: 0,
        fromCrawler: true,
      } as any);

      // 进度拉到 100%
      clearDownloadTimer();
      setDownloadProgress(100);

      setTimeout(() => {
        setDownloadingId(null);
        setDownloadProgress(0);
      }, 600);

      alert(`下载完成：${title}（已加入书架）`);
    } catch (e: any) {
      console.error("[Crawler] download error:", e);
      clearDownloadTimer();
      setDownloadingId(null);
      setDownloadProgress(0);
      alert(e?.message || "下载失败，请稍后重试。");
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* 顶部搜索栏 */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold text-foreground">书城</h1>
          <p className="text-xs text-muted-foreground">
            在线搜索并下载小说到本地书架
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-64 rounded-full border border-input bg-background px-8 py-1.5 text-xs outline-none placeholder:text-muted-foreground"
              placeholder="输入书名关键字…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-[0.97]"
          >
            搜索
          </button>
        </div>
      </header>

      {/* 内容区域 */}
      <main className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            正在搜索中，请稍候…
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            {results.length === 0 && !error ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <div>还没有搜索结果。</div>
                <div className="text-xs">
                  在上方输入书名关键字，例如：
                  <span className="mx-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                    三体
                  </span>
                  ，然后点击「搜索」。
                </div>
              </div>
            ) : null}

            {results.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {results.map((item, idx) => {
                  const id = item.id || `${item.title}-${idx}`;
                  const isDownloading = downloadingId === id;

                  return (
                    <div
                      key={id}
                      className="flex flex-col rounded-xl border border-border bg-card/60 p-3 text-xs shadow-sm transition hover:border-primary/60 hover:shadow-md"
                    >
                      <div className="mb-1 line-clamp-2 text-sm font-semibold text-foreground">
                        {item.title || "未命名书籍"}
                      </div>
                      <div className="mb-1 text-[11px] text-muted-foreground">
                        作者：{item.author || "未知"}
                      </div>
                      {item.source && (
                        <div className="mb-1 text-[11px] text-muted-foreground">
                          来源：{item.source}
                        </div>
                      )}
                      {item.description && (
                        <div className="mb-2 line-clamp-3 text-[11px] text-muted-foreground">
                          {item.description}
                        </div>
                      )}

                      {/* 下载进度条 */}
                      {isDownloading && (
                        <div className="mb-2">
                          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>下载中…</span>
                            <span>{downloadProgress.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${downloadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="mt-auto flex items-center justify-end">
                        <button
                          type="button"
                          disabled={isDownloading || !!downloadingId}
                          onClick={() => handleDownload(item)}
                          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Download className="h-3 w-3" />
                          {isDownloading ? "下载中…" : "立即下载"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default CrawlerPage;
