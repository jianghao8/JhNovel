// src/renderer/src/lib/db.ts

import Dexie, { Table } from 'dexie';
import type { Book, BookProgress, RecentBook } from '@/types';

/** Dexie 数据库实例 */
export class JhNovelDB extends Dexie {
  books!: Table<Book, number>;
  progress!: Table<BookProgress, number>;
  recents!: Table<RecentBook, number>;

  constructor() {
    // ⭐ 改名：避免与旧结构冲突
    super('JhNovelDB_v3');

    this.version(1).stores({
      // ++id: 自增主键
      books: '++id, title, author, source, createdAt, updatedAt',
      progress: '++id, bookId, updatedAt',
      recents: '++id, bookId, openedAt'
    });
  }
}

export const db = new JhNovelDB();
