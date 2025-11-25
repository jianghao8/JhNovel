import React from "react";
import { cn } from "@/lib/utils";
import { useSettingStore } from "@/stores/setting-store";

export const SettingsPage: React.FC = () => {
  const theme = useSettingStore((s) => s.theme);
  const setTheme = useSettingStore((s) => s.setTheme);
  const reader = useSettingStore((s) => s.reader);
  const updateReader = useSettingStore((s) => s.updateReader);

  const {
    fontSize,
    lineHeight,
    fontFamily,
    autoNextChapter,
    textAlign,
    showProgressBar,
  } = reader;

  const handleReset = () => {
    setTheme("system");
    updateReader({
      fontSize: 18,
      lineHeight: 1.8,
      fontFamily: "system",
      autoNextChapter: true,
      textAlign: "left",
      showProgressBar: true,
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* 顶部标题 */}
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">设置</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            配置主题、字体、行距等全局阅读参数
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground hover:bg-accent"
        >
          恢复默认
        </button>
      </header>

      {/* 内容 */}
      <main className="flex-1 overflow-auto px-6 py-4">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 lg:flex-row">
          {/* 左侧：设置项 */}
          <div className="flex-[3] space-y-4">
            {/* 主题模式 */}
            <section className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-foreground">
                主题模式
              </h2>
              <p className="mb-3 text-xs text-muted-foreground">
                选择应用整体的明暗风格。
              </p>
              <div className="flex gap-2">
                {[
                  { key: "light", label: "亮色" },
                  { key: "dark", label: "暗色" },
                  { key: "system", label: "跟随系统" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      setTheme(item.key as "light" | "dark" | "system")
                    }
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2 text-xs transition",
                      theme === item.key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            {/* 阅读外观 */}
            <section className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-foreground">
                阅读外观
              </h2>
              <p className="mb-3 text-xs text-muted-foreground">
                调整字体大小、行距和字体风格，让阅读更舒适。
              </p>

              {/* 字体大小 */}
              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>字体大小</span>
                  <span>{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={14}
                  max={28}
                  value={fontSize}
                  onChange={(e) =>
                    updateReader({ fontSize: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>

              {/* 行距 */}
              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>行距</span>
                  <span>{lineHeight.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={1.2}
                  max={2.4}
                  step={0.1}
                  value={lineHeight}
                  onChange={(e) =>
                    updateReader({ lineHeight: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>

              {/* 字体 */}
              <div className="mb-4">
                <div className="mb-1 text-[11px] text-muted-foreground">
                  字体
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "system", label: "系统默认" },
                    { key: "yahei", label: "雅黑" },
                    { key: "songti", label: "宋体" },
                    { key: "serif", label: "衬线" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        updateReader({
                          fontFamily: item.key as
                            | "system"
                            | "yahei"
                            | "songti"
                            | "serif",
                        })
                      }
                      className={cn(
                        "rounded-xl border px-3 py-2 text-xs transition",
                        fontFamily === item.key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 文本对齐 */}
              <div>
                <div className="mb-1 text-[11px] text-muted-foreground">
                  文本对齐
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateReader({ textAlign: "left" })}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2 text-xs transition",
                      textAlign === "left"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    左对齐
                  </button>
                  <button
                    type="button"
                    onClick={() => updateReader({ textAlign: "justify" })}
                    className={cn(
                      "flex-1 rounded-xl border px-3 py-2 text-xs transition",
                      textAlign === "justify"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    两端对齐
                  </button>
                </div>
              </div>
            </section>

            {/* 阅读行为 */}
            <section className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-foreground">
                阅读行为
              </h2>
              <p className="mb-3 text-xs text-muted-foreground">
                调整翻页方式和进度展示等行为偏好。
              </p>

              {/* 自动翻章 */}
              <button
                type="button"
                onClick={() =>
                  updateReader({ autoNextChapter: !autoNextChapter })
                }
                className={cn(
                  "mb-2 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs transition",
                  autoNextChapter
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                <span>滚动到底自动翻到下一章</span>
                <span
                  className={cn(
                    "inline-flex h-4 w-7 items-center rounded-full border text-[10px]",
                    autoNextChapter
                      ? "border-primary bg-primary/80 text-primary-foreground"
                      : "border-muted bg-muted text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full bg-background shadow transition",
                      autoNextChapter ? "ml-3" : "ml-1"
                    )}
                  />
                </span>
              </button>

              {/* 进度条显示 */}
              <button
                type="button"
                onClick={() =>
                  updateReader({ showProgressBar: !showProgressBar })
                }
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs transition",
                  showProgressBar
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                <span>显示顶部阅读进度条</span>
                <span
                  className={cn(
                    "inline-flex h-4 w-7 items-center rounded-full border text-[10px]",
                    showProgressBar
                      ? "border-primary bg-primary/80 text-primary-foreground"
                      : "border-muted bg-muted text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full bg-background shadow transition",
                      showProgressBar ? "ml-3" : "ml-1"
                    )}
                  />
                </span>
              </button>
            </section>
          </div>

          {/* 右侧：效果预览 */}
          <div className="mt-4 flex-[2] rounded-2xl border border-border bg-card/60 p-4 shadow-sm lg:mt-0">
            <h2 className="mb-2 text-sm font-semibold text-foreground">
              预览
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              当前设置下，正文大致会呈现如下效果。
            </p>
            <div className="rounded-xl border border-dashed border-border bg-background/80 px-4 py-3 text-xs leading-relaxed">
              <div className="mb-1 text-[11px] text-muted-foreground">
                《示例章节》 第 1 章·预览
              </div>
              <div
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: `${lineHeight}`,
                  fontFamily:
                    fontFamily === "serif"
                      ? `"Times New Roman", Georgia, "Songti SC", "宋体", serif`
                      : fontFamily === "yahei"
                      ? `"Microsoft YaHei", "微软雅黑", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
                      : fontFamily === "songti"
                      ? `"Songti SC", "宋体", Georgia, serif`
                      : `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`,
                  textAlign: textAlign === "justify" ? "justify" : "left",
                }}
                className="mt-2 whitespace-pre-wrap text-foreground"
              >
                {`夜色如墨，你坐在屏幕前翻开一本喜欢的小说。\n\n调整合适的字体和行距，可以让文字变得柔和而不刺眼；开启暗色模式，则更适合在深夜阅读。\n\n这些设置会自动保存，并在所有书籍中生效。`}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
