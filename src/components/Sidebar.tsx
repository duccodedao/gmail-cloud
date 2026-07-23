import React from "react";
import { 
  LayoutDashboard, 
  Mail, 
  Cloud, 
  Settings, 
  Database, 
  ShieldCheck, 
  Sparkles, 
  Activity, 
  ArrowLeftRight,
  Wifi,
  WifiOff,
  LogOut,
  Ticket,
  Copy,
  Check,
  Smartphone
} from "lucide-react";
import { Theme } from "../types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: Theme;
  userEmail: string;
  userName: string;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  totalAccounts: number;
  onLogout: () => void;
  isAdmin: boolean;
  isInstallable?: boolean;
  onInstallPWA?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  theme,
  userEmail,
  userName,
  sidebarOpen,
  setSidebarOpen,
  totalAccounts,
  onLogout,
  isAdmin,
  isInstallable = false,
  onInstallPWA
}) => {
  const [promoCopied, setPromoCopied] = React.useState(false);

  // Check PWA and device context
  const isIOS = typeof window !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = typeof window !== "undefined" && (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone);

  const menuItems = isAdmin ? [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "accounts", label: "Danh sách Email", icon: Mail },
    { id: "temp-email", label: "Gmail Tạm Thời", icon: Sparkles },
    { id: "sync", label: "Nhập & Xuất", icon: ArrowLeftRight },
    { id: "settings", label: "Cài đặt hệ thống", icon: Settings },
    { id: "admin-panel", label: "Admin Panel", icon: ShieldCheck }
  ] : [
    { id: "temp-email", label: "Gmail Tạm Thời", icon: Sparkles }
  ];

  const handleNav = (tabId: string) => {
    setActiveTab(tabId);
    setSidebarOpen(false); // Close on mobile navigation
  };

  const handleCopyPromo = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText("SVNSFRHG");
    setPromoCopied(true);
    setTimeout(() => setPromoCopied(false), 2000);
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          id="sidebar-overlay"
        />
      )}

      {/* Main Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 flex flex-col w-72 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800/80 transform transition-transform duration-300 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        id="app-sidebar"
      >
        {/* Sidebar Header / Branding */}
        <div className="flex items-center justify-between px-6 h-20 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#4285F4] to-[#34A853] shadow-md shadow-blue-500/10">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight leading-none">Gmail</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#4285F4]/10 text-[#4285F4] dark:text-[#60a5fa]">Cloud</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Workspace Manager</p>
            </div>
          </div>

          <button 
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            id="sidebar-close-btn"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`relative flex items-center gap-3.5 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all group cursor-pointer ${
                  isActive
                    ? "text-[#4285F4] dark:text-[#60a5fa] bg-[#4285F4]/8 dark:bg-[#4285F4]/15"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
                id={`sidebar-nav-${item.id}`}
              >
                <IconComponent className={`w-5 h-5 transition-transform duration-300 group-hover:scale-105 ${
                  isActive ? "text-[#4285F4] dark:text-[#60a5fa]" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                }`} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute right-0 top-1/4 bottom-1/4 w-1 rounded-l-full bg-[#4285F4] dark:bg-[#60a5fa]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* PWA Installation block */}
        {(isInstallable || (isIOS && !isStandalone)) && (
          <div className="px-5 py-3.5 mx-4 mb-3.5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 dark:border-indigo-500/25 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Cài đặt Ứng dụng</span>
            </div>
            
            {isInstallable && onInstallPWA && (
              <>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                  Cài đặt Gmail Cloud trực tiếp lên thiết bị để nhận thông báo tức thời và truy cập nhanh hơn.
                </p>
                <button
                  onClick={onInstallPWA}
                  className="w-full py-2 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-[0.98] cursor-pointer"
                >
                  Cài đặt ngay (PWA)
                </button>
              </>
            )}

            {isIOS && !isStandalone && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Để cài đặt trên iOS: nhấn nút <span className="font-bold text-indigo-500">Chia sẻ (Share)</span> trên Safari, sau đó chọn <span className="font-bold text-indigo-500">Thêm vào MH chính (Add to Home Screen)</span>.
              </p>
            )}
          </div>
        )}

        {/* Promo Code Card */}
        <div className="px-5 py-4 mx-4 mb-3.5 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 dark:border-blue-500/25 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Ticket className="w-4.5 h-4.5 text-blue-500 dark:text-blue-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Mã Khuyến Mại</span>
          </div>
          <div className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-slate-950 rounded-xl border border-blue-500/15 dark:border-blue-500/10">
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 select-all tracking-wider pl-1">SVNSFRHG</span>
            <button
              onClick={handleCopyPromo}
              className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer shrink-0 ${
                promoCopied 
                  ? 'bg-emerald-500 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/40'
              }`}
              title="Sao chép mã"
            >
              {promoCopied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* User Identity Footer */}
        <div className="flex items-center gap-3 p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative">
            <img 
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${userEmail}&backgroundColor=3b82f6&textColor=ffffff`}
              alt="Avatar" 
              className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700/60 shadow-inner"
              referrerPolicy="no-referrer"
            />
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"></span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{userName || "Hồng Đức"}</p>
            <p className="text-[10px] font-semibold text-slate-400 truncate tracking-wide">{userEmail}</p>
          </div>
          <button 
            onClick={onLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
            title="Đăng xuất"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </aside>
    </>
  );
};
