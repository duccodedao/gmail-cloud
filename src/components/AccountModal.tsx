import React, { useState, useEffect } from "react";
import { X, Mail, Key, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { GmailAccount, AccountStatus } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: Omit<GmailAccount, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  editingAccount: GmailAccount | null;
  addToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
  existingEmails: string[];
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingAccount,
  addToast,
  existingEmails
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<AccountStatus>(AccountStatus.UNUSED);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Validations states
  const [emailError, setEmailError] = useState("");
  const [passError, setPassError] = useState("");

  useEffect(() => {
    if (editingAccount) {
      setEmail(editingAccount.email);
      setPassword(editingAccount.password || "");
      setStatus(editingAccount.status);
      setNote(editingAccount.note || "");
    } else {
      // Clear inputs for Add Mode
      setEmail("");
      setPassword("Slhd1133#");
      setStatus(AccountStatus.UNUSED);
      setNote("");
    }
    // Clear errors
    setEmailError("");
    setPassError("");
  }, [editingAccount, isOpen]);

  const validateEmail = (val: string) => {
    if (!val) {
      setEmailError("Email không được để trống");
      return false;
    }
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!gmailRegex.test(val)) {
      setEmailError("Định dạng email không hợp lệ");
      return false;
    }
    if (!editingAccount && existingEmails.includes(val)) {
      setEmailError("Email đã tồn tại trong hệ thống");
      return false;
    }
    if (editingAccount && editingAccount.email !== val && existingEmails.includes(val)) {
      setEmailError("Email đã tồn tại trong hệ thống");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (val: string) => {
    if (!val) {
      setPassError("Mật khẩu không được để trống");
      return false;
    }
    if (val.length < 6) {
      setPassError("Mật khẩu tối thiểu phải từ 6 ký tự");
      return false;
    }
    setPassError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isEmailValid = validateEmail(email);
    const isPassValid = validatePassword(password);

    if (!isEmailValid || !isPassValid) {
      addToast("Vui lòng kiểm tra lại thông tin nhập liệu", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        email: email.trim(),
        password,
        status,
        note: note.trim()
      });
      onClose();
    } catch (err) {
      console.error(err);
      addToast("Lỗi khi lưu tài khoản", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="account-modal-portal">
          {/* Blur Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
            id="modal-backdrop"
          />

          {/* Modal Content Frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden z-10"
            id="modal-card"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    {editingAccount ? "Chỉnh sửa tài khoản" : "Thêm tài khoản mới"}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                    {editingAccount ? "Cập nhật dữ liệu Gmail" : "Đăng ký Gmail mới vào hệ thống"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                aria-label="Close modal"
                id="close-modal-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Email Address Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Địa chỉ Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) validateEmail(e.target.value);
                    }}
                    onBlur={() => validateEmail(email)}
                    placeholder="example@gmail.com"
                    className={`w-full px-4 py-3 rounded-xl text-sm border bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none transition-all ${
                      emailError 
                        ? "border-rose-500/55 bg-rose-500/5 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10" 
                        : "border-slate-200 dark:border-slate-800 focus:border-[#4285F4] dark:focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/10"
                    }`}
                    id="modal-email-input"
                  />
                  {emailError && (
                    <div className="absolute right-3 top-3.5 flex items-center gap-1 text-rose-500">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  )}
                </div>
                {emailError && (
                  <p className="text-[11px] text-rose-500 font-semibold">{emailError}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-400" />
                  Mật khẩu Gmail <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passError) validatePassword(e.target.value);
                    }}
                    onBlur={() => validatePassword(password)}
                    placeholder="Nhập mật khẩu..."
                    className={`w-full px-4 py-3 rounded-xl text-sm border bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none transition-all ${
                      passError 
                        ? "border-rose-500/55 bg-rose-500/5 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10" 
                        : "border-slate-200 dark:border-slate-800 focus:border-[#4285F4] dark:focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/10"
                    }`}
                    id="modal-pass-input"
                  />
                  {passError && (
                    <div className="absolute right-3 top-3.5 flex items-center gap-1 text-rose-500">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  )}
                </div>
                {passError && (
                  <p className="text-[11px] text-rose-500 font-semibold">{passError}</p>
                )}
              </div>

              {/* Status Select Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Trạng thái Hoạt động
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AccountStatus)}
                  className="w-full px-4 py-3 rounded-xl text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#4285F4] dark:focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/10 transition-all cursor-pointer"
                  id="modal-status-select"
                >
                  <option value={AccountStatus.ACTIVE}>Hoạt động</option>
                  <option value={AccountStatus.UNUSED}>Chưa sử dụng</option>
                  <option value={AccountStatus.IN_USE}>Đang sử dụng</option>
                  <option value={AccountStatus.LOCKED}>Đã khóa</option>
                  <option value={AccountStatus.SUSPENDED}>Tạm ngưng</option>
                </select>
              </div>

              {/* Note / Description Textarea Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Ghi chú tài khoản
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Thêm mô tả, phân loại, hoặc thông tin 2FA..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#4285F4] dark:focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/10 transition-all resize-none"
                  id="modal-note-input"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer transition-all active:scale-98 min-h-[44px]"
                  id="modal-cancel-btn"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500/70 text-white shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 cursor-pointer transition-all active:scale-98 min-h-[44px]"
                  id="modal-submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Lưu lại</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
