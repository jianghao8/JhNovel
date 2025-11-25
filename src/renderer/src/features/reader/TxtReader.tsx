// src/renderer/src/features/reader/TxtReader.tsx

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { Book } from "@/types";
import { useSettingStore } from "@/stores/setting-store";
import * as txtParserModule from "./engine/txt-parser";

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

interface ParsedTxtResult {
  chapters: ParsedChapter[];
  totalLength?: number;
}

interface TxtReaderProps {
  book: Book;

  /** 当前正在阅读的章节索引（由 ReaderPage 控制） */
  currentChapterIndex: number;

  /** 当需要跳到其他章节时（自动翻页）发出的请求 */
  onRequestChangeChapter: (targetIndex: number) => void;

  /** 上报阅读进度（章节索引 + 滚动位置 + 总进度） */
  onProgressChange: (payload: ReaderProgress) => void;

  /** 首次解析完章节时上报章节列表 */
  onChaptersChange?: (chapters: ParsedChapter[]) => void;

  /** 初始章节索引（用于恢复位置） */
  initialChapterIndex?: number;

  /** 初始滚动偏移（用于恢复位置，只在初次进入那一章时使用一次） */
  initialOffset?: number;
}

// 兼容 txt-parser 的多种导出方式
function callParseTxtContent(raw: string): ParsedTxtResult {
  const anyModule = txtParserModule as any;

  if (typeof anyModule.parseTxtContent === "function") {
    return anyModule.parseTxtContent(raw);
  }

  if (typeof anyModule.default === "function") {
    return anyModule.default(raw);
  }

  console.error("[TxtReader] txt-parser.ts module =", txtParserModule);
  throw new Error(
    "未在 ./engine/txt-parser.ts 中找到 parseTxtContent 函数，请确认导出方式。"
  );
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

export const TxtReader: React.FC<TxtReaderProps> = ({
  book,
  currentChapterIndex,
  onRequestChangeChapter,
  onProgressChange,
  onChaptersChange,
  initialChapterIndex = 0,
  initialOffset = 0,
}) => {
  const [chapters, setChapters] = useState<ParsedChapter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const totalLengthRef = useRef<number>(0);

  // 当前这章是否已经触发过“自动翻下一章”
  const autoTurnChapterRef = useRef<number | null>(null);

  // 是否已经按 lastOffset 恢复过初始滚动位置
  const didRestoreInitialOffsetRef = useRef<boolean>(false);

  const fontSize = useSettingStore((s) => s.reader.fontSize);
  const lineHeight = useSettingStore((s) => s.reader.lineHeight);
  const fontFamily = useSettingStore((s) => s.reader.fontFamily);
  const autoNextChapter = useSettingStore((s) => s.reader.autoNextChapter);
  const textAlign = useSettingStore((s) => s.reader.textAlign);

  // 读取 TXT 并分章
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        if (!window.api || typeof window.api.readFile !== "function") {
          throw new Error(
            "window.api.readFile 未定义。请检查 preload/index.ts 是否暴露了 readFile。"
          );
        }

        console.log("[TxtReader] reading file:", book.filePath);
        const content = await window.api.readFile(book.filePath);
        if (typeof content !== "string") {
          throw new Error("readFile 返回内容不是字符串。");
        }

        const parsed = callParseTxtContent(content);
        const list: ParsedChapter[] = parsed.chapters || [];
        const totalLength = parsed.totalLength || content.length;

        if (!Array.isArray(list) || list.length === 0) {
          console.warn(
            "[TxtReader] parseTxtContent 返回的章节为空，将整本书作为一个章节处理。"
          );
          const fallback: ParsedChapter = {
            title: book.title || "正文",
            content,
          };
          setChapters([fallback]);
          totalLengthRef.current = content.length;
          onChaptersChange?.([fallback]);
        } else {
          totalLengthRef.current = totalLength;
          setChapters(list);
          onChaptersChange?.(list);
        }

        // 新书加载时重置状态
        autoTurnChapterRef.current = null;
        didRestoreInitialOffsetRef.current = false;
      } catch (err: any) {
        console.error("[TxtReader] load error:", err);
        setLoadError(err?.message || "加载 TXT 文件失败。");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.filePath]);

  // 当当前章节索引变化时：
  // - 若是首次进入 lastChapter，对应章节恢复 lastOffset；
  // - 否则滚动到顶部。
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    // 每次进入新章节，都允许再次自动翻页一次
    autoTurnChapterRef.current = null;

    if (
      !didRestoreInitialOffsetRef.current &&
      currentChapterIndex === initialChapterIndex &&
      initialOffset > 0
    ) {
      // 初次进入上次阅读的章节，恢复滚动位置
      el.scrollTop = initialOffset;
      didRestoreInitialOffsetRef.current = true;
    } else {
      // 其他情况统一从顶部开始
      el.scrollTop = 0;
    }
  }, [currentChapterIndex, initialChapterIndex, initialOffset]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const { scrollTop, scrollHeight, clientHeight } = el;

      const totalChapters = chapters.length || 1;

      // 普通进度上报
      const base =
        totalChapters > 0 ? currentChapterIndex / totalChapters : 0;
      const part =
        scrollHeight > 0 ? scrollTop / Math.max(scrollHeight, clientHeight) : 0;
      const progress = Math.max(0, Math.min(1, base + part / totalChapters));

      onProgressChange({
        chapterIndex: currentChapterIndex,
        offset: scrollTop,
        totalChapters,
        progress,
      });

      // 自动翻到下一章（只针对章节高度大于视口的情况）
      if (!autoNextChapter) return;
      if (scrollHeight <= clientHeight + 4) return;

      const hasNextChapter = currentChapterIndex < totalChapters - 1;
      if (!hasNextChapter) return;

      const remaining = scrollHeight - (scrollTop + clientHeight);
      const TRIGGER_THRESHOLD = 10; // 离底部小于 10px 触发

      // 每个章节只允许触发一次自动翻页
      if (
        remaining <= TRIGGER_THRESHOLD &&
        autoTurnChapterRef.current !== currentChapterIndex
      ) {
        autoTurnChapterRef.current = currentChapterIndex;
        const target = currentChapterIndex + 1;
        if (target >= 0 && target < totalChapters) {
          onRequestChangeChapter(target);
        }
      }
    },
    [
      chapters.length,
      currentChapterIndex,
      autoNextChapter,
      onProgressChange,
      onRequestChangeChapter,
    ]
  );

  const currentChapter =
    chapters[currentChapterIndex] ||
    (chapters.length > 0 ? chapters[0] : null);

  const resolvedFontFamily = useMemo(() => {
    switch (fontFamily) {
      case "serif":
        return `"Times New Roman", Georgia, "Songti SC", "宋体", serif`;
      case "yahei":
        return `"Microsoft YaHei", "微软雅黑", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      case "songti":
        return `"Songti SC", "宋体", Georgia, serif`;
      case "system":
      default:
        return `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`;
    }
  }, [fontFamily]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        正在加载章节内容…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <div>{loadError}</div>
        <div className="text-xs text-muted-foreground/80">
          请检查文件路径是否仍然存在：{book.filePath}
        </div>
      </div>
    );
  }

  if (!currentChapter) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        未能解析出任何章节内容。
      </div>
    );
  }

  const displayTitle = normalizeChapterTitle(
    currentChapter.title || `第 ${currentChapterIndex + 1} 章`
  );

  // 避免正文重复显示标题
  const contentTrimmed = currentChapter.content.trimStart();
  const shouldShowTitle =
    !!displayTitle && !contentTrimmed.startsWith(displayTitle);

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollContainerRef}
        className="relative flex-1 overflow-auto px-5 py-4 sm:px-8 sm:py-6"
        onScroll={handleScroll}
      >
        <article
          className="mx-auto max-w-3xl"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: `${lineHeight}`,
            fontFamily: resolvedFontFamily,
            textAlign: textAlign === "justify" ? "justify" : "left",
          }}
        >
          {shouldShowTitle && (
            <h1 className="mb-4 text-lg font-semibold leading-snug sm:text-xl">
              {displayTitle}
            </h1>
          )}
          <div className="whitespace-pre-wrap break-words text-foreground">
            {contentTrimmed}
          </div>
        </article>
      </div>
    </div>
  );
};

export default TxtReader;
