// src/renderer/src/features/reader/ReaderPage.tsx

import React, { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "@/lib/db";
import type { Book } from "@/types";
import { cn } from "@/lib/utils";
import { TxtReader } from "./TxtReader";
import { EpubReader } from "./EpubReader";
import { PdfReader } from "./PdfReader";
import {
  ChevronLeft,
  List as ListIcon,
  Settings2,
  ChevronRight,
} from "lucide-react";
import { useSettingStore } from "@/stores/setting-store";

interface ReaderProgress {
  chapterIndex: number;
  offset: number;
  totalChapters: number;
  progress: number; // 0~1
}

interface ParsedChapter {
  title: string;
  content: string;
}

// 去掉类似“第1章：xxx：xxx”的重复尾巴
function normalizeChapterTitle(raw: string): string {
  if (!raw) return raw;
  const s = raw.trim();
  const pattern = /(.+?)[：:\-\—·\s]+(\1)$/;
  const m = s.match(pattern);
  if (m) {
    return m[1].trim();
  }
  return s;
}

// 判断标题里是否已经带有 “第xx章 / 第xx节 / 第xx卷 / 第xx回”
function hasChapterNumberPrefix(title: string): boolean {
  const s = title.trim();
  return /^第[0-9一二三四五六七八九十百千万零两]+[章节卷回部篇]/.test(s);
}

export const ReaderPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookId = (location.state as any)?.bookId as number | undefined;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [chapters, setChapters] = useState<ParsedChapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);

  const [showToc, setShowToc] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // 设置 store
  const theme = useSettingStore((s) => s.theme);
  const setTheme = useSettingStore((s) => s.setTheme);
  const reader = useSettingStore((s) => s.reader);
  const updateReader = useSettingStore((s) => s.updateReader);

  const {
    fontSize,
    lineHeight,
    fontFamily,
    autoNextChapter,
    textAlign,
    showProgressBar,
  } = reader;

  // 进度写入节流
  const pendingProgressRef = useRef<{
    chapterIndex: number;
    offset: number;
    progress: number;
    lastReadAt: string;
  } | null>(null);
  const progressWriteTimerRef = useRef<number | null>(null);

  // 用于 TxtReader 恢复初始位置
  const initialChapterIndexRef = useRef<number>(0);
  const initialOffsetRef = useRef<number>(0);

  useEffect(() => {
    if (typeof bookId !== "number") {
      setLoadError("未找到指定书籍（缺少 bookId）。请从书架重新进入。");
      setLoading(false);
      return;
    }

    const loadBook = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const found = await db.books.get(bookId);
        if (!found) {
          setLoadError("未在书架中找到这本书，可能已被删除。");
          setBook(null);
        } else {
          const b = found as Book;
          setBook(b);

          const initialIndex = typeof b.lastChapter === "number" ? b.lastChapter : 0;
          const initialOffset = typeof b.lastOffset === "number" ? b.lastOffset : 0;

          initialChapterIndexRef.current = initialIndex;
          initialOffsetRef.current = initialOffset;

          setCurrentChapterIndex(initialIndex);
        }
      } catch (err) {
        console.error("[ReaderPage] loadBook error:", err);
        setLoadError("加载书籍信息失败，请稍后重试。");
      } finally {
        setLoading(false);
      }
    };

    loadBook();

    return () => {
      if (progressWriteTimerRef.current != null) {
        window.clearTimeout(progressWriteTimerRef.current);
        progressWriteTimerRef.current = null;
      }
    };
  }, [bookId, location.state]);

  const fileType: "txt" | "epub" | "pdf" | "unknown" = useMemo(() => {
    if (!book) return "unknown";
    const t = (book as any).fileType || "txt";
    if (t === "txt" || t === "epub" || t === "pdf") return t;
    return "txt";
  }, [book]);

  const handleProgressChange = (p: ReaderProgress) => {
    if (!bookId || !book) return;

    // 内存状态立即更新（用于顶部标题 & 进度条）
    setBook((prev) =>
      prev && prev.id === book.id
        ? ({
            ...prev,
            lastChapter: p.chapterIndex,
            lastOffset: p.offset,
            progress: p.progress,
            lastReadAt: new Date().toISOString(),
          } as Book)
        : prev
    );

    const now = new Date().toISOString();
    pendingProgressRef.current = {
      chapterIndex: p.chapterIndex,
      offset: p.offset,
      progress: p.progress,
      lastReadAt: now,
    };

    if (progressWriteTimerRef.current == null) {
      progressWriteTimerRef.current = window.setTimeout(async () => {
        progressWriteTimerRef.current = null;
        const latest = pendingProgressRef.current;
        if (!latest) return;
        pendingProgressRef.current = null;
        try {
          await db.books.update(bookId, {
            lastChapter: latest.chapterIndex,
            lastOffset: latest.offset,
            progress: latest.progress,
            lastReadAt: latest.lastReadAt,
          });
        } catch (err) {
          console.error("[ReaderPage] throttled progress update failed:", err);
        }
      }, 400);
    }
  };

  const handleChaptersChange = (list: ParsedChapter[]) => {
    setChapters(list || []);
  };

  const handleClickChapterInToc = (index: number) => {
    if (index < 0 || index >= chapters.length) return;
    setCurrentChapterIndex(index);
  };

  const handleBackToLibrary = () => {
    navigate("/library");
  };

  const progressPercent = useMemo(() => {
    if (!book || typeof (book as any).progress !== "number") return 0;
    const v = ((book as any).progress as number) * 100;
    if (Number.isNaN(v)) return 0;
    return Math.max(0, Math.min(100, Math.round(v)));
  }, [book]);

  // 顶部显示的章节标签：
  // - 如果解析出来的标题本身带有 “第xx章/节/卷/回”，直接用原始标题；
  // - 否则加上当前索引的数字前缀：第 N 章 + 标题。
  const currentChapterLabel = useMemo(() => {
    if (fileType !== "txt" || chapters.length === 0) return "";
    const idx = Math.min(
      Math.max(currentChapterIndex, 0),
      chapters.length - 1
    );
    const raw = chapters[idx]?.title?.trim() || "";
    if (!raw) {
      return `第${idx + 1}章`;
    }
    const normalized = normalizeChapterTitle(raw);
    if (hasChapterNumberPrefix(normalized)) {
      return normalized;
    }
    return `第${idx + 1}章 ${normalized}`;
  }, [fileType, chapters, currentChapterIndex]);

  const canPrevChapter =
    fileType === "txt" && currentChapterIndex > 0 && chapters.length > 0;
  const canNextChapter =
    fileType === "txt" &&
    chapters.length > 0 &&
    currentChapterIndex < chapters.length - 1;

  const goPrevChapter = () => {
    if (!canPrevChapter) return;
    setCurrentChapterIndex((idx) => Math.max(0, idx - 1));
  };

  const goNextChapter = () => {
    if (!canNextChapter) return;
    setCurrentChapterIndex((idx) =>
      Math.min(chapters.length - 1, idx + 1)
    );
  };

  // TxtReader 请求改变章节时的统一处理
  const handleRequestChangeChapter = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= chapters.length) return;
    setCurrentChapterIndex(targetIndex);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        正在加载阅读器…
      </div>
    );
  }

  if (loadError || !book) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <div>{loadError || "书籍加载失败。"}</div>
        <button
          type="button"
          onClick={handleBackToLibrary}
          className="rounded-full border border-border px-4 py-1.5 text-xs text-foreground hover:bg-accent"
        >
          返回书架
        </button>
      </div>
    );
  }

  const showTocPanel = fileType === "txt" && chapters.length > 0;

  return (
    <div className="flex h-full">
      {/* 左侧章节目录（仅 TXT 有） */}
      {showTocPanel && (
        <aside
          className={cn(
            "hidden h-full flex-col border-r border-border bg-card/60 md:flex",
            showToc ? "w-64" : "w-0"
          )}
        >
          {showToc && (
            <>
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <div className="text-xs font-semibold text-muted-foreground">
                  目录
                </div>
                <button
                  type="button"
                  onClick={() => setShowToc(false)}
                  className="rounded px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent"
                >
                  隐藏
                </button>
              </div>
              <div className="flex-1 overflow-auto px-2 py-2">
                {chapters.map((ch, idx) => {
                  const active = idx === currentChapterIndex;
                  const rawTitle = ch.title || `第 ${idx + 1} 章`;
                  const title = normalizeChapterTitle(rawTitle);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleClickChapterInToc(idx)}
                      className={cn(
                        "mb-1 flex w-full items-start rounded-lg px-2 py-1.5 text-left text-xs transition",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <span className="mr-1 flex-shrink-0 text-[11px] opacity-60">
                        {idx + 1}.
                      </span>
                      <span className="line-clamp-2">{title}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </aside>
      )}

      {/* 右侧：顶部栏 + 阅读器 */}
      <div className="flex h-full flex-1 flex-col">
        {/* 顶部工具栏（相对定位，用来挂设置面板） */}
        <header className="relative flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="返回书架"
              onClick={handleBackToLibrary}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-xs text-muted-foreground hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex flex-col">
              <div className="max-w-xs truncate text-sm font-semibold text-foreground sm:max-w-md">
                {book.title}
              </div>
              {currentChapterLabel && (
                <div className="max-w-xs truncate text-[11px] text-primary sm:max-w-md">
                  {currentChapterLabel}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 上一章 / 下一章 */}
            {fileType === "txt" && chapters.length > 0 && (
              <div className="hidden items-center gap-1 sm:flex">
                <button
                  type="button"
                  onClick={goPrevChapter}
                  disabled={!canPrevChapter}
                  className={cn(
                    "inline-flex items-center rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground transition",
                    canPrevChapter
                      ? "hover:bg-accent"
                      : "cursor-not-allowed opacity-50"
                  )}
                >
                  <ChevronLeft className="mr-0.5 h-3 w-3" />
                  上一章
                </button>
                <button
                  type="button"
                  onClick={goNextChapter}
                  disabled={!canNextChapter}
                  className={cn(
                    "inline-flex items-center rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground transition",
                    canNextChapter
                      ? "hover:bg-accent"
                      : "cursor-not-allowed opacity-50"
                  )}
                >
                  下一章
                  <ChevronRight className="ml-0.5 h-3 w-3" />
                </button>
              </div>
            )}

            {/* 进度条 + 百分比（可在设置里关闭） */}
            {showProgressBar && (
              <div className="hidden items-center gap-2 sm:flex">
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground">
                  已读 {progressPercent}%
                </span>
              </div>
            )}

            {/* 目录按钮 */}
            {fileType === "txt" && chapters.length > 0 && (
              <button
                type="button"
                onClick={() => setShowToc((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground hover:bg-accent"
              >
                <ListIcon className="h-3 w-3" />
                {showToc ? "隐藏目录" : "目录"}
              </button>
            )}

            {/* 阅读设置按钮 */}
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground hover:bg-accent"
            >
              <Settings2 className="h-3 w-3" />
              设置
            </button>

            {/* 设置面板 */}
            {showSettings && (
              <div className="absolute right-4 top-full z-20 mt-2 w-80 rounded-2xl border border-border bg-card/95 p-3 text-xs shadow-lg backdrop-blur">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[11px] font-semibold text-muted-foreground">
                    阅读设置
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="rounded px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent"
                  >
                    关闭
                  </button>
                </div>

                {/* 主题 */}
                <div className="mb-3">
                  <div className="mb-1 text-[11px] text-muted-foreground">
                    主题模式
                  </div>
                  <div className="flex gap-2">
                    {[
                      { key: "light", label: "亮色" },
                      { key: "dark", label: "暗色" },
                      { key: "system", label: "跟随系统" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          setTheme(item.key as "light" | "dark" | "system")
                        }
                        className={cn(
                          "flex-1 rounded-full border px-2 py-1 text-[11px] transition",
                          theme === item.key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-accent"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 字体大小 */}
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>字体大小</span>
                    <span>{fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={14}
                    max={28}
                    value={fontSize}
                    onChange={(e) =>
                      updateReader({ fontSize: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>

                {/* 行距 */}
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>行距</span>
                    <span>{lineHeight.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={1.2}
                    max={2.4}
                    step={0.1}
                    value={lineHeight}
                    onChange={(e) =>
                      updateReader({ lineHeight: Number(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>

                {/* 字体 */}
                <div className="mb-3">
                  <div className="mb-1 text-[11px] text-muted-foreground">
                    字体
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "system", label: "系统默认" },
                      { key: "yahei", label: "雅黑" },
                      { key: "songti", label: "宋体" },
                      { key: "serif", label: "衬线" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          updateReader({
                            fontFamily: item.key as
                              | "system"
                              | "yahei"
                              | "songti"
                              | "serif",
                          })
                        }
                        className={cn(
                          "rounded-xl border px-2 py-1 text-[11px] transition",
                          fontFamily === item.key
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-accent"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 文本对齐 + 自动翻章 + 进度条开关 */}
                <div className="space-y-2">
                  <div className="text-[11px] text-muted-foreground">
                    阅读行为
                  </div>

                  {/* 文本对齐 */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateReader({ textAlign: "left" })}
                      className={cn(
                        "flex-1 rounded-xl border px-2 py-1 text-[11px] transition",
                        textAlign === "left"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent"
                      )}
                    >
                      左对齐
                    </button>
                    <button
                      type="button"
                      onClick={() => updateReader({ textAlign: "justify" })}
                      className={cn(
                        "flex-1 rounded-xl border px-2 py-1 text-[11px] transition",
                        textAlign === "justify"
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent"
                      )}
                    >
                      两端对齐
                    </button>
                  </div>

                  {/* 自动翻章 */}
                  <button
                    type="button"
                    onClick={() =>
                      updateReader({ autoNextChapter: !autoNextChapter })
                    }
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-3 py-1.5 text-[11px] transition",
                      autoNextChapter
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <span>滚动到底自动翻到下一章</span>
                    <span
                      className={cn(
                        "inline-flex h-4 w-7 items-center rounded-full border text-[10px]",
                        autoNextChapter
                          ? "border-primary bg-primary/80 text-primary-foreground"
                          : "border-muted bg-muted text-muted-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "h-3 w-3 rounded-full bg-background shadow transition",
                          autoNextChapter ? "ml-3" : "ml-1"
                        )}
                      />
                    </span>
                  </button>

                  {/* 进度条开关 */}
                  <button
                    type="button"
                    onClick={() =>
                      updateReader({ showProgressBar: !showProgressBar })
                    }
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-3 py-1.5 text-[11px] transition",
                      showProgressBar
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    <span>显示顶部阅读进度条</span>
                    <span
                      className={cn(
                        "inline-flex h-4 w-7 items-center rounded-full border text-[10px]",
                        showProgressBar
                          ? "border-primary bg-primary/80 text-primary-foreground"
                          : "border-muted bg-muted text-muted-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "h-3 w-3 rounded-full bg-background shadow transition",
                          showProgressBar ? "ml-3" : "ml-1"
                        )}
                      />
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* 阅读器主体 */}
        <div className="flex-1 overflow-hidden bg-background">
          {fileType === "epub" ? (
            <EpubReader book={book} onProgressChange={handleProgressChange} />
          ) : fileType === "pdf" ? (
            <PdfReader book={book} onProgressChange={handleProgressChange} />
          ) : (
            <TxtReader
              book={book}
              currentChapterIndex={currentChapterIndex}
              onRequestChangeChapter={handleRequestChangeChapter}
              onProgressChange={handleProgressChange}
              onChaptersChange={handleChaptersChange}
              initialChapterIndex={initialChapterIndexRef.current}
              initialOffset={initialOffsetRef.current}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ReaderPage;
