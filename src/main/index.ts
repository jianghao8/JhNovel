// src/main/index.ts

import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as fs from "fs";
import * as fsPromises from "fs/promises";

import { NovelCrawler } from "./crawler";

// ---- 关键：在 ESM 里自己构造 __dirname ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === "development";

let mainWindow: BrowserWindow | null = null;

/**
 * 创建主窗口
 */
function createMainWindow() {
  console.log("[Main] createMainWindow called");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "JhNovel",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    titleBarStyle: "hiddenInset",
  });

  mainWindow.on("ready-to-show", () => {
    console.log("[Main] ready-to-show");
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    console.log("[Main] window closed");
    mainWindow = null;
  });

  if (isDev && process.env["ELECTRON_RENDERER_URL"]) {
    console.log(
      "[Main] loadURL dev:",
      process.env["ELECTRON_RENDERER_URL"] as string
    );
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"] as string);
  } else {
    const indexHtml = path.join(__dirname, "../renderer/index.html");
    console.log("[Main] loadFile prod:", indexHtml);
    mainWindow.loadFile(indexHtml);
  }
}

/**
 * 获取用于存放书籍的目录（在 userData/books 下）
 */
function getBooksDir(): string {
  const userData = app.getPath("userData");
  const booksDir = path.join(userData, "books");
  if (!fs.existsSync(booksDir)) {
    fs.mkdirSync(booksDir, { recursive: true });
  }
  return booksDir;
}

/**
 * App 生命周期
 */
app.whenReady().then(() => {
  console.log("[Main] app.whenReady");

  createMainWindow();

  app.on("activate", () => {
    console.log("[Main] app activate");
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  console.log("[Main] window-all-closed");
  if (process.platform !== "darwin") {
    app.quit();
  }
});

/**
 * ============ IPC: 爬虫相关 ============
 */

// 搜索小说
ipcMain.handle("search-novel", async (_event, keyword: string) => {
  try {
    console.log("[Native Crawler] Searching:", keyword);
    const results = await NovelCrawler.search(keyword);
    return { success: true, results };
  } catch (e: any) {
    console.error("[Native Crawler] Search failed:", e?.message || e);
    return {
      success: false,
      message: e?.message || "搜索失败，请稍后重试",
    };
  }
});

// 下载小说
ipcMain.handle("download-novel", async (_event, item: any) => {
  try {
    const bookUrl: string = item.id;
    const sourceName: string = item.source;
    const saveDir = getBooksDir();

    console.log("[Native Crawler] Downloading:", item.title);
    console.log("[Download] Target:", bookUrl, " Source:", sourceName);

    const filePath = await NovelCrawler.download(bookUrl, saveDir, sourceName);

    return {
      success: true,
      path: filePath,
    };
  } catch (e: any) {
    console.error("[Native Crawler] Download failed:", e?.message || e);
    return {
      success: false,
      message: e?.message || "下载失败",
    };
  }
});

/**
 * ============ IPC: 本地图书导入 & 文件读取 ============
 */

// 导入本地图书（支持 txt / epub / pdf），同时返回 path / ext 兼容旧逻辑
ipcMain.handle("import-book", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Books", extensions: ["txt", "epub", "pdf"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, message: "已取消选择" };
  }

  try {
    const booksDir = getBooksDir();
    const srcPath = result.filePaths[0];

    const rawExt = path.extname(srcPath); // ".epub"
    const ext = rawExt.toLowerCase().replace(".", ""); // "epub"

    const fileName = path.basename(srcPath);
    const destPath = path.join(booksDir, fileName);

    await fsPromises.copyFile(srcPath, destPath);

    const title = fileName.replace(/\.[^.]+$/, "");

    let fileType: "txt" | "epub" | "pdf" = "txt";
    if (ext === "epub") fileType = "epub";
    else if (ext === "pdf") fileType = "pdf";

    console.log("[Import Book] Imported:", title, "->", destPath, " ext:", ext);

    return {
      success: true,
      path: destPath,
      ext,
      book: {
        title,
        author: "未知",
        filePath: destPath,
        fileType,
      },
    };
  } catch (e: any) {
    console.error("[Import Book] Failed:", e?.message || e);
    return {
      success: false,
      message: e?.message || "导入失败",
    };
  }
});

// 读取文本文件内容（UTF-8），用于 TXT
ipcMain.handle("read-file", async (_event, filePath: string) => {
  try {
    const buf = await fsPromises.readFile(filePath);
    return buf.toString("utf-8");
  } catch (e: any) {
    console.error("[Read File] Failed:", filePath, e?.message || e);
    throw new Error(e?.message || "读取文件失败");
  }
});

// 读取文件二进制（base64），用于 EPUB / PDF
ipcMain.handle("read-file-binary", async (_event, filePath: string) => {
  try {
    const buf = await fsPromises.readFile(filePath);
    return buf.toString("base64");
  } catch (e: any) {
    console.error("[Read File Binary] Failed:", filePath, e?.message || e);
    throw new Error(e?.message || "读取二进制文件失败");
  }
});
