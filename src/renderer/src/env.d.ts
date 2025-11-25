// src/renderer/src/env.d.ts

export {};

declare global {
  interface Window {
    api: {
      searchNovel: (keyword: string) => Promise<any>;
      downloadNovel: (item: any) => Promise<{
        success: boolean;
        path?: string;
        message?: string;
      }>;
      importBook: () => Promise<any>;
      readFile: (filePath: string) => Promise<string>;
      readFileBinary: (filePath: string) => Promise<string>;
    };
  }
}

// 简单的模块声明，避免 TS 报错
declare module 'epubjs';
declare module 'pdfjs-dist';
