import React, { useState, useEffect } from "react";
import { 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Trash2, 
  Edit3, 
  ClipboardCopy, 
  Inbox, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  MailQuestion,
  Activity,
  Lock,
  MinusCircle,
  Plus,
  Clock,
  CheckSquare,
  Square,
  QrCode,
  Users,
  CheckCircle
} from "lucide-react";
import { GmailAccount, AccountStatus } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeModal } from "./QRCodeModal";
import { copyToClipboard } from "../utils/clipboard";

interface AccountTableProps {
  accounts: GmailAccount[];
  isLoading: boolean;
  onEdit: (account: GmailAccount) => void;
  onUpdate?: (id: string, updates: Partial<GmailAccount>) => void;
  onDelete: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
  addToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
  onOpenAddModal: () => void;
  variant?: 'dashboard' | 'list';
}

const PeerMeetCell: React.FC<{ 
  account: GmailAccount; 
  onUpdate?: (id: string, updates: Partial<GmailAccount>) => void;
}> = ({ account, onUpdate }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!account.lastPeerMeetAt) return null;
      const last = new Date(account.lastPeerMeetAt).getTime();
      const now = new Date().getTime();
      const diff = 24 * 60 * 60 * 1000 - (now - last);
      return diff > 0 ? diff : null;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(timer);
  }, [account.lastPeerMeetAt]);

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nowStr = new Date().toISOString();
    
    // Set local state immediately for instant feedback
    const last = new Date(nowStr).getTime();
    const now = new Date().getTime();
    const diff = 24 * 60 * 60 * 1000 - (now - last);
    setTimeLeft(diff > 0 ? diff : null);

    if (onUpdate) {
      onUpdate(account.id, { lastPeerMeetAt: nowStr });
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (timeLeft !== null) {
    return (
      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800/30 w-fit">
        <Clock className="w-3.5 h-3.5 animate-pulse" />
        {formatTime(timeLeft)}
      </div>
    );
  }

  return (
    <button
      onClick={handleStart}
      className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all cursor-pointer active:scale-95 w-fit"
    >
      <Users className="w-3.5 h-3.5" />
      Check
    </button>
  );
};

