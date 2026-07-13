import React from "react";
import { Search, X, Sun, Moon, Bell, Menu, RefreshCw, AlertCircle } from "lucide-react";
import { Theme } from "../types";

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTab: string;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  refreshData: () => Promise<void>;
  isRefreshing: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  activeTab,
  theme,
  setTheme,
  refreshData,
  isRefreshing,
  sidebarOpen,
  setSidebarOpen
}) => {
  const getBreadcrumb = () => {
    switch (activeTab) {
      case "dashboard":
        return "Dashboard";
      case "accounts":
        return "Danh sách Email";
      case "sync":
        return "Nhập & Xuất";
      case "settings":
        return "Cài đặt hệ thống";
      default:
        return "Trang chủ";
    }
  };

  const handleToggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <header 
      className="sticky top-0 z-30 flex items-center justify-between px-6 h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-sm"
      id="app-header"
    >
      {/* Mobile Menu Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen((prev: boolean) => !prev)}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none cursor-pointer transition-colors"
          id="sidebar-toggle"
          aria-label="Toggle navigation drawer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500">
            Gmail Cloud
          </span>
          <span className="text-base font-bold text-slate-800 dark:text-white leading-snug">
            {getBreadcrumb()}
          </span>
        </div>
      </div>

      {/* Center Search Engine */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6" id="search-box-container">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Search className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm Email, Password, Ghi chú..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm minimalist-input text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none transition-all"
            id="global-search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none cursor-pointer"
              id="clear-search-btn"
              title="Xóa nhanh tìm kiếm"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2">
        {/* Sync Trigger Button */}
        <button
          onClick={refreshData}
          disabled={isRefreshing}
          className={`p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all cursor-pointer ${
            isRefreshing ? "animate-spin opacity-50" : ""
          }`}
          title="Làm mới đồng bộ dữ liệu"
          id="sync-refresh-btn"
        >
          <RefreshCw className="w-4.5 h-4.5" />
        </button>

        {/* Theme Changer */}
        <button
          onClick={handleToggleTheme}
          className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all cursor-pointer"
          title={theme === "light" ? "Chuyển sang Giao diện tối" : "Chuyển sang Giao diện sáng"}
          id="theme-toggle-btn"
        >
          {theme === "light" ? (
            <Moon className="w-4.5 h-4.5 text-slate-600" />
          ) : (
            <Sun className="w-4.5 h-4.5 text-amber-400" />
          )}
        </button>

        {/* Notifications Popover Trigger (Visual element) */}
        <div className="relative">
          <button
            className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-all cursor-pointer"
            id="notifications-bell-btn"
          >
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900" />
          </button>
        </div>
      </div>
    </header>
  );
};
