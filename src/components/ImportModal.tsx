import React, { useState, useRef } from "react";
import { 
  X, 
  UploadCloud, 
  Download, 
  Check, 
  AlertTriangle, 
  FileText, 
  PlayCircle,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import { GmailAccount, AccountStatus } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (accounts: Omit<GmailAccount, "id" | "createdAt" | "updatedAt">[]) => Promise<void>;
  addToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
  existingEmails: string[];
}

interface ParsedAccount {
  email: string;
  password?: string;
  status: AccountStatus;
  note?: string;
  isValid: boolean;
  error?: string;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  addToast,
  existingEmails
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedAccount[]>([]);
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);

    import("xlsx").then((XLSX) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
          parseExcelData(json);
        } catch (err) {
          console.error(err);
          addToast("Lỗi định dạng tệp tin Excel/CSV", "error");
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        addToast("Không thể đọc file này", "error");
        setIsProcessing(false);
      };
      reader.readAsArrayBuffer(file);
    }).catch(err => {
      console.error(err);
      addToast("Lỗi tải thư viện xử lý Excel", "error");
      setIsProcessing(false);
    });
  };

  const parseExcelData = (rows: string[][]) => {
    try {
      const results: ParsedAccount[] = [];
      
      let startIndex = 0;
      if (rows.length > 0 && rows[0].length > 0) {
        const firstCell = String(rows[0][0]).toLowerCase();
        if (firstCell.includes("email") || firstCell.includes("username") || firstCell.includes("mail")) {
          startIndex = 1;
        }
      }

      const seenEmails = new Set<string>();

      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        const email = String(row[0] || "").trim();
        const password = String(row[1] || "").trim();
        const rawStatus = String(row[2] || "").toUpperCase().trim();
        const note = String(row[3] || "").trim();

        if (!email && !password) continue;

        let finalStatus = AccountStatus.UNUSED;
        if (rawStatus.includes("ACTIVE") || rawStatus.includes("HOẠT") || rawStatus.includes("ĐỘNG")) {
          finalStatus = AccountStatus.ACTIVE;
        } else if (rawStatus.includes("UNUSED") || rawStatus.includes("CHƯA")) {
          finalStatus = AccountStatus.UNUSED;
        } else if (rawStatus.includes("IN_USE") || rawStatus.includes("ĐANG")) {
          finalStatus = AccountStatus.IN_USE;
        } else if (rawStatus.includes("LOCKED") || rawStatus.includes("KHÓA")) {
          finalStatus = AccountStatus.LOCKED;
        } else if (rawStatus.includes("SUSPENDED") || rawStatus.includes("NGƯNG")) {
          finalStatus = AccountStatus.SUSPENDED;
        }

        const gmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const isEmailValid = gmailRegex.test(email);
        const isPassValid = password.length >= 6;
        let isValid = true;
        let error = "";

        if (!isEmailValid) {
          isValid = false;
          error = "Sai định dạng Email";
        } else if (!isPassValid) {
          isValid = false;
          error = "Mật khẩu < 6 kí tự";
        } else if (existingEmails.includes(email)) {
          isValid = false;
          error = "Email đã tồn tại";
        } else if (seenEmails.has(email)) {
          isValid = false;
          error = "Email bị trùng lặp trong file";
        }

        if (isEmailValid) {
          seenEmails.add(email);
        }

        results.push({
          email,
          password,
          status: finalStatus,
          note: note || `Nhập từ file ${fileName}`,
          isValid,
          error
        });
      }

      setParsedData(results);
      addToast(`Đã phân tích thành công ${results.length} dòng`, "info");
    } catch (err) {
      console.error(err);
      addToast("Lỗi cấu trúc dữ liệu tệp tin", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSample = () => {
    import("xlsx").then((XLSX) => {
      const sampleData = [
        ["Email", "Mật Khẩu", "Trạng Thái", "Ghi Chú"],
        ["nguyenvan.sample@gmail.com", "SecurePass123!", "Hoạt động", "Tài khoản mẫu hoạt động"],
        ["tranbinh.sample@gmail.com", "SamplePass99*", "Chưa sử dụng", "Chưa sử dụng"],
        ["lethi.sample@gmail.com", "PassLeThi8899", "Đã bị khóa", "Bị khóa bảo mật"]
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Tài khoản mẫu");

      XLSX.writeFile(workbook, "gmail_cloud_sample_template.xlsx");
      addToast("Đã tải xuống file Excel mẫu thành công", "success");
    }).catch(err => {
      console.error(err);
      addToast("Lỗi khi tải thư viện xuất file", "error");
    });
  };

  const handleConfirmImport = async () => {
    const validAccounts = parsedData.filter(d => d.isValid).map(d => ({
      email: d.email,
      password: d.password || "",
      status: d.status,
      note: d.note || ""
    }));

    if (validAccounts.length === 0) {
      addToast("Không có tài khoản hợp lệ để nhập", "warning");
      return;
    }

    setIsProcessing(true);
    try {
      await onImport(validAccounts);
      addToast(`Nhập thành công ${validAccounts.length} tài khoản Gmail`, "success");
      onClose();
      // reset state
      setParsedData([]);
      setFileName("");
    } catch (err) {
      console.error(err);
      addToast("Lỗi trong quá trình lưu dữ liệu bulk", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedData.filter(d => d.isValid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" id="import-modal-portal">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
            id="import-backdrop"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
            id="import-modal-card"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Import Gmail từ Excel</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                    Nhập danh sách tài khoản bằng file Excel (.xlsx, .xls)
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                id="close-import-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Actions Header Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Sử dụng đúng cấu trúc file để đảm bảo hệ thống đọc chính xác:
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/5 transition-all cursor-pointer min-h-[40px]"
                  id="download-template-btn"
                >
                  <Download className="w-4 h-4" />
                  Tải file Excel mẫu
                </button>
              </div>

              {/* Drag and Drop File Input Area */}
              {parsedData.length === 0 ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center p-8 rounded-3xl border-2 border-dashed transition-all cursor-pointer text-center min-h-[220px] ${
                    dragActive
                      ? "border-blue-500 bg-blue-500/5"
                      : "border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/20"
                  }`}
                  id="drag-drop-zone"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInput}
                    accept=".xlsx,.xls"
                    className="hidden"
                    id="import-file-input"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-sm">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Kéo thả file Excel vào đây hoặc click để duyệt file
                  </h4>
                  <p className="text-xs text-slate-400 mt-1.5 font-medium max-w-sm leading-relaxed">
                    Chỉ hỗ trợ tệp định dạng Excel (.xlsx, .xls)
                  </p>
                </div>
              ) : (
                /* Selected File Header */
                <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-md">{fileName}</p>
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider mt-0.5">
                        Đã phân tích tệp tin
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setParsedData([]);
                      setFileName("");
                    }}
                    className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-850 text-slate-500 transition-colors cursor-pointer"
                    title="Hủy file này"
                    id="cancel-selected-file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Data Preview Panel */}
              {parsedData.length > 0 && (
                <div className="space-y-4" id="data-preview-panel">
                  {/* Stats Highlights */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng Số Dòng</span>
                      <span className="text-xl font-bold text-slate-800 dark:text-white mt-0.5 block">{parsedData.length}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
                      <span className="block text-[10px] font-bold text-emerald-600/80 dark:text-emerald-400 uppercase tracking-wider">Hợp Lệ (Có Thể Nhập)</span>
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{validCount}</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/15">
                      <span className="block text-[10px] font-bold text-rose-600/80 dark:text-rose-400 uppercase tracking-wider">Không Hợp Lệ (Bỏ Qua)</span>
                      <span className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">{invalidCount}</span>
                    </div>
                  </div>

                  {/* Preview Table Container */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                          <th className="px-4 py-2.5 w-12 text-center">STT</th>
                          <th className="px-4 py-2.5">Email</th>
                          <th className="px-4 py-2.5">Mật Khẩu</th>
                          <th className="px-4 py-2.5">Trạng Thái</th>
                          <th className="px-4 py-2.5 text-right">Trạng Thái File</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                        {parsedData.map((data, idx) => (
                          <tr key={idx} className={data.isValid ? "" : "bg-rose-500/5 dark:bg-rose-500/10"}>
                            <td className="px-4 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                              {data.email}
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-mono truncate max-w-[120px]">{data.password}</td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-semibold ${data.status === AccountStatus.ACTIVE ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                {data.status === AccountStatus.ACTIVE ? "Hoạt động" : "Chưa sử dụng"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {data.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                  <Check className="w-3.5 h-3.5" /> Hợp lệ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-500 font-semibold" title={data.error}>
                                  <AlertCircle className="w-3.5 h-3.5" /> {data.error}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between px-6 py-5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <span className="text-[11px] font-medium text-slate-400">
                {parsedData.length > 0 ? "Vui lòng kiểm tra kỹ dữ liệu xem trước." : "Vui lòng chọn hoặc kéo thả tệp tin."}
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl text-sm font-bold border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer transition-all active:scale-98 min-h-[44px]"
                  id="import-cancel-btn"
                >
                  Đóng lại
                </button>
                {parsedData.length > 0 && (
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={isProcessing || validCount === 0}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-500/50 text-white shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 cursor-pointer transition-all active:scale-98 min-h-[44px]"
                    id="import-submit-btn"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4.5 h-4.5" />
                        <span>Đồng ý nhập ({validCount})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
