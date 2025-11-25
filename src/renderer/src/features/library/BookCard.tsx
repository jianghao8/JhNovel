// src/renderer/src/features/library/BookCard.tsx

import React from 'react';
import type { Book, BookProgress } from '@/types';

interface BookCardProps {
  book: Book;
  progress?: BookProgress | null;
  recentOpenedAt?: number;
  onOpen?: (book: Book) => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  progress,
  recentOpenedAt,
  onOpen
}) => {
  const handleOpen = () => {
    onOpen?.(book);
  };

  const lastChapterText =
    progress && progress.lastChapterIndex >= 0
      ? `看到第 ${progress.lastChapterIndex + 1} 章`
      : '未开始阅读';

  const recentText = recentOpenedAt
    ? new Date(recentOpenedAt).toLocaleString()
    : null;

  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-card/60 p-4 shadow-sm transition hover:-translate-y-[2px] hover:shadow-md">
      <div className="flex gap-3">
        {/* 简单的封面占位 */}
        <div className="flex h-20 w-14 flex-shrink-0 items-center justify-center rounded bg-gradient-to-br from-slate-200 to-slate-100 text-xs font-semibold text-slate-600 dark:from-slate-800 dark:to-slate-900 dark:text-slate-200">
          {book.title.slice(0, 2)}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-base font-semibold text-foreground">
              {book.title}
            </h3>
            <span className="flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-200">
              {book.source === 'local' ? '本地导入' : '在线下载'}
            </span>
          </div>

          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            作者：{book.author || '未知'}
          </p>

          <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-300">
            {book.description || '暂无简介'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{lastChapterText}</span>
        {recentText && <span>最近阅读：{recentText}</span>}
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={handleOpen}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-[0.98]"
        >
          继续阅读
        </button>
      </div>
    </div>
  );
};
