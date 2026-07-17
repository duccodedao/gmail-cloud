import React, { useState, useEffect } from "react";
import { 
  AlertCircle, 
  Trash2, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Search,
  Filter,
  Clock,
  User,
  Monitor
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { errorLogsRepo } from "../../lib/firebase";

interface ErrorLog {
  id: string;
  message: string;
  source: string;
  stack?: string;
  context?: any;
  userEmail?: string;
  createdAt: string;
}

const ErrorLogs: React.FC = () => {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSource, setFilterSource] = useState<string>("all");

  useEffect(() => {
    const unsubscribe = errorLogsRepo.subscribe((data) => {
      setLogs(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc muốn xóa lỗi này?")) {
      await errorLogsRepo.delete(id);
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("Bạn có chắc muốn xóa TẤT CẢ lỗi?")) {
      await errorLogsRepo.clearAll();
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSource = filterSource === "all" || log.source === filterSource;
    return matchesSearch && matchesSource;
  });

  const sources = Array.from(new Set(logs.map(l => l.source)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Nhật ký Lỗi (Error Logs)
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Theo dõi và quản lý tất cả các lỗi xảy ra trong hệ thống.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLoading(true)}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Làm mới"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleClearAll}
            disabled={logs.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Xóa tất cả
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm lỗi hoặc người dùng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
          >
            <option value="all">Tất cả nguồn</option>
            {sources.map(src => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Đang tải nhật ký lỗi...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Không tìm thấy lỗi nào</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Hệ thống của bạn đang hoạt động ổn định.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredLogs.map((log) => (
              <div key={log.id} className="group">
                <div 
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  className="p-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                >
                  <div className="mt-1">
                    <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-500">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {log.message}
                      </h3>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded uppercase">
                        {log.source}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </div>
                      {log.userEmail && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <User className="w-3 h-3" />
                          {log.userEmail}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(log.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedId === log.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === log.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800"
                    >
                      <div className="p-4 space-y-4">
                        {log.stack && (
                          <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Stack Trace</h4>
                            <pre className="p-3 bg-gray-900 text-gray-300 text-[11px] font-mono rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed">
                              {log.stack}
                            </pre>
                          </div>
                        )}
                        
                        {log.context && Object.keys(log.context).length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Context Data</h4>
                            <pre className="p-3 bg-gray-900 text-gray-300 text-[11px] font-mono rounded-lg overflow-x-auto">
                              {JSON.stringify(log.context, null, 2)}
                            </pre>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-800">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">ID Lỗi</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">{log.id}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Nguồn</p>
                            <div className="flex items-center justify-end gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                              <Monitor className="w-3 h-3" />
                              {log.source === "client" ? "Trình duyệt" : log.source}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorLogs;
