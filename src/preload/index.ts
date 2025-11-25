// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // 爬虫相关
  searchNovel: (keyword: string) => ipcRenderer.invoke('search-novel', keyword),
  downloadNovel: (item: any) => ipcRenderer.invoke('download-novel', item),

  // 本地导入
  importBook: () => ipcRenderer.invoke('import-book'),

  // 读取文本文件（TXT）
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),

  // 读取二进制（base64），用于 EPUB / PDF
  readFileBinary: (filePath: string) =>
    ipcRenderer.invoke('read-file-binary', filePath)
});