export const AccountTable: React.FC<AccountTableProps> = ({
  accounts,
  isLoading,
  onEdit,
  onUpdate,
  onDelete,
  onDeleteMultiple,
  addToast,
  onOpenAddModal,
  variant = 'list'
}) => {
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // QR Code State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedEmailForQr, setSelectedEmailForQr] = useState("");

  const handleOpenQr = (email: string) => {
    setSelectedEmailForQr(email);
    setQrModalOpen(true);
  };
  const isAllSelected = accounts.length > 0 && selectedIds.length === accounts.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(accounts.map(a => a.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    onDeleteMultiple(selectedIds);
    setSelectedIds([]);
  };

  // Toggle Password Visibility states by account ID
  const [visiblePasswords, setVisiblePasswords] = useState<{ [id: string]: boolean }>({});
  
  // Temporary "copied" status per field for nice 1s micro-animation
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Resilient Clipboard Copier
  const copyText = (text: string, key: string, toastMsg: string) => {
    copyToClipboard(text).then((success) => {
      if (success) {
        addToast(toastMsg, "success");
        setCopiedStates(prev => ({ ...prev, [key]: true }));
        setTimeout(() => {
          setCopiedStates(prev => ({ ...prev, [key]: false }));
        }, 1000);
      } else {
        addToast("Không thể sao chép dữ liệu", "error");
      }
    });
  };

  // Copy individual Email
  const handleCopyEmail = (email: string, id: string) => {
    copyText(email, `email-${id}`, "Đã sao chép Email");
  };

  // Copy individual Password
  const handleCopyPassword = (password: string = "", id: string) => {
    copyText(password, `pass-${id}`, "Đã sao chép mật khẩu");
  };

  // Copy unified Account package
  const handleCopyAccount = (email: string, password: string = "", id: string) => {
    const formatted = `Email:\n${email}\n\nPassword:\n${password}`;
    copyText(formatted, `acc-${id}`, "Đã sao chép tài khoản thành công");
  };

  const shortenEmail = (email: string) => {
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const [name] = parts;
    
    // Truncate name if too long
    const shortName = name.length > 10 ? `${name.substring(0, 7)}...` : name;
    
    return `${shortName}@***`;
  };

  const getEmailColorClass = (account: GmailAccount) => {
    if (account.status === "UNUSED") {
      return "text-amber-500 dark:text-amber-400 font-semibold";
    }
    
    const isChecked = (() => {
      if (!account.lastPeerMeetAt) return false;
      const last = new Date(account.lastPeerMeetAt).getTime();
      const now = new Date().getTime();
      return (now - last) < 24 * 60 * 60 * 1000;
    })();

    if (isChecked) {
      return "text-rose-600 dark:text-rose-400 font-semibold";
    } else {
      return "text-emerald-600 dark:text-emerald-400 font-semibold";
    }
  };

  // Pagination bounds
  const totalPages = Math.ceil(accounts.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAccounts = accounts.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Render Status Badge with beautiful Clean Minimalism style
  const renderStatusBadge = (status: AccountStatus) => {
    switch (status) {
      case AccountStatus.ACTIVE:
        return (
          <span className="minimal-badge minimal-badge-success cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Hoạt động</span>
          </span>
        );
      case AccountStatus.UNUSED:
        return (
          <span className="minimal-badge minimal-badge-warning cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>Chưa sử dụng</span>
          </span>
        );
      case AccountStatus.IN_USE:
        return (
          <span className="minimal-badge minimal-badge-primary cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            <span>Đang sử dụng</span>
          </span>
        );
      case AccountStatus.LOCKED:
        return (
          <span className="minimal-badge minimal-badge-danger cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span>Đã khóa</span>
          </span>
        );
      case AccountStatus.SUSPENDED:
        return (
          <span className="minimal-badge minimal-badge-neutral cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
            <span>Tạm ngưng</span>
          </span>
        );
      default:
        return null;
    }
  };

  // Skeleton Loader for Table
  if (isLoading) {
    return (
      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm overflow-hidden" id="skeleton-table">
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4 animate-pulse"></div>
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-32 animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 items-center">
              <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl flex-1 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Beautiful Empty State
  if (accounts.length === 0) {
    return (
      <div 
        className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 shadow-sm text-center"
        id="empty-table-state"
      >
        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400 shadow-sm">
          <Inbox className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
          Không tìm thấy tài khoản Gmail nào
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed font-medium">
          Dữ liệu của bạn đang trống hoặc từ khóa tìm kiếm không khớp. Hãy thêm tài khoản mới hoặc nhập từ Excel ngay!
        </p>
        <div className="flex gap-3">
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 transition-all cursor-pointer"
            id="empty-add-btn"
          >
            <Plus className="w-4 h-4" />
            Thêm tài khoản mới
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" id="table-master-container">
      {/* DESKTOP DATA TABLE */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="desktop-data-table">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 text-xs font-bold tracking-wider uppercase">
                {variant === 'list' && (
                  <th className="px-6 py-4.5 w-12 text-center">
                    <button 
                      onClick={toggleSelectAll}
                      className="text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-500" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </th>
                )}
                <th className="px-6 py-4.5 w-16 text-center">STT</th>
                <th className="px-6 py-4.5">Địa chỉ Email</th>
                <th className="px-6 py-4.5 w-72">Mật khẩu</th>
                <th className="px-6 py-4.5 w-44">Trạng thái</th>
                <th className="px-6 py-4.5 w-44">Peer meet</th>
                <th className="px-6 py-4.5 w-44">Check gần nhất</th>
                <th className="px-6 py-4.5">Ghi chú</th>
                {variant === 'list' && <th className="px-6 py-4.5 w-40">Ngày thêm</th>}
                <th className="px-6 py-4.5 w-44 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800/60">
              <AnimatePresence mode="popLayout">
                {paginatedAccounts.map((account, index) => {
                  const globalIndex = startIndex + index + 1;
                  const isPassVisible = visiblePasswords[account.id] || false;
                  
                  const isEmailCopied = copiedStates[`email-${account.id}`];
                  const isPassCopied = copiedStates[`pass-${account.id}`];
                  const isAccCopied = copiedStates[`acc-${account.id}`];

                  return (
                    <motion.tr
                      key={account.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      className={`group hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors ${variant === 'list' && selectedIds.includes(account.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                      id={`row-${account.id}`}
                    >
                      {/* Selection Column */}
                      {variant === 'list' && (
                        <td className="px-6 py-5 text-center">
                          <button 
                            onClick={() => toggleSelect(account.id)}
                            className="text-slate-400 hover:text-blue-500 transition-colors"
                          >
                            {selectedIds.includes(account.id) ? (
                              <CheckSquare className="w-5 h-5 text-blue-500" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                      )}
                      {/* Index Column */}
                      <td className="px-6 py-5 text-center font-mono text-xs font-bold text-slate-400 dark:text-slate-500">
                        {globalIndex}
                      </td>

                      {/* Email Column */}
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-between gap-2 max-w-[280px]">
                          <span 
                            className={`text-sm select-all ${getEmailColorClass(account)}`}
                            title={account.email}
                          >
                            {shortenEmail(account.email)}
                          </span>
                          <button
                            onClick={() => handleCopyEmail(account.email, account.id)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              isEmailCopied 
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                                : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                            title="Sao chép Email"
                            id={`copy-email-btn-${account.id}`}
                          >
                            {isEmailCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Password Column */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs tracking-wider text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800 min-w-[130px] select-all">
                            {isPassVisible ? account.password : "•••••••••••"}
                          </span>
                          
                          {/* Toggle visibility */}
                          <button
                            onClick={() => togglePasswordVisibility(account.id)}
                            className="p-1.5 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 cursor-pointer"
                            id={`toggle-pass-btn-${account.id}`}
                            title={isPassVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                          >
                            {isPassVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>

                          {/* Copy password */}
                          <button
                            onClick={() => handleCopyPassword(account.password, account.id)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              isPassCopied 
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                                : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            }`}
                            title="Sao chép Mật khẩu"
                            id={`copy-pass-btn-${account.id}`}
                          >
                            {isPassCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="px-6 py-5">
                        {renderStatusBadge(account.status)}
                      </td>

                      {/* Peer Meet Column */}
                      <td className="px-6 py-5">
                        <PeerMeetCell account={account} onUpdate={onUpdate} />
                      </td>

                      {/* Check gần nhất Column */}
                      <td className="px-6 py-5">
                        {account.lastPeerMeetAt ? (
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                {new Date(account.lastPeerMeetAt).toLocaleDateString('vi-VN')}
                              </span>
                              <span className="text-[10px] opacity-70 font-medium">
                                {new Date(account.lastPeerMeetAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">—</span>
                        )}
                      </td>

                      {/* Notes Column */}
                      <td className="px-6 py-5">
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[220px] truncate font-medium" title={account.note}>
                          {account.note || "—"}
                        </p>
                      </td>

                      {/* CreatedAt Column */}
                      {variant === 'list' && (
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                {account.createdAt ? new Date(account.createdAt).toLocaleDateString('vi-VN') : '—'}
                              </span>
                              <span className="text-[10px] opacity-70">
                                {account.createdAt ? new Date(account.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Action Triggers */}
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Copy full account info button */}
                          <button
                            onClick={() => handleCopyAccount(account.email, account.password, account.id)}
                            className={`p-1.5 rounded-xl border text-xs font-semibold shadow-sm transition-all cursor-pointer ${
                              isAccCopied 
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-50/20"
                            }`}
                            id={`copy-full-btn-${account.id}`}
                            title="Sao chép toàn bộ"
                          >
                            <ClipboardCopy className="w-4 h-4" />
                          </button>

                          {/* QR Code button */}
                          <button
                            onClick={() => handleOpenQr(account.email)}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/30 hover:bg-blue-50/20 transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-sm"
                            title="Tạo mã QR"
                            id={`qr-btn-${account.id}`}
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          {/* Edit button */}
                          <button
                            onClick={() => onEdit(account)}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/5 hover:border-blue-500/20 transition-all cursor-pointer"
                            title="Chỉnh sửa tài khoản"
                            id={`edit-btn-${account.id}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => onDelete(account.id)}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/5 hover:border-rose-500/20 transition-all cursor-pointer"
                            title="Xóa tài khoản"
                            id={`delete-btn-${account.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE ACCOUNT CARD LIST */}
      <div className="block md:hidden space-y-4" id="mobile-data-cards">
        <AnimatePresence mode="popLayout">
          {paginatedAccounts.map((account, index) => {
            const isPassVisible = visiblePasswords[account.id] || false;
            const isEmailCopied = copiedStates[`email-${account.id}`];
            const isPassCopied = copiedStates[`pass-${account.id}`];
            const isAccCopied = copiedStates[`acc-${account.id}`];

            return (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white dark:bg-slate-900 border border-slate-200/85 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4 relative transition-all ${variant === 'list' && selectedIds.includes(account.id) ? 'border-blue-500/50 bg-blue-50/20 dark:bg-blue-900/10' : ''}`}
                id={`card-${account.id}`}
              >
                {/* Mobile Selection Overlay Checkbox */}
                {variant === 'list' && (
                  <button 
                    onClick={() => toggleSelect(account.id)}
                    className="absolute top-4 right-4 z-10 p-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
                  >
                    {selectedIds.includes(account.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300" />
                    )}
                  </button>
                )}

                {/* Mobile Header Block */}
                <div className={`flex items-center justify-between ${variant === 'list' ? 'pr-10' : ''}`}>
                  <div className="flex flex-col gap-2">
                    {renderStatusBadge(account.status)}
                    {variant === 'list' && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                        <Clock className="w-3 h-3" />
                        {account.createdAt ? new Date(account.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenQr(account.email)}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-blue-500 transition-colors shadow-sm"
                      title="Tạo mã QR"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(account)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-500 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                      id={`mobile-edit-btn-${account.id}`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(account.id)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-500 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                      id={`mobile-delete-btn-${account.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Email Section */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Địa chỉ Email</span>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850">
                    <span 
                      className={`text-sm select-all ${getEmailColorClass(account)}`}
                      title={account.email}
                    >
                      {shortenEmail(account.email)}
                    </span>
                    <button
                      onClick={() => handleCopyEmail(account.email, account.id)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center ${
                        isEmailCopied 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                      }`}
                      id={`mobile-copy-email-${account.id}`}
                    >
                      {isEmailCopied ? <Check className="w-4.5 h-4.5" /> : <Copy className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Password Section */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Mật khẩu</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                      <span className="font-mono text-sm tracking-widest text-slate-800 dark:text-slate-200 select-all">
                        {isPassVisible ? account.password : "•••••••••••"}
                      </span>
                    </div>
                    <button
                      onClick={() => togglePasswordVisibility(account.id)}
                      className="px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 min-h-[44px] cursor-pointer bg-white dark:bg-slate-900"
                      id={`mobile-toggle-pass-${account.id}`}
                      title={isPassVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {isPassVisible ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                    <button
                      onClick={() => handleCopyPassword(account.password, account.id)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center ${
                        isPassCopied 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                      }`}
                      id={`mobile-copy-pass-${account.id}`}
                    >
                      {isPassCopied ? <Check className="w-4.5 h-4.5" /> : <Copy className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Account Details & Note */}
                {account.note && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-850 text-xs text-slate-500 dark:text-slate-400 leading-normal font-medium">
                    <span className="font-semibold block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Ghi chú:</span>
                    {account.note}
                  </div>
                )}

                {/* Peer Meet check */}
                <div className="flex flex-col gap-2.5 p-3.5 bg-indigo-50/20 dark:bg-indigo-950/10 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Peer meet:</span>
                    <PeerMeetCell account={account} onUpdate={onUpdate} />
                  </div>
                  {account.lastPeerMeetAt && (
                    <div className="flex items-center justify-between border-t border-indigo-100/20 dark:border-indigo-900/20 pt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-400 uppercase tracking-wider text-[9px]">Check gần nhất:</span>
                      <span className="font-mono font-bold">
                        {new Date(account.lastPeerMeetAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'medium' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Combined Copy Profile */}
                <button
                  onClick={() => handleCopyAccount(account.email, account.password, account.id)}
                  className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border text-sm font-bold shadow-sm transition-all cursor-pointer min-h-[44px] ${
                    isAccCopied 
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400" 
                      : "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-md shadow-blue-600/15"
                  }`}
                  id={`mobile-copy-full-${account.id}`}
                >
                  <ClipboardCopy className="w-4 h-4" />
                  <span>Copy Account (Email + Pass)</span>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-2" id="table-pagination-nav">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Hiển thị <span className="font-bold text-slate-700 dark:text-slate-200">{startIndex + 1}</span> - <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(startIndex + itemsPerPage, accounts.length)}</span> trên <span className="font-bold text-slate-700 dark:text-slate-200">{accounts.length}</span> tài khoản
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-all min-h-[38px] min-w-[38px] flex items-center justify-center"
              id="pagination-prev-btn"
              title="Trang trước"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                // Simple slice to avoid rendering too many buttons on lots of pages
                if (totalPages > 5 && Math.abs(currentPage - pageNum) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="px-1 text-slate-400">...</span>;
                  }
                  return null;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/10"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800"
                    }`}
                    id={`pagination-page-${pageNum}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-all min-h-[38px] min-w-[38px] flex items-center justify-center"
              id="pagination-next-btn"
              title="Trang tiếp theo"
            >
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {variant === 'list' && selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 px-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-2xl shadow-slate-900/40 border border-slate-800 dark:border-slate-200"
          >
            <div className="flex items-center gap-3 pr-6 border-r border-slate-700 dark:border-slate-300">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                {selectedIds.length}
              </div>
              <span className="text-sm font-bold tracking-tight">Đang chọn</span>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Xóa hàng loạt
              </button>
              <button 
                onClick={() => setSelectedIds([])}
                className="px-4 py-2 hover:bg-white/10 dark:hover:bg-slate-100 rounded-xl text-sm font-bold transition-all cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <QRCodeModal 
        isOpen={qrModalOpen} 
        email={selectedEmailForQr} 
        onClose={() => setQrModalOpen(false)} 
      />
    </div>
  );
};
