import React, { useEffect, useState } from "react";
import { Globe, AlertTriangle, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { getAvailableDomains } from "../../services/tempEmailService";
import { domainStatusRepo, domainReportsRepo } from "../../lib/firebase";
import { DomainStatus, DomainReport } from "../../types";
import { motion } from "motion/react";

interface DomainManagementProps {
  addToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
}

export const DomainManagement: React.FC<DomainManagementProps> = ({ addToast }) => {
  const [domains, setDomains] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<DomainStatus[]>([]);
  const [reports, setReports] = useState<DomainReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeStatus: () => void;
    let unsubscribeReports: () => void;

    const loadData = async () => {
      try {
        const fetchedDomains = await getAvailableDomains();
        setDomains(fetchedDomains);
      } catch (err) {
        addToast("Không thể tải danh sách domains", "error");
      }
      
      unsubscribeStatus = domainStatusRepo.subscribe((data) => setStatuses(data));
      unsubscribeReports = domainReportsRepo.subscribe((data) => setReports(data));
      setLoading(false);
    };

    loadData();

    return () => {
      if (unsubscribeStatus) unsubscribeStatus();
      if (unsubscribeReports) unsubscribeReports();
    };
  }, []);

  const toggleDomainStatus = async (domain: string) => {
    const current = statuses.find(s => s.domain === domain);
    const isWorking = current ? !current.isWorking : false;
    try {
      await domainStatusRepo.setStatus(domain, isWorking);
      addToast(`Đã đánh dấu domain ${domain} là ${isWorking ? "Hoạt động" : "Lỗi"}`, "success");
    } catch (err) {
      addToast("Có lỗi khi cập nhật trạng thái", "error");
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await domainReportsRepo.delete(id);
      addToast("Đã xóa báo cáo", "success");
    } catch (err) {
      addToast("Không thể xóa báo cáo", "error");
    }
  };

  if (loading) return <div>Đang tải thông tin domains...</div>;

  return (
    <div className="space-y-8 mt-12">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2 tracking-tight">
            <Globe className="w-6 h-6 text-indigo-500" />
            Quản Lý Tên Miền (Domains)
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
            Đánh dấu trạng thái hoạt động của các domain để người dùng biết
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {domains.map(domain => {
            const status = statuses.find(s => s.domain === domain);
            const isWorking = status ? status.isWorking : true; // default to true
            return (
              <div key={domain} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{domain}</span>
                <button
                  onClick={() => toggleDomainStatus(domain)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    isWorking 
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20" 
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                  }`}
                >
                  {isWorking ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {isWorking ? "Hoạt động" : "Đang lỗi"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2 tracking-tight">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Báo Cáo Lỗi Từ Người Dùng
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
            Các báo cáo về việc không nhận được email trên các domain cụ thể
          </p>
        </div>

        {reports.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Hiện không có báo cáo lỗi nào.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Họ tên</th>
                    <th className="px-6 py-4">Gmail báo cáo</th>
                    <th className="px-6 py-4">Tên miền</th>
                    <th className="px-6 py-4">Nội dung</th>
                    <th className="px-6 py-4">Thời gian</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-sm">
                        {report.userName}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                        {report.userEmail}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                          {report.domain}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-slate-300 text-sm max-w-[200px] truncate">
                        {report.note}
                      </td>
                      <td className="px-6 py-4 text-slate-400 dark:text-slate-500 text-xs font-medium">
                        {new Date(report.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => deleteReport(report.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer inline-flex items-center justify-center"
                          title="Xóa báo cáo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
