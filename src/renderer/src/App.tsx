import React, { useEffect } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// 🔴 注意：这里改成命名导入
import { AppLayout } from "@/components/layout/AppLayout";

import LibraryPage from "@/features/library/LibraryPage";
import CrawlerPage from "@/features/crawler/CrawlerPage";
import ReaderPage from "@/features/reader/ReaderPage";
import SettingsPage from "@/features/settings/SettingsPage";

import { useSettingStore } from "@/stores/setting-store";

const App: React.FC = () => {
  const theme = useSettingStore((s) => s.theme);

  // 监听 theme，把 dark 类挂在 <html> 上，让 Tailwind 的 dark: 样式生效
  useEffect(() => {
    const root = document.documentElement;

    const systemDark = window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false;

    const effectiveTheme =
      theme === "system" ? (systemDark ? "dark" : "light") : theme;

    if (effectiveTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/library" replace />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/crawler" element={<CrawlerPage />} />
          <Route path="/reader" element={<ReaderPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
