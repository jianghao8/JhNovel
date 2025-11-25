// src/renderer/src/components/layout/Sidebar.tsx

import React from "react";
import { NavLink } from "react-router-dom";
import { BookOpen, Search, Settings } from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: "书架",
    path: "/library",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    label: "书城",
    path: "/crawler",
    icon: <Search className="h-4 w-4" />,
  },
  // 原来的“正在阅读”去掉，避免和书架功能重复
  {
    label: "设置",
    path: "/settings",
    icon: <Settings className="h-4 w-4" />,
  },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-sidebar/60">
      <div className="flex h-12 items-center px-4 text-sm font-semibold text-primary">
        JhNovel
      </div>

      <nav className="flex-1 space-y-1 px-2 py-2 text-sm">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              [
                "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
        JhNovel v0.1.0
      </div>
    </aside>
  );
};

export default Sidebar;
