import React, { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/db";
import type { Book } from "@/types";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

interface ImportResult {
  success: boolean;
  message?: string;
  path?: string;
  ext?: string;
  book?: {
    title: string;
    author?: string;
    filePath: string;
    fileType?: "txt" | "epub" | "pdf";
  };
}

export const LibraryPage: React.FC = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const navigate = useNavigate();

  const loadBooks = async () => {
    try {
      setLoading(true);
      const list = await db.books.toArray();
      list.sort((a: any, b: any) => {
        const ta = new Date(
          a.lastReadAt || a.updatedAt || a.createdAt || 0
        ).getTime();
        const tb = new Date(
          b.lastReadAt || b.updatedAt || b.createdAt || 0
        ).getTime();
        return tb - ta;
      });
      setBooks(list);
    } catch (e) {
      console.error("[Library] loadBooks failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const handleImportBook = async () => {
    try {
      const res = (await window.api.importBook()) as ImportResult;

      if (!res || !res.success) {
        if (res?.message) {
          alert("导入失败：" + res.message);
        }
        return;
      }

      const path = res.book?.filePath || res.path || "";

      if (!path) {
        alert("导入失败：未获取到文件路径");
        return;
      }

      const rawExt = (res.ext || "").toUpperCase();

      let fileType: "txt" | "epub" | "pdf" = "txt";
      if (rawExt === "EPUB") fileType = "epub";
      else if (rawExt === "PDF") fileType = "pdf";

      const titleFromPath = path
        .split(/[/\\]/)
        .pop()
        ?.replace(/\.[^.]+$/, "");

      const title = res.book?.title || titleFromPath || "未命名书籍";

      const author = res.book?.author || "未知";

      const now = new Date().toISOString();

      const bookToSave: any = {
        title,
        author,
        filePath: path,
        fileType,
        createdAt: now,
        updatedAt: now,
        lastReadAt: null,
        lastChapter: 0,
        lastOffset: 0,
        progress: 0,
        fromCrawler: false,
      };

      const id = await db.books.add(bookToSave);
      console.log("[Library] Imported book id =", id);

      alert("导入成功：" + title);

      await loadBooks();
    } catch (e: any) {
      console.error("[Library] Import failed:", e?.message || e);
      alert("导入失败：" + (e?.message || "未知错误"));
    }
  };

  const handleOpenBook = (book: any) => {
    navigate("/reader", { state: { bookId: book.id } });
  };

  const handleDeleteBook = async (book: any) => {
    if (!book || !book.id) return;

    const ok = window.confirm(
      `确定要从书架中删除《${book.title}》吗？\n（只会删除书架记录，不会删除磁盘上的原始文件）`
    );
    if (!ok) return;

    try {
      await db.books.delete(book.id);
      setBooks((prev) => prev.filter((b) => b.id !== book.id));
    } catch (e) {
      console.error("[Library] delete failed:", e);
      alert("删除失败，请稍后重试。");
    }
  };

  const filteredBooks = useMemo(() => {
    if (!keyword.trim()) return books;
    const kw = keyword.trim().toLowerCase();
    return books.filter((b) => {
      const title = (b.title || "").toLowerCase();
      const author = (b.author || "").toLowerCase();
      return title.includes(kw) || author.includes(kw);
    });
  }, [books, keyword]);

  // 最近阅读（简单取前三个有 lastReadAt 的）
  const recentBooks = useMemo(
    () =>
      books
        .filter((b) => b.lastReadAt)
        .slice(0, 3),
    [books]
  );

  return (
    <div className="flex h-full flex-col">
      {/* 顶部工具栏 */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold text-foreground">我的书架</h1>
          <p className="text-xs text-muted-foreground">
            管理本地导入与在线下载的所有书籍
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-input bg-background px-3 py-1.5 text-xs">
            <input
              className="w-48 border-none bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="搜索标题 / 作者…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={handleImportBook}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-[0.97]"
          >
            导入图书
          </button>
        </div>
      </header>

      {/* 内容区域 */}
      <main className="flex-1 space-y-6 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            正在加载书架…
          </div>
        ) : (
          <>
            {/* 最近阅读 */}
            {recentBooks.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold text-foreground">
                  继续阅读
                </h2>
                <div className="flex flex-wrap gap-3">
                  {recentBooks.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => handleOpenBook(book)}
                      className="group flex min-w-[200px] max-w-xs flex-1 flex-col rounded-xl border border-border bg-card/60 px-3 py-2 text-left text-xs shadow-sm transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md"
                    >
                      <div className="mb-1 line-clamp-1 text-sm font-semibold text-foreground group-hover:text-primary">
                        {book.title}
                      </div>
                      <div className="mb-1 text-[11px] text-muted-foreground">
                        {book.author || "未知作者"}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {(book.fileType || "txt").toUpperCase()} 文件
                        </span>
                        <span>
                          {book.progress
                            ? `已读 ${(book.progress * 100).toFixed(0)}%`
                            : "刚开始阅读"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* 全部书籍 */}
            <section className="pt-2">
              {filteredBooks.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <div>书架还是空的～</div>
                  <div className="text-xs">
                    你可以点击右上角的
                    <span className="mx-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                      导入图书
                    </span>
                    按钮，选择 TXT / EPUB / PDF 文件导入。
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredBooks.map((book) => (
                    <div
                      key={book.id || book.filePath}
                      className="group relative flex cursor-pointer flex-col rounded-xl border border-border bg-card/60 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md"
                      onClick={() => handleOpenBook(book)}
                    >
                      {/* 删除按钮 */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBook(book);
                        }}
                        className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-[11px] text-muted-foreground opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-destructive"
                        title="从书架删除"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>

                      <div className="mb-2 line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary">
                        {book.title}
                      </div>
                      <div className="mb-1 text-[11px] text-muted-foreground">
                        {book.author || "未知作者"}
                      </div>
                      <div className="mt-auto flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          {(book.fileType || "txt").toUpperCase()} 文件
                        </span>
                        <span>
                          {book.progress
                            ? `已读 ${(book.progress * 100).toFixed(0)}%`
                            : book.fromCrawler
                            ? "在线书城"
                            : "本地导入"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default LibraryPage;
