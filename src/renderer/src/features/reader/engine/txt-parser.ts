// src/renderer/src/features/reader/engine/txt-parser.ts

export interface ParsedChapter {
  title: string;
  content: string;
}

export interface ParsedBook {
  chapters: ParsedChapter[];
}

/**
 * 简单 TXT 分章：
 * 1. 先按常见“第xx章/卷/节”分章
 * 2. 如果整本书几乎没有这些标记，则按固定长度做兜底分章
 */
export function parseTxtContent(raw: string): ParsedBook {
  if (!raw) {
    return { chapters: [] };
  }

  let text = raw.replace(/\r\n/g, "\n");
  text = text.replace(/\uFEFF/g, ""); // BOM
  text = text.replace(/\n{3,}/g, "\n\n");

  const chapterRegex =
    /(第[零一二三四五六七八九十百千万0-9]+[章节卷回集篇])([^\n]*)/g;

  const matches: { index: number; title: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = chapterRegex.exec(text)) !== null) {
    matches.push({
      index: m.index,
      title: (m[0] + (m[2] || "")).trim(),
    });
  }

  // 如果匹配到的“章标题”很少，认为没有明显分章 → 长度兜底
  if (matches.length < 3) {
    const chunkSize = 4000; // 字符数
    const chapters: ParsedChapter[] = [];
    let pos = 0;
    let idx = 1;
    while (pos < text.length) {
      const chunk = text.slice(pos, pos + chunkSize);
      chapters.push({
        title: `第 ${idx} 章`,
        content: chunk.trim(),
      });
      pos += chunkSize;
      idx++;
    }
    return { chapters };
  }

  // 正常按标题切分
  const chapters: ParsedChapter[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const body = text.slice(start, end).trim();

    chapters.push({
      title: matches[i].title,
      content: body,
    });
  }

  return { chapters };
}

/**
 * 兼容旧代码：直接返回章节内容
 */
export function extractChapterText(chapter: ParsedChapter): string {
  return chapter.content;
}
