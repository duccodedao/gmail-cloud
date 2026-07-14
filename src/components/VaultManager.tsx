import React, { useState } from "react";
import { 
  Shield, 
  Search, 
  Plus, 
  Globe, 
  User, 
  Lock, 
  ExternalLink, 
  Copy, 
  Check, 
  MoreVertical,
  Edit2,
  Trash2,
  FileText,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { VaultItem } from "../types";

interface VaultManagerProps {
  items: VaultItem[];
  onAdd: () => void;
  onEdit: (item: VaultItem) => void;
  onDelete: (id: string) => void;
  addToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

export const VaultManager: React.FC<VaultManagerProps> = ({
  items,
  onAdd,
  onEdit,
  onDelete,
  addToast
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredItems = items.filter(item => 
    item.webName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.account.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.note || "").toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleCopy = (text: string, id: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(`${id}-${type}`);
    addToast(`Đã sao chép ${type}`, "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm tài khoản, website..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>
        <button
          onClick={onAdd}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4.5 h-4.5" />
          Lưu trữ mới
        </button>
      </div>

      {/* Vault Table Container */}
      <div className="relative group" id="vault-table-container">
        {/* Decorative Background Blur */}
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>

        <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-[1.5rem] shadow-sm shadow-slate-200/40 dark:shadow-none">
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full text-left border-collapse min-w-[800px]" id="vault-data-table">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/40 border-b border-slate-200/60 dark:border-slate-800/60">
                  <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[25%]">
                    Website / Dịch vụ
                  </th>
                  <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[25%]">
                    Tài khoản
                  </th>
                  <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-[25%]">
                    Mật khẩu
                  </th>
                  <th className="px-6 py-4.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right w-[25%]">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item) => (
                    <motion.tr
                      layout
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group/row hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-all duration-200"
                    >
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3.5">
                          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/20 dark:border-indigo-800/20 shrink-0">
                            <Globe className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate leading-none mb-1">
                              {item.webName}
                            </span>
                            {item.webLink ? (
                              <a 
                                href={item.webLink} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                              >
                                {new URL(item.webLink).hostname}
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vault Storage</span>
                            )}
                          </div>
                        </div>
                      </td>

                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-2 group/btn">
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                            {item.account.includes('@') ? (() => {
                              const [name] = item.account.split('@');
                              const shortName = name.length > 10 ? `${name.substring(0, 7)}...` : name;
                              return `${shortName}@***`;
                            })() : item.account}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleCopy(item.account, item.id, "tài khoản")}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all opacity-0 group-hover/btn:opacity-100 cursor-pointer"
                            title="Sao chép tài khoản"
                          >
                            {copiedId === `${item.id}-tài khoản` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-2 group/btn">
                          <span className="text-sm font-mono font-bold text-slate-400 dark:text-slate-600 tracking-tighter">
                            ••••••••
                          </span>
                          <button 
                            onClick={() => handleCopy(item.password || "", item.id, "mật khẩu")}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all opacity-0 group-hover/btn:opacity-100 cursor-pointer"
                            title="Sao chép mật khẩu"
                          >
                            {copiedId === `${item.id}-mật khẩu` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4.5">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          <button 
                            onClick={() => onEdit(item)}
                            className="p-2 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800 transition-all shadow-sm"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onDelete(item.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/40 border border-transparent hover:border-rose-100 dark:hover:border-rose-800 transition-all shadow-sm"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {filteredItems.length === 0 && (
            <div className="py-24 flex flex-col items-center justify-center bg-slate-50/40 dark:bg-slate-950/20">
              <div className="p-6 rounded-[2rem] bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none mb-6">
                <Shield className="w-12 h-12 text-slate-200 dark:text-slate-800" />
              </div>
              <h3 className="text-slate-800 dark:text-white font-bold text-lg">Trống rỗng</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">
                Bắt đầu lưu trữ bảo mật ngay
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
