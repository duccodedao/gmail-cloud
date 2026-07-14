import React, { useState, useEffect } from "react";
import { X, Shield, User, Lock, Globe, FileText, Save } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { VaultItem } from "../types";

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<VaultItem>) => void;
  initialData?: VaultItem | null;
}

export const VaultModal: React.FC<VaultModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [formData, setFormData] = useState<Partial<VaultItem>>({
    account: "",
    password: "",
    webName: "",
    webLink: "",
    note: ""
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        account: "",
        password: "",
        webName: "",
        webLink: "",
        note: ""
      });
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.account || !formData.webName) return;
    onSave(formData);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl pointer-events-auto overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {initialData ? "Chỉnh sửa tài khoản" : "Lưu trữ tài khoản mới"}
                      </h3>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Web Credentials Vault</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 px-1">
                        <Globe className="w-3 h-3" />
                        Tên Website <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.webName}
                        onChange={(e) => setFormData({ ...formData, webName: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 dark:text-white font-medium"
                        placeholder="VD: Facebook, Google..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 px-1">
                        <User className="w-3 h-3" />
                        Tài khoản <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.account}
                        onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 dark:text-white font-medium"
                        placeholder="Email hoặc Username"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 px-1">
                        <Lock className="w-3 h-3" />
                        Mật khẩu
                      </label>
                      <input
                        type="text"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 dark:text-white font-medium"
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 px-1">
                        <Globe className="w-3 h-3 text-emerald-500" />
                        Link Website
                      </label>
                      <input
                        type="url"
                        value={formData.webLink}
                        onChange={(e) => setFormData({ ...formData, webLink: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800 dark:text-white font-medium"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 px-1">
                      <FileText className="w-3 h-3" />
                      Ghi chú thêm
                    </label>
                    <textarea
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 dark:text-white font-medium h-24 resize-none"
                      placeholder="Ghi chú về tài khoản này..."
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-3.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      <Save className="w-4 h-4" />
                      {initialData ? "Lưu thay đổi" : "Lưu vào kho"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
