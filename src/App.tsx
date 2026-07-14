import React, { useState, useEffect } from "react";
import { 
  Plus, 
  UploadCloud, 
  Download, 
  RefreshCw, 
  Mail, 
  Database, 
  FileText, 
  ShieldAlert, 
  ArrowRight,
  ClipboardCheck,
  CheckCircle,
  Palette,
  Trash2,
  HardDrive,
  Activity
} from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { StatsCards } from "./components/StatsCards";
import { AccountTable } from "./components/AccountTable";
import { VaultManager } from "./components/VaultManager";
import { VaultModal } from "./components/VaultModal";
import { AccountModal } from "./components/AccountModal";
import { ImportModal } from "./components/ImportModal";
import { ConfirmModal } from "./components/ConfirmModal";
import { ToastContainer } from "./components/Toast";
import { TempEmailView } from "./components/TempEmailView";
import { accountsRepo, vaultRepo, auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from "./lib/firebase";
import { GmailAccount, VaultItem, AccountStatus, DashboardStats, Theme, ToastMessage } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { User } from "firebase/auth";

export default function App() {
  const ADMIN_EMAILS = ["sonlyhongduc@gmail.com", "sonlyhongduc1@ghn.vn"];
  
  const isAdmin = (email?: string | null) => {
    if (!email) return false;
    return ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase());
  };

  // Navigation & Identity States
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const userEmail = user?.email || "";
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  // Styling & Theme preference
  const [theme, setTheme] = useState<Theme>(() => {
    // Read preference on load
    const saved = localStorage.getItem("gmail_cloud_theme");
    if (saved === "light" || saved === "dark") return saved;
    return "light";
  });

  // Database Connection states
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Repository states
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVaultLoading, setIsVaultLoading] = useState<boolean>(true);

  // Modal dialog states
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<GmailAccount | null>(null);
  const [editingVaultItem, setEditingVaultItem] = useState<VaultItem | null>(null);

  // Confirm modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const closeConfirm = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));

  // Custom Toast notifications array
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Apply dark class to body when theme shifts
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("gmail_cloud_theme", theme);
  }, [theme]);

  // Auth Effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error", error);
      addToast("Đăng nhập thất bại", "error");
    }
  };

  const handleLogout = async () => {
    setConfirmConfig({
      isOpen: true,
      title: "Đăng xuất",
      message: "Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?",
      onConfirm: async () => {
        try {
          await signOut(auth);
          addToast("Đã đăng xuất", "info");
        } catch (error) {
          console.error("Logout Error", error);
        }
      }
    });
  };

  // Initial connection test and dataloading - Switch to Real-time subscription
  useEffect(() => {
    if (!user || !user.email) return;
    
    // Normalize email for check
    if (!isAdmin(user.email)) {
      console.warn("User is not authorized as admin:", user.email);
      return;
    }
    
    let unsubscribe: (() => void) | undefined;
    let unsubscribeVault: (() => void) | undefined;

    const initializeApp = async () => {
      setIsLoading(true);
      setIsVaultLoading(true);
      try {
        console.log("App: Starting Firestore subscriptions...");
        
        // Gmail Accounts subscription
        unsubscribe = accountsRepo.subscribe((data) => {
          setAccounts(data);
          setIsLoading(false);
        }, (error) => {
          console.error("App: Firestore subscription error:", error);
          addToast("Lỗi kết nối Gmail Accounts", "error");
          setIsLoading(false);
        });

        // Web Vault subscription
        unsubscribeVault = vaultRepo.subscribe((items) => {
          setVaultItems(items);
          setIsVaultLoading(false);
        }, (error) => {
          console.error("App: Vault subscription error:", error);
          addToast("Lỗi kết nối Web Vault", "error");
          setIsVaultLoading(false);
        });

      } catch (err) {
        console.error("Initialization failed", err);
        addToast("Không thể kết nối đến Cloud Firestore", "error");
        setIsLoading(false);
        setIsVaultLoading(false);
      }
    };

    initializeApp();

    // Cleanup subscriptions on unmount
    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubscribeVault) unsubscribeVault();
    };
  }, [user]);

  // Utility to push notifications
  const addToast = (message: string, type: "success" | "error" | "info" | "warning") => {
    const id = "toast_" + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sync data refresh trigger
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      const data = await accountsRepo.getAll();
      setAccounts(data);
      addToast("Đã đồng bộ trực tiếp với Gmail Cloud Firestore!", "success");
    } catch (err) {
      console.error(err);
      addToast("Lỗi khi tải đồng bộ cơ sở dữ liệu", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Save changes from modal form - Optimistic Update
  const handleSaveAccount = async (payload: Omit<GmailAccount, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    
    if (editingAccount) {
      // Optimistic Edit
      const originalAccounts = [...accounts];
      const editingId = editingAccount.id;
      const updatedAcc = { ...editingAccount, ...payload, updatedAt: now };
      setAccounts(prev => prev.map(a => a.id === editingId ? updatedAcc : a));
      
      addToast(`Đang cập nhật: ${payload.email}`, "info");
      setIsAccountModalOpen(false);
      setEditingAccount(null);

      // Background Sync (Not awaited to keep UI snappy)
      accountsRepo.update(editingId, payload)
        .then(() => {
          addToast(`Đã chỉnh sửa thành công: ${payload.email}`, "success");
        })
        .catch((err) => {
          console.error("Firestore Update Error:", err);
          setAccounts(originalAccounts); // Rollback
          addToast("Không thể cập nhật cơ sở dữ liệu Firestore", "error");
        });
    } else {
      // Optimistic Create
      const tempId = "temp_" + Date.now();
      const newAcc: GmailAccount = { ...payload, id: tempId, createdAt: now, updatedAt: now };
      setAccounts(prev => [newAcc, ...prev]);
      
      addToast(`Đang đăng ký: ${payload.email}`, "info");
      setIsAccountModalOpen(false);

      // Background Sync (Not awaited to keep UI snappy)
      accountsRepo.create(payload)
        .then(() => {
          addToast(`Đã đăng ký thành công: ${payload.email}`, "success");
        })
        .catch((err) => {
          console.error("Firestore Create Error:", err);
          setAccounts(prev => prev.filter(a => a.id !== tempId)); // Rollback
          addToast("Không thể lưu vào cơ sở dữ liệu Firestore", "error");
        });
    }
  };

  // Delete account confirmation - Optimistic Delete
  const handleDeleteAccount = (id: string) => {
    const target = accounts.find(a => a.id === id);
    if (!target) return;

    setConfirmConfig({
      isOpen: true,
      title: "Xóa tài khoản",
      message: `Bạn có chắc chắn muốn xóa tài khoản "${target.email}" ra khỏi Gmail Cloud không? Hành động này không thể hoàn tác.`,
      isDestructive: true,
      onConfirm: async () => {
        const originalAccounts = [...accounts];
        setAccounts(prev => prev.filter(a => a.id !== id));
        addToast(`Đang xóa tài khoản...`, "info");

        // Background Sync
        accountsRepo.delete(id)
          .then(() => {
            addToast(`Đã xóa vĩnh viễn tài khoản ${target.email}`, "warning");
          })
          .catch((err) => {
            console.error(err);
            setAccounts(originalAccounts); // Rollback
            addToast("Lỗi khi thực thi yêu cầu xóa trên Cloud", "error");
          });
      }
    });
  };

  const handleDeleteMultipleAccounts = (ids: string[]) => {
    if (ids.length === 0) return;

    setConfirmConfig({
      isOpen: true,
      title: `Xóa ${ids.length} tài khoản`,
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn ${ids.length} tài khoản đã chọn ra khỏi Gmail Cloud không? Hành động này không thể hoàn tác.`,
      isDestructive: true,
      onConfirm: async () => {
        const originalAccounts = [...accounts];
        setAccounts(prev => prev.filter(a => !ids.includes(a.id)));
        addToast(`Đang xóa ${ids.length} tài khoản...`, "info");

        // Background Sync
        accountsRepo.deleteMultiple(ids)
          .then(() => {
            addToast(`Đã xóa thành công ${ids.length} tài khoản đã chọn`, "warning");
          })
          .catch((err) => {
            console.error(err);
            setAccounts(originalAccounts); // Rollback
            addToast("Lỗi khi thực thi yêu cầu xóa hàng loạt trên Cloud", "error");
          });
      }
    });
  };

  // Bulk import accounts
  const handleBulkImport = async (validAccounts: Omit<GmailAccount, "id" | "createdAt" | "updatedAt">[]) => {
    try {
      addToast(`Đang nhập ${validAccounts.length} tài khoản...`, "info");
      await accountsRepo.importBulk(validAccounts);
      addToast(`Đã nhập thành công ${validAccounts.length} tài khoản`, "success");
    } catch (err) {
      console.error(err);
      addToast("Gặp sự cố khi gởi danh sách bulk", "error");
      throw err;
    }
  };

  // Excel bulk export handler
  const handleExportExcel = () => {
    if (accounts.length === 0) {
      addToast("Không có tài khoản nào để xuất dữ liệu", "warning");
      return;
    }

    try {
      import("xlsx").then((XLSX) => {
        const worksheetData = accounts.map(acc => {
          let vietnameseStatus = "Hoạt động";
          if (acc.status === AccountStatus.UNUSED) vietnameseStatus = "Chưa sử dụng";
          if (acc.status === AccountStatus.IN_USE) vietnameseStatus = "Đang sử dụng";
          if (acc.status === AccountStatus.LOCKED) vietnameseStatus = "Đã bị khóa";
          if (acc.status === AccountStatus.SUSPENDED) vietnameseStatus = "Tạm ngưng";

          return {
            "Email": acc.email,
            "Mật Khẩu": acc.password || "",
            "Trạng Thái": vietnameseStatus,
            "Ghi Chú": acc.note || "",
            "Ngày Tạo": acc.createdAt,
            "Cập Nhật": acc.updatedAt
          };
        });

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Tài khoản");

        const stamp = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `gmail_cloud_export_${stamp}.xlsx`);

        addToast("Đã tải xuống danh sách tệp lưu trữ Excel thành công", "success");
      }).catch(err => {
        console.error(err);
        addToast("Lỗi khi tải thư viện xuất file", "error");
      });
    } catch (err) {
      console.error(err);
      addToast("Lỗi khi biên dịch file sao lưu", "error");
    }
  };

  // Wipe all database data (Sandbox tool)
  const handleWipeData = () => {
    setConfirmConfig({
      isOpen: true,
      title: "Xóa toàn bộ dữ liệu",
      message: "CẢNH BÁO: Hành động này sẽ xóa sạch TOÀN BỘ dữ liệu Gmail đang lưu trữ trên Cloud Firestore! Bạn có chắc chắn muốn thực hiện?",
      isDestructive: true,
      onConfirm: async () => {
        const originalAccounts = [...accounts];
        try {
          setIsLoading(true);
          setAccounts([]); // Optimistic wipe

          // Sync database wipes
          for (const acc of originalAccounts) {
            await accountsRepo.delete(acc.id);
          }
          addToast("Đã xóa sạch dữ liệu thành công!", "error");
        } catch (err) {
          setAccounts(originalAccounts); // Rollback
          console.error(err);
          addToast("Lỗi khi xóa sạch dữ liệu", "error");
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  // Copy raw list format (email|pass)
  const handleCopyRawList = () => {
    if (accounts.length === 0) {
      addToast("Không có tài khoản nào để sao chép", "warning");
      return;
    }
    const rawLines = accounts.map(a => `${a.email}|${a.password || ""}`).join("\n");
    let success = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(rawLines);
        success = true;
      }
    } catch (e) {}

    if (!success) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = rawLines;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch (e) {}
    }

    if (success) {
      addToast(`Đã copy nhanh ${accounts.length} tài khoản dạng định dạng: email|pass`, "success");
    } else {
      addToast("Lỗi sao chép thông tin", "error");
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (account: GmailAccount) => {
    setEditingAccount(account);
    setIsAccountModalOpen(true);
  };

  // Open Add Dialog
  const handleOpenAdd = () => {
    setEditingAccount(null);
    setIsAccountModalOpen(true);
  };

  // Vault Handlers
  const handleOpenAddVault = () => {
    setEditingVaultItem(null);
    setIsVaultModalOpen(true);
  };

  const handleOpenEditVault = (item: VaultItem) => {
    setEditingVaultItem(item);
    setIsVaultModalOpen(true);
  };

  const handleSaveVaultItem = async (data: Partial<VaultItem>) => {
    try {
      if (editingVaultItem) {
        await vaultRepo.update(editingVaultItem.id, data);
        addToast("Cập nhật thành công", "success");
      } else {
        await vaultRepo.create(data as Omit<VaultItem, "id" | "createdAt" | "updatedAt">);
        addToast("Đã lưu vào kho lưu trữ", "success");
      }
    } catch (error) {
      addToast("Lỗi khi lưu dữ liệu", "error");
    }
  };

  const handleDeleteVaultItem = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Xóa tài khoản web",
      message: "Bạn có chắc chắn muốn xóa thông tin này khỏi kho lưu trữ không?",
      isDestructive: true,
      onConfirm: async () => {
        try {
          await vaultRepo.delete(id);
          addToast("Đã xóa khỏi kho", "info");
        } catch (error) {
          addToast("Không thể xóa dữ liệu", "error");
        }
      }
    });
  };

  // Compute stats metrics dynamically
  const stats: DashboardStats = {
    total: accounts.length,
    active: accounts.filter(a => a.status === AccountStatus.ACTIVE).length,
    unused: accounts.filter(a => a.status === AccountStatus.UNUSED).length,
    inUse: accounts.filter(a => a.status === AccountStatus.IN_USE).length,
    locked: accounts.filter(a => a.status === AccountStatus.LOCKED).length,
    suspended: accounts.filter(a => a.status === AccountStatus.SUSPENDED).length,
    peerMet: accounts.filter(a => {
      if (!a.lastPeerMeetAt) return false;
      const last = new Date(a.lastPeerMeetAt).getTime();
      const now = new Date().getTime();
      return (now - last) < 24 * 60 * 60 * 1000;
    }).length,
    notPeerMet: accounts.filter(a => {
      if (!a.lastPeerMeetAt) return true;
      const last = new Date(a.lastPeerMeetAt).getTime();
      const now = new Date().getTime();
      return (now - last) >= 24 * 60 * 60 * 1000;
    }).length
  };

  // Filter accounts by both Search Input & Selected Status Filter Box
  const filteredAccounts = accounts
    .filter(acc => {
      const matchesSearch = 
        acc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (acc.password || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (acc.note || "").toLowerCase().includes(searchQuery.toLowerCase());

      let matchesStatus = true;
      if (selectedFilter) {
        if (selectedFilter === "PEER_MET") {
          if (!acc.lastPeerMeetAt) {
            matchesStatus = false;
          } else {
            const last = new Date(acc.lastPeerMeetAt).getTime();
            const now = new Date().getTime();
            matchesStatus = (now - last) < 24 * 60 * 60 * 1000;
          }
        } else if (selectedFilter === "NOT_PEER_MET") {
          if (!acc.lastPeerMeetAt) {
            matchesStatus = true;
          } else {
            const last = new Date(acc.lastPeerMeetAt).getTime();
            const now = new Date().getTime();
            matchesStatus = (now - last) >= 24 * 60 * 60 * 1000;
          }
        } else {
          matchesStatus = acc.status === selectedFilter;
        }
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const now = new Date().getTime();
      
      const getPeerMeetTimeLeft = (acc: GmailAccount) => {
        if (!acc.lastPeerMeetAt) return null;
        const last = new Date(acc.lastPeerMeetAt).getTime();
        const diff = 24 * 60 * 60 * 1000 - (now - last);
        return diff > 0 ? diff : null;
      };

      const timeLeftA = getPeerMeetTimeLeft(a);
      const timeLeftB = getPeerMeetTimeLeft(b);

      if (timeLeftA !== null && timeLeftB !== null) {
        return timeLeftA - timeLeftB; // smaller remaining time (almost done) first
      }
      if (timeLeftA !== null) return -1;
      if (timeLeftB !== null) return 1;

      // Fallback: Default sorting (createdAt DESC)
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

  const handleUpdateAccount = async (id: string, updates: Partial<GmailAccount>) => {
    const originalAccounts = [...accounts];
    const now = new Date().toISOString();
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates, updatedAt: now } : a));

    try {
      await accountsRepo.update(id, updates);
      addToast("Cập nhật thành công", "success");
    } catch (error) {
      console.error("Error updating account:", error);
      setAccounts(originalAccounts); // Rollback on failure
      addToast("Lỗi cập nhật", "error");
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin(user.email)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
            Xác thực Quản trị viên
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-medium">
            Hệ thống quản lý tài khoản yêu cầu quyền truy cập admin. Vui lòng đăng nhập để tiếp tục.
          </p>
          
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            Đăng nhập bằng Google
          </button>

          {user && !isAdmin(user.email) && (
            <div className="mt-6 p-4 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-sm font-semibold border border-rose-500/20">
              Tài khoản {user.email} không có quyền truy cập quản trị. 
              <button onClick={handleLogout} className="ml-2 underline font-bold cursor-pointer">
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex transition-colors duration-300">
      
      {/* 1. SIDEBAR RAIL */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        userEmail={userEmail}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        totalAccounts={accounts.length}
        onLogout={handleLogout}
      />

      {/* 2. MAIN APPLICATION CONTENT VIEWPORTS */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-out ${sidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
        
        {/* HEADER CONTROL */}
        <Header 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeTab={activeTab}
          theme={theme}
          setTheme={setTheme}
          refreshData={handleRefreshData}
          isRefreshing={isRefreshing}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {/* VIEW PORT SCROLL AREA */}
        <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto max-w-full xl:max-w-[1680px] mx-auto w-full transition-all">
          
          <AnimatePresence mode="wait">
            
            {/* TAB 1: OVERVIEW DASHBOARD */}
            {activeTab === "dashboard" && (
              <motion.div
                key="dashboard-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-8"
              >
                {/* Stats row with counter counters */}
                <StatsCards 
                  stats={stats}
                  onSelectStatusFilter={setSelectedFilter}
                  selectedFilter={selectedFilter}
                />

                {/* Dashboard Main Table view (optimized to full width) */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-500" />
                        Trung tâm dữ liệu chính
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">
                        {selectedFilter 
                          ? `Đang lọc theo trạng thái: ${selectedFilter}` 
                          : "Hiển thị toàn bộ tài khoản Gmail lưu trữ trong hệ thống"
                        }
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {selectedFilter && (
                        <button
                          onClick={() => setSelectedFilter(null)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                        >
                          Xóa bộ lọc
                        </button>
                      )}
                      <button
                        onClick={handleOpenAdd}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 transition-all cursor-pointer active:scale-98"
                        id="dash-add-btn"
                      >
                        <Plus className="w-4 h-4" />
                        Thêm tài khoản
                      </button>
                    </div>
                  </div>

                  {/* Filter Indicator Badge Row */}
                  {searchQuery && (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                      <CheckCircle className="w-4 h-4" />
                      Tìm kiếm từ khóa: "{searchQuery}" ({filteredAccounts.length} kết quả)
                    </div>
                  )}

                  <AccountTable 
                    accounts={filteredAccounts}
                    isLoading={isLoading}
                    onEdit={handleOpenEdit}
                    onUpdate={handleUpdateAccount}
                    onDelete={handleDeleteAccount}
                    onDeleteMultiple={handleDeleteMultipleAccounts}
                    addToast={addToast}
                    onOpenAddModal={handleOpenAdd}
                    variant="dashboard"
                  />
                </div>
              </motion.div>
            )}

            {/* TAB 2: EMAIL LIST VIEW */}
            {activeTab === "accounts" && (
              <motion.div
                key="accounts-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Control toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                  
                  {/* Status selection boxes */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setSelectedFilter(null)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedFilter === null 
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                          : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      Tất cả ({accounts.length})
                    </button>
                    <button
                      onClick={() => setSelectedFilter("ACTIVE")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedFilter === "ACTIVE"
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/10"
                          : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      Hoạt động ({stats.active})
                    </button>
                    <button
                      onClick={() => setSelectedFilter("UNUSED")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedFilter === "UNUSED"
                          ? "bg-amber-600 text-white shadow-md shadow-amber-500/10"
                          : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      Chưa sử dụng ({stats.unused})
                    </button>
                    <button
                      onClick={() => setSelectedFilter("LOCKED")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedFilter === "LOCKED"
                          ? "bg-rose-600 text-white shadow-md shadow-rose-500/10"
                          : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      Đã khóa ({stats.locked})
                    </button>
                    <button
                      onClick={() => setSelectedFilter("PEER_MET")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedFilter === "PEER_MET"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/10"
                          : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      Đã Check ({stats.peerMet})
                    </button>
                    <button
                      onClick={() => setSelectedFilter("NOT_PEER_MET")}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedFilter === "NOT_PEER_MET"
                          ? "bg-purple-600 text-white shadow-md shadow-purple-500/10"
                          : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      Chưa Check ({stats.notPeerMet})
                    </button>
                  </div>

                  {/* Core triggers list */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleOpenAdd}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 transition-all cursor-pointer active:scale-98"
                      id="toolbar-add-btn"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm tài khoản
                    </button>
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all cursor-pointer"
                    >
                      <UploadCloud className="w-4 h-4 text-blue-500" />
                      Import Excel
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-blue-500" />
                      Export Excel
                    </button>
                  </div>
                </div>

                {/* Subtitle count indicator */}
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                    Kết quả lọc: {filteredAccounts.length} / {accounts.length} Email
                  </span>
                </div>

                {/* Database accounts list table layout */}
                <AccountTable 
                  accounts={filteredAccounts}
                  isLoading={isLoading}
                  onEdit={handleOpenEdit}
                  onUpdate={handleUpdateAccount}
                  onDelete={handleDeleteAccount}
                  onDeleteMultiple={handleDeleteMultipleAccounts}
                  addToast={addToast}
                  onOpenAddModal={handleOpenAdd}
                  variant="list"
                />
              </motion.div>
            )}

            {/* TAB: TEMP EMAIL GENERATOR & INBOX */}
            {activeTab === "temp-email" && (
              <motion.div
                key="temp-email-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <TempEmailView 
                  addToast={addToast} 
                  onAddAccount={handleSaveAccount} 
                  existingEmails={accounts.map(a => a.email)}
                />
              </motion.div>
            )}

            {/* TAB 3: VAULT VIEW */}
            {activeTab === "vault" && (
              <motion.div
                key="vault-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <VaultManager 
                  items={vaultItems}
                  onAdd={handleOpenAddVault}
                  onEdit={handleOpenEditVault}
                  onDelete={handleDeleteVaultItem}
                  addToast={addToast}
                />
              </motion.div>
            )}

            {/* TAB 4: IMPORT & EXPORT DOCK */}
            {activeTab === "sync" && (
              <motion.div
                key="sync-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                {/* Left card: Import Area */}
                <div className="p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white">Công cụ Nhập Tài Khoản (Import)</h3>
                      <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">Bulk File Processing</p>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      Hệ thống tự động phân loại và chuẩn hóa dữ liệu từ tệp tin Excel của bạn. Hỗ trợ hàng ngàn dòng dữ liệu cùng một lúc với độ trễ thấp.
                    </p>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-slate-150 dark:border-slate-800">
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 cursor-pointer transition-all active:scale-98 min-h-[44px]"
                    >
                      <UploadCloud className="w-4.5 h-4.5" />
                      Tải lên File Excel (.xlsx, .xls)
                    </button>
                    <p className="text-[11px] text-slate-400 text-center font-medium">
                      Mẹo: Tải file mẫu bên trên để lấy đúng tiêu đề các cột dữ liệu.
                    </p>
                  </div>
                </div>

                {/* Right card: Export & Backup Area */}
                <div className="p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm">
                      <Download className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white">Sao Lưu &amp; Xuất Dữ Liệu (Export)</h3>
                      <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">Cloud Data Backups</p>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                      Sao lưu toàn bộ thông tin Gmail lưu trữ trong hệ thống xuống máy tính cá nhân dưới định dạng chuẩn Excel của Microsoft Excel.
                    </p>

                    <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-150 dark:border-slate-850 space-y-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500">Tổng tài khoản khả dụng:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-bold">{accounts.length} email</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-500">Dung lượng ước tính:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-bold">{Math.round(accounts.length * 0.12)} KB</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-6 border-t border-slate-150 dark:border-slate-800">
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 shadow-sm cursor-pointer transition-all active:scale-98 min-h-[44px]"
                    >
                      <Download className="w-4.5 h-4.5 text-blue-500" />
                      Tải File sao lưu dữ liệu (.csv)
                    </button>
                    <button
                      onClick={handleCopyRawList}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold border border-blue-500/20 hover:bg-blue-500/5 text-blue-600 dark:text-blue-400 cursor-pointer transition-all active:scale-98 min-h-[44px]"
                    >
                      <ClipboardCheck className="w-4.5 h-4.5" />
                      Sao chép nhanh danh sách dạng raw (email|pass)
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 4: SYSTEM CONFIGS / SETTINGS */}
            {activeTab === "settings" && (
              <motion.div
                key="settings-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="max-w-3xl mx-auto space-y-6"
              >
                {/* Panel 2: Preferences UI Theme Customize */}
                <div className="p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Palette className="w-5 h-5 text-blue-500" />
                      Tùy biến hiển thị (Aesthetics Preference)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wider">
                      Điều chỉnh giao diện trải nghiệm
                    </p>
                  </div>

                  <div className="space-y-4">
                    <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Giao Diện Hệ Thống (Color Theme)</span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setTheme("light")}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          theme === "light"
                            ? "border-blue-500 bg-blue-500/10 text-blue-600"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        Giao diện Sáng (Standard)
                      </button>
                      <button
                        onClick={() => setTheme("dark")}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          theme === "dark"
                            ? "border-blue-500 bg-blue-500/10 text-blue-400"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        Giao diện Tối (Slate Dark)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Panel 3: Danger Wiping Settings */}
                <div className="p-6 md:p-8 bg-rose-500/5 dark:bg-rose-500/5 border border-rose-500/10 dark:border-rose-500/20 rounded-3xl shadow-sm space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5" />
                      Vùng nguy hiểm (Danger Zone)
                    </h3>
                    <p className="text-xs text-rose-500/80 mt-1 font-semibold uppercase tracking-wider">
                      Hành động xóa sạch dữ liệu không thể hoàn tác
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Xóa sạch toàn bộ tài khoản Gmail</span>
                      <span className="text-[11px] text-slate-400 font-medium leading-normal block">
                        Thao tác này xóa vĩnh viễn dữ liệu Gmail lưu trữ tập trung trên Cloud Firestore.
                      </span>
                    </div>
                    <button
                      onClick={handleWipeData}
                      className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/10 cursor-pointer transition-all active:scale-98 min-h-[44px]"
                      id="wipe-data-btn"
                    >
                      <Trash2 className="w-4 h-4" />
                      Xóa sạch dữ liệu
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* 3. CORE POPUPS AND DIALOGS */}
      <AccountModal 
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSave={handleSaveAccount}
        editingAccount={editingAccount}
        addToast={addToast}
        existingEmails={accounts.map(a => a.email)}
      />

      <VaultModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        onSave={handleSaveVaultItem}
        initialData={editingVaultItem}
      />

      <ImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleBulkImport}
        addToast={addToast}
        existingEmails={accounts.map(a => a.email)}
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onClose={closeConfirm}
        isDestructive={confirmConfig.isDestructive}
      />

      {/* Custom Toast Alert Center */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
