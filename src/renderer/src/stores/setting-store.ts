import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";
export type ReaderFontFamily = "system" | "yahei" | "songti" | "serif";
export type ReaderTextAlign = "left" | "justify";

export interface ReaderSettings {
  fontSize: number; // px
  lineHeight: number; // 1.2 ~ 2.4
  fontFamily: ReaderFontFamily;
  autoNextChapter: boolean; // 滚动到底自动翻到下一章
  textAlign: ReaderTextAlign; // 文本对齐方式：左对齐 / 两端对齐
  showProgressBar: boolean; // 顶部阅读进度条
}

export interface SettingState {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;

  reader: ReaderSettings;
  updateReader: (patch: Partial<ReaderSettings>) => void;
}

export const useSettingStore = create<SettingState>()(
  persist(
    (set) => ({
      theme: "system",

      reader: {
        fontSize: 18,
        lineHeight: 1.8,
        fontFamily: "system",
        autoNextChapter: true,
        textAlign: "left",
        showProgressBar: true,
      },

      setTheme: (mode) =>
        set(() => ({
          theme: mode,
        })),

      updateReader: (patch) =>
        set((state) => ({
          reader: {
            ...state.reader,
            ...patch,
          },
        })),
    }),
    {
      name: "jhnovel-settings", // localStorage key
    }
  )
);

export default useSettingStore;
