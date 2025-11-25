// src/renderer/src/features/reader/PdfReader.tsx

import React, { useEffect, useState } from "react";
import type { Book } from "@/types";
import { useSettingStore } from "@/stores/setting-store";

import * as pdfjsLib from "pdfjs-dist";

// 使用 CDN 的 worker，避免本地打包配置问题
// @ts-ignore
(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs";

interface PdfReaderProps {
  book: Book;
  onBack: () => void;
}

export const PdfReader: React.FC<PdfReaderProps> = ({ book, onBack }) => {
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fontSize, lineHeight, fontFamily } = useSettingStore(
    (s) => s.reader
  );

  useEffect(() => {
    if (!book.filePath) {
      setError("该 PDF 没有关联的本地文件。");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const base64 = await window.api.readFileBinary(book.filePath);
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const loadingTask = (pdfjsLib as any).getDocument({
          data: bytes,
        });

        const pdf = await loadingTask.promise;
        const total = pdf.numPages;

        // 防止超大 PDF 一次性读完卡死，这里最多读 500 页
        const maxPages = Math.min(total, 500);

        const allPages: string[] = [];

        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const strs = textContent.items.map((it: any) => it.str as string);
          allPages.push(strs.join(" "));
        }

        if (!cancelled) {
          setPages(allPages);
          setCurrentPage(1);
          setLoading(false);
        }
      } catch (e: any) {
        console.error("[PdfReader] Error:", e?.message || e);
        if (!cancelled) {
          setError(e?.message || "PDF 打开失败");
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [book.filePath]);

  const handlePrev = () => {
    setCurrentPage((p) => (p > 1 ? p - 1 : p));
  };

  const handleNext = () => {
    setCurrentPage((p) => (p < pages.length ? p + 1 : p));
  };

  const currentText =
    pages.length > 0 && currentPage >= 1 && currentPage <= pages.length
      ? pages[currentPage - 1]
      : "";

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

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <div className="text-base font-medium text-foreground">
          {book.title}
        </div>
        <div>正在解析 PDF 文本…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="text-base font-semibold text-destructive">
          PDF 打开失败
        </div>
        <div className="text-sm text-muted-foreground">{error}</div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-[0.98]"
        >
          返回书架
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* 左侧页码列表 */}
      <aside className="flex w-64 flex-col border-r border-border bg-card/40">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground">
              {book.title}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {book.author || "未知作者"}（PDF）
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
            {pages.map((_, idx) => {
              const pageNum = idx + 1;
              const active = pageNum === currentPage;
              return (
                <li key={pageNum}>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-full rounded-md px-2 py-1 text-left transition ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    第 {pageNum} 页
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* 右侧正文 */}
      <main className="flex flex-1 flex-col overflow-hidden bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              {book.title}
            </span>
            <span className="text-[11px] text-muted-foreground">
              第 {currentPage} / {pages.length} 页
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentPage <= 1}
              className="rounded-md border border-input px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              上一页
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={currentPage >= pages.length}
              className="rounded-md border border-input px-2 py-1 text-[11px] text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-8 py-4">
          <div
            className="mx-auto max-w-3xl whitespace-pre-wrap text-foreground"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight,
              fontFamily: computedFontFamily,
            }}
          >
            {currentText || "（本页暂无可解析文本内容）"}
          </div>
        </div>
      </main>
    </div>
  );
};
