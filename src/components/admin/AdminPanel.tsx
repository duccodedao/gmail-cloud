import React, { useState } from "react";
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield, 
  User as UserIcon, 
  Search, 
  X, 
  Calendar, 
  FileText,
  Activity,
  Layers,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  UserCheck,
  AlertCircle
} from "lucide-react";
import { ConfirmModal } from "../ConfirmModal";
import { AllowedUser, DashboardStats, TempEmailLog } from "../../types";
import { tempEmailsLogRepo, domainStatusRepo, testHistoryRepo } from "../../lib/firebase";
import { StatsCards } from "../StatsCards";
import { motion, AnimatePresence } from "motion/react";
import { DomainManagement } from "./DomainManagement";
import ErrorLogs from "./ErrorLogs";
import { generateTempEmail, fetchMessages, getAvailableDomains, GeneratedEmailInfo } from "../../services/tempEmailService";

interface AdminPanelProps {
  stats: DashboardStats;
  allowedUsers: AllowedUser[];
  onAddUser: (user: Omit<AllowedUser, "createdAt" | "updatedAt">) => Promise<void>;
  onEditUser: (id: string, updates: Partial<Omit<AllowedUser, "id" | "createdAt">>) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  addToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  stats,
  allowedUsers,
  onAddUser,
  onEditUser,
  onDeleteUser,
  addToast
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    userToDelete: { id: string; email: string } | null;
  }>({ isOpen: false, userToDelete: null });
  const [editingUser, setEditingUser] = useState<AllowedUser | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "emails" | "test" | "errors">("users");

  const [tempEmails, setTempEmails] = useState<TempEmailLog[]>([]);
  const [testEmails, setTestEmails] = useState<{email: GeneratedEmailInfo, status: "Đang kiểm tra" | "Hợp lệ" | "Hỏng", createdAt: string, startTime: number}[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testDuration, setTestDuration] = useState(0);

  const handleTestDomains = async () => {
    setIsTesting(true);
    setTestEmails([]);
    setTestDuration(0);
    const durationInterval = setInterval(() => setTestDuration(d => d + 1), 1000);
    
    try {
      const domains = await getAvailableDomains();
      const now = Date.now();
      const newTestEmails = await Promise.all(domains.map(async (domain) => {
        const info = await generateTempEmail("real", undefined, domain);
        return { email: info, status: "Đang kiểm tra" as const, createdAt: new Date().toISOString(), startTime: now };
      }));
      setTestEmails(newTestEmails);

      // Start polling
      const startTime = Date.now();
      const interval = setInterval(async () => {
        if (Date.now() - startTime > 180000) {
            clearInterval(interval);
            clearInterval(durationInterval);
            setIsTesting(false);
            
            // Final update and save to history
            const finalResults = testEmails.map(item => item.status === "Đang kiểm tra" ? {...item, status: "Hỏng"} : item);
            setTestEmails(finalResults);
            finalResults.forEach(async (res) => {
                await testHistoryRepo.create({ domain: res.email.domain, status: res.status });
            });
            return;
        }

        // Check messages for each email
        setTestEmails(prev => prev.map(item => {
            if (item.status !== "Đang kiểm tra") return item;
            if (Date.now() - item.startTime > 60000) {
                return { ...item, status: "Hỏng" };
            }
            return item;
        }));

        for (const item of newTestEmails) {
            // Check if already valid
            const currentItem = testEmails.find(i => i.email.email === item.email.email);
            if (currentItem && currentItem.status === "Hợp lệ") continue;
            if (currentItem && currentItem.status === "Hỏng") continue;
            
            try {
                const messages = await fetchMessages(item.email);
                if (messages.length > 0) {
                    setTestEmails(prev => prev.map(i => i.email.email === item.email.email ? {...i, status: "Hợp lệ"} : i));
                }
            } catch (e) {
                console.error("Error fetching messages for", item.email.email, e);
            }
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }, 30000); // Check every 30s

    } catch (err) {
      clearInterval(durationInterval);
      console.error(err);
      addToast("Lỗi khi kiểm tra domain", "error");
      setIsTesting(false);
    }
  };

  React.useEffect(() => {
    const unsubscribe = tempEmailsLogRepo.subscribe(
      (data) => setTempEmails(data),
      (err) => console.error(err)
    );
    return () => unsubscribe();
  }, []);

  // Form states
  const [formEmail, setFormEmail] = useState("");
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "user">("user");
  const [formEmailLimit, setFormEmailLimit] = useState<number>(0);
  const [formNote, setFormNote] = useState("");

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormEmail("");
    setFormName("");
    setFormRole("user");
    setFormEmailLimit(0);
    setFormNote("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: AllowedUser) => {
    setEditingUser(user);
    setFormEmail(user.email);
    setFormName(user.name);
    setFormRole(user.role);
    setFormEmailLimit(user.emailLimit || 0);
    setFormNote(user.note || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formEmail.trim() || !formName.trim()) {
      addToast("Vui lòng điền đầy đủ Email và Họ tên!", "warning");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formEmail.trim())) {
      addToast("Email không hợp lệ!", "error");
      return;
    }

    const emailLower = formEmail.trim().toLowerCase();

    try {
      if (editingUser) {
        await onEditUser(editingUser.id, {
          email: emailLower,
          name: formName.trim(),
          role: formRole,
          emailLimit: formEmailLimit > 0 ? formEmailLimit : undefined,
          note: formNote.trim()
        });
        addToast("Cập nhật người dùng thành công!", "success");
      } else {
        // Check duplicate
        if (allowedUsers.some(u => u.email.toLowerCase() === emailLower)) {
          addToast("Email này đã có trong danh sách phân quyền!", "error");
          return;
        }

        await onAddUser({
          id: emailLower,
          email: emailLower,
          name: formName.trim(),
          role: formRole,
          emailLimit: formEmailLimit > 0 ? formEmailLimit : undefined,
          note: formNote.trim()
        });
        addToast("Thêm người dùng mới thành công!", "success");
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      addToast("Lỗi khi lưu thông tin người dùng!", "error");
    }
  };

  const handleDelete = async (id: string, email: string) => {
    setConfirmModal({
      isOpen: true,
      userToDelete: { id, email }
    });
  };

  const confirmDelete = async () => {
    if (!confirmModal.userToDelete) return;
    const { id, email } = confirmModal.userToDelete;
    try {
      await onDeleteUser(id);
      addToast(`Đã xóa quyền truy cập của ${email}`, "warning");
    } catch (error) {
      console.error("AdminPanel: Error deleting user:", error);
      addToast("Không thể xóa người dùng!", "error");
    } finally {
      setConfirmModal({ isOpen: false, userToDelete: null });
    }
  };

  const confirmDeleteLog = async () => {
    if (!logToDelete) return;
    try {
      await tempEmailsLogRepo.delete(logToDelete);
      addToast("Đã xóa log thành công!", "success");
    } catch (error) {
      addToast("Lỗi khi xóa log!", "error");
    } finally {
      setLogToDelete(null);
    }
  };

  const filteredUsers = allowedUsers.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.note || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8" id="admin-panel-container">
      {/* 1. Statistics Cards Block */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2 tracking-tight">
            <Activity className="w-6 h-6 text-blue-500" />
            Thống Kê Hệ Thống
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Phân tích số liệu và trạng thái hoạt động của cơ sở dữ liệu Gmail Cloud
          </p>
        </div>

        {/* Displaying original statscards here */}
        <StatsCards 
          stats={stats}
          onSelectStatusFilter={() => {}}
          selectedFilter={null}
        />
      </div>

      {/* 2. Custom Visual Chart (Pure SVG / CSS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-500" />
              Tỷ lệ trạng thái Gmail
            </h3>
            <p className="text-xs text-slate-400 mt-1">Sự phân bố của các tài khoản Gmail trong cơ sở dữ liệu đám mây</p>
          </div>

          <div className="space-y-4">
            {/* Active */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-400">Đang hoạt động (ACTIVE)</span>
                <span className="text-emerald-500 font-bold">
                  {stats.active} ({stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${stats.total > 0 ? (stats.active / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Unused */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-400">Chưa sử dụng (UNUSED)</span>
                <span className="text-amber-500 font-bold">
                  {stats.unused} ({stats.total > 0 ? Math.round((stats.unused / stats.total) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                  style={{ width: `${stats.total > 0 ? (stats.unused / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* In Use */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-400">Đang sử dụng (IN_USE)</span>
                <span className="text-blue-500 font-bold">
                  {stats.inUse} ({stats.total > 0 ? Math.round((stats.inUse / stats.total) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                  style={{ width: `${stats.total > 0 ? (stats.inUse / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Locked & Suspended */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-400">Đã bị khóa / Tạm ngưng (LOCKED/SUSPENDED)</span>
                <span className="text-rose-500 font-bold">
                  {stats.locked + stats.suspended} ({stats.total > 0 ? Math.round(((stats.locked + stats.suspended) / stats.total) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                  style={{ width: `${stats.total > 0 ? ((stats.locked + stats.suspended) / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Peer Meet Health Card */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-indigo-500" />
              Sức khỏe kiểm tra định kỳ (Peer Meet)
            </h3>
            <p className="text-xs text-slate-400 mt-1">Trạng thái Check-in của các tài khoản Gmail trong vòng 24 giờ</p>
          </div>

          <div className="flex items-center gap-6 py-2">
            {/* SVG Donut Chart */}
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100 dark:text-slate-800"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  fill="transparent"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {stats.total > 0 && (
                  <path
                    className="text-indigo-500 transition-all duration-750 ease-out"
                    strokeDasharray={`${(stats.peerMet / stats.total) * 100}, 100`}
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="transparent"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                )}
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-extrabold text-slate-800 dark:text-white leading-none">
                  {stats.total > 0 ? Math.round((stats.peerMet / stats.total) * 100) : 0}%
                </span>
                <span className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">Đã Check</span>
              </div>
            </div>

            <div className="flex-1 space-y-3.5">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-indigo-500 block"></span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Đã Check</p>
                  <p className="text-[10px] font-medium text-slate-400">{stats.peerMet} tài khoản an toàn</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700 block"></span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Chưa Check</p>
                  <p className="text-[10px] font-medium text-slate-400">{stats.notPeerMet} tài khoản cần kiểm tra</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-[11px] text-indigo-600 dark:text-indigo-400 leading-relaxed font-semibold">
            Đề xuất: Chạy Peer Meet cho {stats.notPeerMet} tài khoản chưa được kiểm tra để giữ trạng thái sống tốt nhất.
          </div>
        </div>
      </div>

      {/* 3. User Authorization (Phân quyền người dùng) */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2 tracking-tight">
              <Users className="w-6 h-6 text-blue-500" />
              Danh Sách Người Dùng & Email
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Quản lý phân quyền và theo dõi số lượng thư tạm đã tạo
            </p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("users")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "users" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              Phân Quyền
            </button>
            <button
              onClick={() => setActiveTab("emails")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "emails" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              Lịch Sử Email Tạm
            </button>
            <button
              onClick={() => setActiveTab("test")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "test" ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              Test Domain
            </button>
            <button
              onClick={() => setActiveTab("errors")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "errors" ? "bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              Error Logs
            </button>
          </div>
        </div>

        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="relative max-w-md w-full sm:w-auto">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo email, tên, ghi chú..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl text-xs minimalist-input text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none transition-all"
                  id="admin-user-search"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              
              <button
                onClick={handleOpenAdd}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/15 cursor-pointer transition-all active:scale-98 shrink-0"
                id="admin-add-user-btn"
              >
                <UserPlus className="w-4.5 h-4.5" />
                Thêm người dùng mới
              </button>
            </div>

            {/* Table representation */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-150 dark:border-slate-850 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      <th className="px-6 py-4">Họ Tên / Email</th>
                      <th className="px-6 py-4">Vai Trò (Role)</th>
                      <th className="px-6 py-4">Số Email Đã Tạo</th>
                      <th className="px-6 py-4">Mail trong ngày / Giới hạn</th>
                      <th className="px-6 py-4">Ghi Chú</th>
                      <th className="px-6 py-4">Ngày Đăng Ký</th>
                      <th className="px-6 py-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-semibold">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
                          {searchQuery ? "Không tìm thấy người dùng phù hợp." : "Chưa có người dùng nào được phân quyền."}
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const emailCount = tempEmails.filter(e => e.userEmail.toLowerCase() === user.email.toLowerCase()).length;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const emailsTodayCount = tempEmails.filter(e => 
                            e.userEmail.toLowerCase() === user.email.toLowerCase() && 
                            new Date(e.createdAt) >= today
                        ).length;
                        return (
                          <tr 
                            key={user.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors"
                          >
                            {/* Name and Email */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}&backgroundColor=3b82f6&textColor=ffffff`}
                                  alt="avatar" 
                                  className="w-9 h-9 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-slate-800 dark:text-slate-100 font-bold truncate leading-snug">{user.name}</span>
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate tracking-wide mt-0.5">{user.email}</span>
                                </div>
                              </div>
                            </td>

                            {/* Role Badge */}
                            <td className="px-6 py-4">
                              {user.role === "admin" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  <Shield className="w-3.5 h-3.5" />
                                  Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                  <UserIcon className="w-3.5 h-3.5" />
                                  User
                                </span>
                              )}
                            </td>

                            {/* Email Count */}
                            <td className="px-6 py-4">
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-md">
                                {emailCount}
                              </span>
                            </td>

                            {/* Emails Today / Limit */}
                            <td className="px-6 py-4">
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {emailsTodayCount}
                              </span>
                              <span className="text-slate-400 dark:text-slate-500"> / </span>
                              <span className="text-slate-600 dark:text-slate-400">
                                {user.emailLimit && user.emailLimit > 0 ? user.emailLimit : "∞"}
                              </span>
                            </td>

                            {/* Note */}
                            <td className="px-6 py-4">
                              <p className="text-slate-500 dark:text-slate-400 line-clamp-1 max-w-[200px] font-medium">
                                {user.note || <span className="text-slate-300 dark:text-slate-600 font-normal italic">Không có</span>}
                              </p>
                            </td>

                            {/* Created At */}
                            <td className="px-6 py-4 text-slate-400 dark:text-slate-500 font-medium">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric"
                                }) : "-"}
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenEdit(user)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/5 transition-all cursor-pointer"
                                  title="Sửa quyền hạn"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(user.id, user.email)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/5 transition-all cursor-pointer"
                                  title="Xóa người dùng"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      {activeTab === "emails" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lịch sử Email Tạm đã tạo toàn hệ thống</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-150 dark:border-slate-850 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <th className="px-6 py-4">Người dùng</th>
                  <th className="px-6 py-4">Địa chỉ Email</th>
                  <th className="px-6 py-4">Tên miền</th>
                  <th className="px-6 py-4 text-right">Thời gian tạo</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-semibold">
                {tempEmails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
                      Chưa có email tạm nào được tạo.
                    </td>
                  </tr>
                ) : (
                  tempEmails.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                      <td className="px-6 py-4 text-slate-900 dark:text-slate-100 font-medium">
                        {log.userEmail}
                      </td>
                      <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-medium">
                        {log.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                          {log.domain}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 dark:text-slate-500">
                        {new Date(log.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setLogToDelete(log.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                          title="Xóa log"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "test" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Kiểm tra Domain {isTesting && `(${testDuration}s)`}</h3>
            <div className="flex gap-2">
                <button 
                  onClick={() => navigator.clipboard.writeText(testEmails.map(e => e.email.email).join(", "))}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-bold hover:bg-slate-200"
                >
                  Copy tất cả mail
                </button>
                <button 
                  onClick={async () => {
                    setIsTesting(true);
                    try {
                      await Promise.all(testEmails.map(log => domainStatusRepo.setStatus(log.email.domain, log.status === "Hợp lệ")));
                      addToast("Đã lưu trạng thái cho tất cả domain", "success");
                    } catch (err) {
                      console.error(err);
                      addToast("Lỗi khi lưu trạng thái hàng loạt", "error");
                    } finally {
                      setIsTesting(false);
                    }
                  }}
                  disabled={isTesting || testEmails.length === 0}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:bg-indigo-300"
                >
                  Lưu tất cả trạng thái
                </button>
                <button 
                  onClick={handleTestDomains}
                  disabled={isTesting}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {isTesting ? "Đang kiểm tra..." : "Bắt đầu Test"}
                </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-150 dark:border-slate-850 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <th className="px-6 py-4">Địa chỉ Email</th>
                  <th className="px-6 py-4">Tên miền</th>
                  <th className="px-6 py-4">Thời gian</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-semibold">
                {testEmails.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
                      Nhấn "Bắt đầu Test" để bắt đầu kiểm tra.
                    </td>
                  </tr>
                ) : (
                  testEmails.map((log) => (
                    <tr key={log.email.email} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                      <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-medium">
                        {log.email.email}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                        {log.email.domain}
                      </td>
                      <td className="px-6 py-4 text-slate-400 dark:text-slate-500">
                        {new Date(log.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                          log.status === "Hợp lệ" ? "bg-emerald-500/10 text-emerald-600" :
                          log.status === "Hỏng" ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => domainStatusRepo.setStatus(log.email.domain, log.status === "Hợp lệ")}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                        >
                          Lưu trạng thái
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "errors" && <ErrorLogs />}
      </div>

      <DomainManagement addToast={addToast} />

      {/* 4. CRUD Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen || !!logToDelete}
        title={confirmModal.userToDelete ? "Xóa quyền truy cập" : "Xóa log"}
        message={confirmModal.userToDelete 
          ? `Bạn có chắc chắn muốn xóa quyền truy cập của "${confirmModal.userToDelete?.email}" không?` 
          : "Bạn có chắc chắn muốn xóa log này không?"}
        confirmText="Xóa"
        onConfirm={confirmModal.userToDelete ? confirmDelete : confirmDeleteLog}
        onClose={() => {
            setConfirmModal({ isOpen: false, userToDelete: null });
            setLogToDelete(null);
        }}
      />
      
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-150 dark:border-slate-850">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-500" />
                  {editingUser ? "Chỉnh Sửa Quyền Hạn" : "Thêm Người Dùng Mới"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Email address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Địa chỉ Gmail
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    disabled={!!editingUser}
                    placeholder="example@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs minimalist-input text-slate-800 dark:text-slate-200 focus:outline-none transition-all disabled:opacity-50"
                  />
                  {!editingUser && (
                    <p className="text-[10px] text-slate-400 font-medium">
                      Nhập đúng địa chỉ Gmail người dùng sẽ dùng để đăng nhập.
                    </p>
                  )}
                </div>

                {/* Họ tên */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Họ và Tên
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Tên người dùng..."
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs minimalist-input text-slate-800 dark:text-slate-200 focus:outline-none transition-all"
                  />
                </div>

                {/* Role dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Vai Trò (Role)
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as "admin" | "user")}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs minimalist-input text-slate-800 dark:text-slate-200 focus:outline-none transition-all"
                  >
                    <option value="user">Người dùng (Chỉ dùng Gmail Tạm Thời &amp; Inbox)</option>
                    <option value="admin">Quản trị viên (Toàn quyền hệ thống)</option>
                  </select>
                </div>

                {/* Email Limit */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Giới hạn tạo Email (0 = Không giới hạn)
                  </label>
                  <input
                    type="number"
                    value={formEmailLimit}
                    onChange={(e) => setFormEmailLimit(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs minimalist-input text-slate-800 dark:text-slate-200 focus:outline-none transition-all"
                  />
                </div>

                {/* Note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Ghi chú
                  </label>
                  <textarea
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="Lý do cấp quyền, vị trí..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs minimalist-input text-slate-800 dark:text-slate-200 focus:outline-none transition-all resize-none"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex gap-3 pt-4 border-t border-slate-150 dark:border-slate-850">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 cursor-pointer text-center"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 cursor-pointer text-center"
                  >
                    Lưu thông tin
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
