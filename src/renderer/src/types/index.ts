// src/renderer/src/types/index.ts

// 支持的本地文件类型
export type BookFileType = 'txt' | 'epub' | 'pdf';

// 书籍信息
export interface Book {
  id?: number;
  title: string;
  author?: string;
  source: 'local' | 'crawler'; // 本地导入 / 爬虫下载
  filePath?: string; // 本地文件路径
  crawlerSourceName?: string; // 爬虫源名称
  description?: string;
  createdAt?: number;
  updatedAt?: number;

  /** 本地文件格式：txt / epub / pdf */
  fileType?: BookFileType;
}

// TXT 分章用的章节元数据
export interface ChapterMeta {
  index: number;
  title: string;
  start: number; // 在整本文本中的起始字符索引
  length: number;
}

// 解析后的整本书信息（目前只用 chapters）
export interface ParsedBook {
  chapters: ChapterMeta[];
}

// 阅读进度
export interface BookProgress {
  bookId: number;
  lastChapterIndex: number;
  lastOffsetInChapter: number;
  updatedAt: number;
}

// 爬虫搜索结果（CrawlerPage 用）
export interface SearchResult {
  id: string; // 一般是书籍链接
  title: string;
  author: string;
  description?: string;
  source: string; // 源站名称
}
