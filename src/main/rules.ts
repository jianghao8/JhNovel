// src/main/rules.ts

export interface SiteRule {
  name: string;
  url: string;

  // 搜索相关
  searchUrl: string;
  method: 'get' | 'post';
  searchEncoding: 'utf-8' | 'gbk';
  searchList: string;
  searchTitle: string;
  searchAuthor: string;
  searchId: string;

  // 目录相关
  tocList: string;
  tocLink: string;

  // 正文相关
  contentTitle: string;
  contentText: string;
  contentRemove?: string;

  // 搜索表单配置：值为 '{keyword}' 时会被替换为搜索关键词
  searchForm?: Record<string, string>;

  // 限流/并发配置（可选）
  concurrency?: number;
  minInterval?: number; // ms
  maxInterval?: number; // ms
}

export const SOURCES: SiteRule[] = [
  // ========= 快眼看书 =========
  {
    name: '快眼看书',
    url: 'https://www.bookbao.net',
    searchUrl: 'https://www.bookbao.net/search/%s/',
    method: 'get',
    searchEncoding: 'utf-8',
    searchList: 'ul.library li',
    searchTitle: 'a.bookname',
    searchAuthor: 'a.author',
    searchId: 'a.bookname',
    tocList: '.chapterlist dd',
    tocLink: 'a',
    contentTitle: '.title h1',
    contentText: '#content',
    contentRemove: '本章未完.*|点击下一页.*',
    concurrency: 5,
    minInterval: 800,
    maxInterval: 1500
  },

  // ========= 新天禧小说（通过 sososhu 搜索） =========
  {
    name: '新天禧小说',
    url: 'https://www.tianxibook.com',
    searchUrl: 'https://www.sososhu.com/?q=%s&site=xtxxs',
    method: 'get',
    searchEncoding: 'utf-8',
    searchList: 'body > div.wrap > div > div > div',
    searchTitle: 'dl > dt > a',
    searchAuthor: 'dl > dt > span',
    searchId: 'dl > dt > a',
    tocList: '#content_1 > a',
    tocLink: 'a',
    contentTitle: '#wrapper > article > h1',
    contentText: '#booktxt',
    contentRemove: '首发网址.+。|本章完',
    concurrency: 5,
    minInterval: 1000,
    maxInterval: 2000
  },

  // ========= 书海阁小说网 =========
  {
    name: '书海阁小说网',
    url: 'https://www.shuhaige.net',
    searchUrl: 'https://www.shuhaige.net/search.html',
    method: 'post',
    searchEncoding: 'utf-8',
    searchList: '#sitembox > dl',
    searchTitle: 'dd > h3 > a',
    searchAuthor: 'dd:nth-child(3) > span:nth-child(1)',
    searchId: 'dd > h3 > a',
    searchForm: {
      searchkey: '{keyword}',
      searchtype: 'all'
    },
    tocList: 'dl > dt:nth-of-type(2) ~ dd > a',
    tocLink: 'a',
    contentTitle: '.bookname > h1',
    contentText: '#content',
    contentRemove:
      '本小章还未完，请点击下一页继续阅读后面精彩内容！|小主，这个章节后面还有哦，请点击下一页继续阅读，后面更精彩！|这章没有结束，请点击下一页继续阅读！|本章完',
    concurrency: 2,
    minInterval: 1000,
    maxInterval: 2000
  },

  // ========= 梦书中文 =========
  {
    name: '梦书中文',
    url: 'http://www.mcxs.info',
    searchUrl: 'http://www.mcxs.info/search.html',
    method: 'post',
    // 很多老站换成了 utf-8，这里先用 utf-8，真正编码交给自动检测
    searchEncoding: 'utf-8',
    searchList: '.novelslist2 > ul > li',
    searchTitle: 'span.s2.wid > a',
    searchAuthor: 'span.s4.wid > a',
    searchId: 'span.s2.wid > a',
    searchForm: {
      name: '{keyword}'
    },
    tocList: 'dl > dt:nth-of-type(2) ~ dd > a',
    tocLink: 'a',
    contentTitle: '.bookname > h1',
    contentText: '#content',
    contentRemove: '本章完',
    concurrency: 1,
    minInterval: 1000,
    maxInterval: 3000
  },

  // ========= 鸟书网 99xs =========
  {
    name: '鸟书网',
    url: 'http://www.99xs.info',
    searchUrl: 'http://www.99xs.info/read/search/',
    method: 'post',
    searchEncoding: 'utf-8',
    searchList: 'div.wrap > div > div > div',
    searchTitle: 'div.bookinfo > h4 > a',
    searchAuthor: 'div.bookinfo > div.author',
    searchId: 'div.bookinfo > h4 > a',
    searchForm: {
      searchkey: '{keyword}'
    },
    tocList: 'dl > dt:nth-of-type(2) ~ dd > a',
    tocLink: 'a',
    contentTitle: '.content > h1',
    contentText: '#content',
    contentRemove:
      '本章完|请记住本书首发域名：.+。鸟书网手机版阅读网址：.+',
    concurrency: 1,
    minInterval: 1000,
    maxInterval: 3000
  },

  // ========= 笔尖中文 xbiquzw =========
  {
    name: '笔尖中文',
    url: 'http://www.xbiquzw.net',
    searchUrl: 'http://www.xbiquzw.net/modules/article/search.php',
    method: 'post',
    searchEncoding: 'utf-8',
    searchList: '#wrapper > table > tbody > tr',
    searchTitle: 'td:nth-child(1) > a',
    searchAuthor: 'td:nth-child(3)',
    searchId: 'td:nth-child(1) > a',
    searchForm: {
      searchkey: '{keyword}'
    },
    tocList: '#list > dl > dd > a',
    tocLink: 'a',
    contentTitle: '.bookname > h1',
    contentText: '#content',
    contentRemove: '<!--.*?-->|喜欢.+请大家收藏：.+|本章完',
    concurrency: 2,
    minInterval: 1000,
    maxInterval: 2000
  },

  // ========= 悠久小说网 =========
  {
    name: '悠久小说网',
    url: 'http://www.ujxsw.org',
    searchUrl: 'http://www.ujxsw.org/searchbooks.php',
    method: 'post',
    searchEncoding: 'utf-8',
    searchList: '#main > div.shuku_list > div.shulist > ul',
    searchTitle: 'li.three > a',
    searchAuthor: 'li.four > a',
    searchId: 'li.three > a',
    searchForm: {
      searchkey: '{keyword}'
    },
    tocList: '#readerlist > ul > li > a',
    tocLink: 'a',
    contentTitle: '#mlfy_main_text > h3',
    contentText: '#mlfy_main_text > div.read-content > p',
    contentRemove:
      '【悠久小説網ωωω.ＵＪХＳw.ｎｅｔ】，免费小说无弹窗免费阅读！|佰度搜索 【悠久小說網 ＷＷＷ.ＵＪХＳw．ＮＥＴ】 全集TXT电子书免费下载！|《.+》悠久小说网全文字更新,牢记网址:www\\.ujxsw\\.org|1秒记住网：',
    concurrency: 3,
    minInterval: 800,
    maxInterval: 2000
  },

  // ========= 笔趣阁22 =========
  {
    name: '笔趣阁22',
    url: 'https://www.22biqu.com',
    searchUrl: 'https://www.22biqu.com/ss/',
    method: 'post',
    searchEncoding: 'utf-8',
    searchList: 'body > div.container > div > div > ul > li',
    searchTitle: 'span.s2 > a',
    searchAuthor: 'span.s4',
    searchId: 'span.s2 > a',
    searchForm: {
      searchkey: '{keyword}',
      Submit: '搜索'
    },
    tocList: 'div:nth-child(4) > ul > li > a',
    tocLink: 'a',
    contentTitle: '.title',
    contentText: '#content',
    contentRemove: '本章完',
    concurrency: 3,
    minInterval: 800,
    maxInterval: 2000
  }
];
