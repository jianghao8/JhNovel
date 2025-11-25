// src/renderer/src/features/reader/EpubReader.tsx

import React, { useEffect, useRef, useState } from 'react';
import type { Book } from '@/types';
import { useSettingStore } from '@/stores/setting-store';

// 用 any 即可，避免复杂类型
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ePub = require('epubjs');

interface EpubReaderProps {
  book: Book;
  onBack: () => void;
}

interface TocItem {
  id: string;
  href: string;
  label: string;
}

export const EpubReader: React.FC<EpubReaderProps> = ({ book, onBack }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);

  const [toc, setToc] = useState<TocItem[]>([]);
  const [currentHref, setCurrentHref] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { theme } = useSettingStore((s) => s.reader);

  useEffect(() => {
    if (!book.filePath) {
      setError('该 EPUB 没有关联的本地文件。');
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
        const buf = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          buf[i] = binary.charCodeAt(i);
        }

        const b = ePub(buf.buffer);
        bookRef.current = b;

        if (!containerRef.current) {
          setError('渲染容器未就绪。');
          setLoading(false);
          return;
        }

        const rendition = b.renderTo(containerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'none',
          flow: 'paginated'
        });
        renditionRef.current = rendition;

        const isDark =
          theme === 'dark' ||
          (theme === 'system' &&
            window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches);

        rendition.themes.default({
          body: {
            'background-color': isDark ? '#020617' : '#ffffff',
            color: isDark ? '#e5e7eb' : '#111827',
            'font-family':
              "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif"
          }
        });

        await rendition.display();

        const nav = await b.loaded.navigation;
        const rawToc = (nav && nav.toc) || [];
        const normalized: TocItem[] = rawToc.map((item: any, idx: number) => ({
          id: item.id || String(idx),
          href: item.href,
          label: item.label || `章节 ${idx + 1}`
        }));
        setToc(normalized);

        if (normalized[0]) {
          setCurrentHref(normalized[0].href);
          await rendition.display(normalized[0].href);
        }

        if (!cancelled) {
          setLoading(false);
        }
      } catch (e: any) {
        console.error('[EpubReader] Error:', e?.message || e);
        if (!cancelled) {
          setError(e?.message || 'EPUB 打开失败');
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      try {
        renditionRef.current?.destroy?.();
        bookRef.current?.destroy?.();
      } catch {
        // ignore
      }
    };
  }, [book.filePath, theme]);

  const handleJump = async (href: string) => {
    if (!renditionRef.current) return;
    try {
      setCurrentHref(href);
      await renditionRef.current.display(href);
    } catch (e) {
      console.error('[EpubReader] Jump error:', e);
    }
  };

  return (
    <div className="flex h-full">
      {/* 左侧目录 */}
      <aside className="flex w-64 flex-col border-r border-border bg-card/40">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground">
              {book.title}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {book.author || '未知作者'}（EPUB）
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
          {toc.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">
              正在加载目录或该 EPUB 无目录。
            </div>
          ) : (
            <ul className="space-y-0.5 p-2 text-xs">
              {toc.map((ch, idx) => {
                const active = currentHref === ch.href;
                return (
                  <li key={ch.id || idx}>
                    <button
                      type="button"
                      onClick={() => handleJump(ch.href)}
                      className={`w-full rounded-md px-2 py-1 text-left transition ${
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
          )}
        </div>
      </aside>

      {/* 右侧 EPUB 渲染区域 */}
      <main className="flex flex-1 flex-col overflow-hidden bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              {book.title}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {book.author || '未知作者'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              正在加载 EPUB…
            </div>
          )}
          {error && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm">
              <span className="text-destructive">EPUB 打开失败</span>
              <span className="text-muted-foreground">{error}</span>
            </div>
          )}
          {!loading && !error && (
            <div
              ref={containerRef}
              className="h-full w-full overflow-hidden bg-background"
            />
          )}
        </div>
      </main>
    </div>
  );
};
