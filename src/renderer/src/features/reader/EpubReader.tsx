// src/renderer/src/features/reader/EpubReader.tsx

import React, { useEffect, useRef, useState } from "react";
import ePub from "epubjs";
import type { Book } from "@/types";
import { useSettingStore } from "@/stores/setting-store";

interface EpubReaderProps {
  book: Book;
  onBack: () => void;
  sidebarVisible: boolean;
  onProgressChange?: (p: {
    chapterIndex: number;
    offset: number;
    totalChapters: number;
  }) => void;
}

interface EpubChapter {
  id: string;
  label: string;
  text: string;
}

export const EpubReader: React.FC<EpubReaderProps> = ({
  book,
  onBack,
  sidebarVisible,
  onProgressChange,
}) => {
  const bookRef = useRef<any>(null);

  const [chapters, setChapters] = useState<EpubChapter[]>([]);
  const [currentIndex, setCurrentIndex] = useState(
    (book as any).lastChapter || 0
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hasRestoredRef = useRef(false);

  const { fontSize, lineHeight, fontFamily } = useSettingStore(
    (s) => s.reader
  );

  const computedFontFamily = (() => {
    switch (fontFamily) {
      case "serif":
        return `'Noto Serif SC', 'Songti SC', 'STSong', 'SimSun', serif`;
      case "sans":
        return `'Noto Sans SC', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      case "yahei":
        return `'Microsoft YaHei', 'Noto Sans SC', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
      case "songti":
        return `'Songti SC', 'STSong', 'SimSun', 'Noto Serif SC', serif`;
      case "system":
      default:
        return `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif`;
    }
  })();

  const extractTextFromHtml = (rawHtml: any): string => {
    try {
      let html = "";

      if (typeof rawHtml === "string") {
        html = rawHtml;
      } else if (
        rawHtml instanceof ArrayBuffer ||
        ArrayBuffer.isView(rawHtml)
      ) {
        const buf =
          rawHtml instanceof ArrayBuffer ? rawHtml : rawHtml.buffer;
        const decoder = new TextDecoder("utf-8");
        html = decoder.decode(buf);
      } else {
        return "（本章内容暂无法解析：未知格式）";
      }

      html = html.replace(/^\uFEFF/, "").trim();

      if (!html.includes("<") || !html.includes(">")) {
        return "（本章内容暂无法解析：非 HTML 内容）";
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const body = doc.querySelector("body") || doc.documentElement;
      let text = body?.textContent || "";

      text = text
        .replace(/\u00A0/g, " ")
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      if (!text) {
        return "（本章暂无可解析文本内容）";
      }

      return text;
    } catch (e) {
      console.error("[EpubReader] extractTextFromHtml error:", e);
      return "（本章内容暂无法解析：解析出错）";
    }
  };

  useEffect(() => {
    if (!book.filePath) {
      setError("该 EPUB 没有关联的本地文件。");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        setChapters([]);
        setCurrentIndex((book as any).lastChapter || 0);
        hasRestoredRef.current = false;

        const base64 = await window.api.readFileBinary(book.filePath);
        const binary = atob(base64);
        const len = binary.length;
        const buf = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          buf[i] = binary.charCodeAt(i);
        }

        const b = ePub(buf.buffer);
        bookRef.current = b;

        await b.ready;

        const nav = await b.loaded.navigation;
        const toc = (nav && nav.toc) || [];

        const collected: EpubChapter[] = [];

        if (toc.length > 0) {
          for (let idx = 0; idx < toc.length; idx++) {
            if (cancelled) return;
            const item = toc[idx];
            const label = item.label || `章节 ${idx + 1}`;
            const id = item.id || String(idx);

            try {
              const spineItem = b.spine.get(item.href);
              if (!spineItem) {
                collected.push({
                  id,
                  label,
                  text: "（本章内容暂无法解析：未找到 spineItem）",
                });
                continue;
              }

              const rawHtml = await spineItem.load(b.load.bind(b));
              const text = extractTextFromHtml(rawHtml);

              collected.push({
                id,
                label,
                text,
              });

              spineItem.unload?.();
            } catch (e) {
              console.error("[EpubReader] toc chapter load error:", e);
              collected.push({
                id,
                label,
                text: "（本章内容暂无法解析：加载失败）",
              });
            }
          }
        } else {
          const spineItems = b.spine.spineItems;
          for (let idx = 0; idx < spineItems.length; idx++) {
            if (cancelled) return;
            const spineItem = spineItems[idx];

            try {
              const rawHtml = await spineItem.load(b.load.bind(b));
              const text = extractTextFromHtml(rawHtml);

              collected.push({
                id: spineItem.id || String(idx),
                label: `章节 ${idx + 1}`,
                text,
              });

              spineItem.unload?.();
            } catch (e) {
              console.error("[EpubReader] spine chapter load error:", e);
              collected.push({
                id: spineItem.id || String(idx),
                label: `章节 ${idx + 1}`,
                text: "（本章内容暂无法解析：加载失败）",
              });
            }
          }
        }

        if (!cancelled) {
          setChapters(collected);
          const idx = Math.min(
            (book as any).lastChapter || 0,
            collected.length - 1
          );
          setCurrentIndex(idx < 0 ? 0 : idx);
          setLoading(false);
        }
      } catch (e: any) {
        console.error("[EpubReader] Error:", e?.message || e);
        if (!cancelled) {
          setError(e?.message || "EPUB 打开失败");
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      try {
        bookRef.current?.destroy?.();
      } catch {
        // ignore
      }
    };
  }, [book.filePath]);

  // 初次恢复滚动位置
  useEffect(() => {
    if (!chapters.length) return;
    if (hasRestoredRef.current) return;
    const offset = (book as any).lastOffset || 0;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = offset;
      hasRestoredRef.current = true;
    }
  }, [chapters.length, currentIndex, book.lastOffset]);

  const totalChapters = chapters.length;

  const reportProgress = (chapterIndex: number, offset: number) => {
    if (onProgressChange) {
      onProgressChange({
        chapterIndex,
        offset,
        totalChapters,
      });
    }
  };

  const handleScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
    const target = e.currentTarget;
    const { scrollTop, clientHeight, scrollHeight } = target;

    reportProgress(currentIndex, scrollTop);

    if (scrollTop + clientHeight >= scrollHeight - 10) {
      if (currentIndex < chapters.length - 1) {
        const next = currentIndex + 1;
        setCurrentIndex(next);
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTo({
              top: 0,
              behavior: "smooth",
            });
            reportProgress(next, 0);
          }
        });
      }
    }
  };

  const handleJumpChapter = (index: number) => {
    if (index < 0 || index >= chapters.length) return;
    setCurrentIndex(index);
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ top: 0, behavior: "auto" });
        reportProgress(index, 0);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <div className="text-base font-medium text-foreground">
          {book.title}
        </div>
        <div>正在解析 EPUB 文本…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="text-base font-semibold text-destructive">
          EPUB 打开失败
        </div>
        <div className="text-sm text-muted-foreground">{error}</div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:brightness-110 active:scale-[0.98]"
        >
          返回书架
        </button>
      </div>
    );
  }

  if (!chapters.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <div>未能从 EPUB 中解析出任何章节内容。</div>
        <button
          type="button"
          onClick={onBack}
          className="mt-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm hover:brightness-110 active:scale-[0.98]"
        >
          返回书架
        </button>
      </div>
    );
  }

  const currentChapter = chapters[currentIndex];

  return (
    <div className="flex h-full w-full">
      {/* 目录侧栏 */}
      <aside
        className={`z-10 flex w-64 flex-col border-r border-border bg-card/40 transition-transform duration-200 ${
          sidebarVisible ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground">
              {book.title}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {book.author || "未知作者"}（EPUB）
            </span>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-md bg-transparent px-2 py-1 text-[11px] text-primary hover:bg-primary/10"
          >
            返回
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <ul className="space-y-0.5 p-2 text-xs">
            {chapters.map((ch, idx) => {
              const active = idx === currentIndex;
              return (
                <li key={ch.id}>
                  <button
                    type="button"
                    onClick={() => handleJumpChapter(idx)}
                    className={`w-full rounded-md px-2 py-1 text-left transition ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span className="mr-1 text-[10px] text-slate-400">
                      {idx + 1}.
                    </span>
                    {ch.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* 正文 */}
      <main className="flex flex-1 flex-col overflow-hidden bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              {book.title}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {book.author || "未知作者"} · 第 {currentIndex + 1} /
              {chapters.length} 章
            </span>
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto px-8 py-4"
        >
          <div
            className="mx-auto max-w-3xl whitespace-pre-wrap text-foreground"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight,
              fontFamily: computedFontFamily,
            }}
          >
            <div className="mb-4 text-lg font-semibold">
              {currentChapter.label}
            </div>
            {currentChapter.text}
          </div>
        </div>
      </main>
    </div>
  );
};
