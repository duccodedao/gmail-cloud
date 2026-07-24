import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw, 
  Inbox, 
  Trash2, 
  Clock, 
  User, 
  ChevronRight, 
  ChevronLeft,
  X, 
  Paperclip, 
  Download, 
  Mail,
  Sliders,
  Globe,
  AlertCircle,
  HelpCircle,
  PlusCircle,
  CheckCircle2,
  History,
  BarChart3,
  Database,
  Search,
  XCircle,
  Key
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  generateTempEmail, 
  fetchMessages, 
  fetchMessageDetails, 
  deleteMessage, 
  getAvailableDomains,
  TempEmailMessage,
  GeneratedEmailInfo
} from "../services/tempEmailService";
import { GmailAccount, AccountStatus, AllowedUser } from "../types";
import { auth, domainReportsRepo, domainStatusRepo, tempEmailsLogRepo, tempEmailHistoryRepo } from "../lib/firebase";
import { sendSignInLinkToEmail } from "firebase/auth";
import { extractOTP } from "../utils/otp";
import { copyToClipboard } from "../utils/clipboard";

interface TempEmailViewProps {
  addToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
  onAddAccount?: (payload: Omit<GmailAccount, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  existingEmails?: string[];
  userProfile: AllowedUser | null;
}

export const TempEmailView: React.FC<TempEmailViewProps> = ({ addToast, onAddAccount, existingEmails, userProfile }) => {
  const [emailInfo, setEmailInfo] = useState<GeneratedEmailInfo | null>(null);
  const [customPrefix, setCustomPrefix] = useState<string>("");
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [emailMode] = useState<"real">("real");
  
  const [messages, setMessages] = useState<TempEmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<TempEmailMessage | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(10);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"html" | "text">("html");
  const [isAddingToDashboard, setIsAddingToDashboard] = useState<boolean>(false);
  const [isSendingTestMail, setIsSendingTestMail] = useState<boolean>(false);
  const [accountNote, setAccountNote] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [domainStatuses, setDomainStatuses] = useState<any[]>([]);
  const [emailHistory, setEmailHistory] = useState<Array<{
    email: string;
    login: string;
    domain: string;
    generatedAt: string;
    addedToDashboard: boolean;
    note?: string;
  }>>(() => {
    try {
      const savedLocal = localStorage.getItem("temp_email_history_local");
      if (savedLocal) {
        return JSON.parse(savedLocal);
      }
    } catch (e) {
      console.error("Failed to load local email history", e);
    }
    return [];
  });

  // Sync email history to localStorage whenever it updates
  useEffect(() => {
    try {
      localStorage.setItem("temp_email_history_local", JSON.stringify(emailHistory));
    } catch (e) {
      console.error("Failed to save local email history", e);
    }
  }, [emailHistory]);
  const [otpMap, setOtpMap] = useState<Record<string, string>>({});
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
  );
  const [testEmailCooldown, setTestEmailCooldown] = useState<number>(0);
  const [generateCooldown, setGenerateCooldown] = useState<number>(0);
  const [historyPage, setHistoryPage] = useState<number>(1);

  // Reset history page when search query changes
  useEffect(() => {
    setHistoryPage(1);
  }, [searchQuery]);

  // Cooldown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setTestEmailCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      setGenerateCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync Notification permission state on mount safely
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);



  // Fetch available domains on mount and load/generate email
  useEffect(() => {
    async function init() {
      try {
        const rawDomains = await getAvailableDomains();
        
        const domainStatusesList = await domainStatusRepo.getAll();
        
        const workingDomains = rawDomains.filter(dom => {
          const stat = domainStatusesList.find(s => s.domain === dom);
          return stat ? stat.isWorking : true; // Default to true
        });
        
        const domains = workingDomains.length > 0 ? workingDomains : rawDomains;
        
        setAvailableDomains(domains);

        const saved = localStorage.getItem("temp_gmail_info");
        if (saved) {
          try {
            const info = JSON.parse(saved);
            if (info && info.email && info.login && info.domain) {
              setEmailInfo(info);
              if (domains.includes(info.domain)) {
                setSelectedDomain(info.domain);
              } else if (domains.length > 0) {
                setSelectedDomain(domains[0]);
              }

              // Ensure current active loaded email is in the history
              const loadedItem = {
                email: info.email,
                login: info.login,
                domain: info.domain,
                generatedAt: new Date().toISOString(),
                addedToDashboard: false
              };
              setEmailHistory((prev) => {
                if (!prev.some((item) => item.email.toLowerCase() === info.email.toLowerCase())) {
                  return [loadedItem, ...prev];
                }
                return prev;
              });

              if (userProfile?.email) {
                const history = await tempEmailHistoryRepo.getAll(userProfile.email);
                if (!history.some((item) => item.email.toLowerCase() === info.email.toLowerCase())) {
                  await tempEmailHistoryRepo.create({
                    email: info.email,
                    login: info.login,
                    domain: info.domain,
                    generatedAt: new Date().toISOString(),
                    addedToDashboard: false,
                    ownerEmail: userProfile.email
                  });
                }
              }

              fetchMessages(info)
                .then((latest) => {
                  setMessages(latest);
                })
                .catch((err) => {
                  console.error("Failed to load saved messages on mount", err);
                });
              return;
            }
          } catch (e) {
            console.error("Failed to parse saved email info", e);
          }
        }

        // If no saved email, wait until domains are set and generate one using the first domain
        if (domains.length > 0) {
          setSelectedDomain(domains[0]);
          setIsRefreshing(true);
          try {
            const info = await generateTempEmail("real", undefined, domains[0]);
            setEmailInfo(info);
            setMessages([]);
            setSelectedMessage(null);
            setCountdown(3);
            localStorage.setItem("temp_gmail_info", JSON.stringify(info));

            const newInitItem = {
              email: info.email,
              login: info.login,
              domain: info.domain,
              generatedAt: new Date().toISOString(),
              addedToDashboard: false,
            };
            setEmailHistory((prev) => [newInitItem, ...prev.filter((i) => i.email.toLowerCase() !== info.email.toLowerCase())]);

            if (userProfile?.email) {
              await tempEmailHistoryRepo.create({
                email: info.email,
                login: info.login,
                domain: info.domain,
                generatedAt: new Date().toISOString(),
                addedToDashboard: false,
                ownerEmail: userProfile.email
              });
            }
            
            try {
              const currentUser = auth.currentUser;
              await tempEmailsLogRepo.create({
                email: info.email,
                domain: info.domain,
                userEmail: currentUser?.email || "Người dùng (Ẩn danh)"
              });
            } catch (e) {
              console.error("Failed to log temp email", e);
            }
          } catch (err: any) {
            console.error("Error auto-generating initial email", err);
          } finally {
            setIsRefreshing(false);
          }
        }
      } catch (err) {
        console.error("Failed to initialize temp email view:", err);
      }
    }
    init();
  }, [emailMode, userProfile?.email]);

  // Subscribe to domain statuses
  useEffect(() => {
    const unsubscribe = domainStatusRepo.subscribe((statuses) => {
      setDomainStatuses(statuses);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to history
  useEffect(() => {
    if (!userProfile?.email) return;
    const unsubscribe = tempEmailHistoryRepo.subscribe(userProfile.email, (history) => {
      if (history) {
        setEmailHistory((prev) => {
          const map = new Map<string, any>();
          prev.forEach((item) => map.set(item.email.toLowerCase(), item));
          history.forEach((item) => map.set(item.email.toLowerCase(), item));
          const merged = Array.from(map.values());
          merged.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
          return merged;
        });
      }
    });
    return () => unsubscribe();
  }, [userProfile?.email]);

  // Extract OTPs for existing messages if not already in otpMap
  useEffect(() => {
    if (!emailInfo || messages.length === 0) return;

    // Only scan the most recent 10 messages to avoid rate limits
    const unscanned = messages
      .slice(0, 10)
      .filter(m => !otpMap[m.id]);

    if (unscanned.length === 0) return;

    const scanMessages = async () => {
      for (const msg of unscanned) {
        // Skip if already scanned in another batch
        if (otpMap[msg.id]) continue;
        
        try {
          // Add a small delay between requests
          await new Promise(r => setTimeout(r, 300));
          const details = await fetchMessageDetails(emailInfo, msg.id, false);
          const otp = extractOTP(details.textBody || details.body || "", details.from, details.subject);
          if (otp) {
            setOtpMap(prev => ({ ...prev, [msg.id]: otp }));
          }
        } catch (e) {
          // ignore individual fetch errors
        }
      }
    };

    scanMessages();
  }, [messages, emailInfo]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!emailInfo) return;

    const interval = setInterval(async () => {
      setCountdown((prev) => {
        if (prev <= 1) {
          triggerCheck();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [emailInfo, messages]);

  const triggerCheck = async () => {
    if (!emailInfo) return;
    try {
      const latest = await fetchMessages(emailInfo);
      if (latest.length > messages.length) {
        const newMessages = latest.filter(m => !messages.find(prev => prev.id === m.id));
        const newCount = newMessages.length;
        addToast(`Nhận thành công ${newCount} thư mới!`, "success");
        
        // Auto-extract OTP and fire push notifications for new messages
        newMessages.forEach(async (msg) => {
          try {
            const details = await fetchMessageDetails(emailInfo, msg.id, false);
            const bodyText = details.textBody || details.body || "";
            const otp = extractOTP(bodyText, details.from, details.subject) || "";
            if (otp) {
              setOtpMap(prev => ({ ...prev, [msg.id]: otp }));
            }

            const isUnich = 
              (msg.senderName && msg.senderName.toLowerCase().includes("unich")) ||
              (msg.from && msg.from.toLowerCase().includes("unich")) ||
              (msg.subject && msg.subject.toLowerCase().includes("unich")) ||
              (bodyText.toLowerCase().includes("unich"));

            const enablePush = userProfile ? userProfile.enableBrowserPush !== false : true;
            const onlyUnichFilter = userProfile ? userProfile.onlyUnich === true : false;

            if (enablePush && (!onlyUnichFilter || isUnich)) {
              if ("Notification" in window && Notification.permission === "granted") {
                const senderName = msg.senderName || msg.from.split("<")[0].trim() || "Người gửi";
                
                try {
                  const iconUrl = msg.avatarUrl || "/favicon.ico";
                  if (isUnich) {
                    // Đối với Unich chỉ hiển thị Tên, và OTP
                    new Notification("Unich OTP", {
                      body: `Tên: ${senderName}\nOTP: ${otp || "Không tìm thấy mã OTP"}`,
                      icon: iconUrl,
                      tag: `msg-${msg.id}`
                    });
                  } else {
                    // Thư bình thường
                    new Notification(`Thư mới từ ${senderName}`, {
                      body: `Tiêu đề: ${msg.subject}`,
                      icon: iconUrl,
                      tag: `msg-${msg.id}`
                    });
                  }
                } catch (notifyErr) {
                  console.warn("Could not display browser notification (likely blocked in iframe context):", notifyErr);
                }
              }
            }
          } catch (e) {
            console.error("Failed to auto-extract OTP / notify", e);
            // Fallback notification if message details could not be loaded
            const enablePush = userProfile ? userProfile.enableBrowserPush !== false : true;
            const onlyUnichFilter = userProfile ? userProfile.onlyUnich === true : false;
            
            const isUnichFallback = 
              (msg.senderName && msg.senderName.toLowerCase().includes("unich")) ||
              (msg.from && msg.from.toLowerCase().includes("unich")) ||
              (msg.subject && msg.subject.toLowerCase().includes("unich"));

            if (enablePush && (!onlyUnichFilter || isUnichFallback)) {
              if ("Notification" in window && Notification.permission === "granted") {
                const senderName = msg.senderName || msg.from.split("<")[0].trim() || "Người gửi";
                
                try {
                  const iconUrl = msg.avatarUrl || "/favicon.ico";
                  if (isUnichFallback) {
                    new Notification("Unich OTP", {
                      body: `Tên: ${senderName}\nOTP: [Đang tải...]`,
                      icon: iconUrl,
                      tag: `msg-${msg.id}`
                    });
                  } else {
                    new Notification(`Thư mới từ ${senderName}`, {
                      body: `Tiêu đề: ${msg.subject}`,
                      icon: iconUrl,
                      tag: `msg-${msg.id}`
                    });
                  }
                } catch (notifyErr) {
                  console.warn("Could not display fallback browser notification (likely blocked in iframe context):", notifyErr);
                }
              }
            }
          }
        });
        
        // Soft audio alert
        const enableSound = userProfile ? userProfile.enableSound !== false : true;
        if (enableSound) {
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
            gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.15);
          } catch (e) {
            // ignore blocked audio
          }
        }
      }
      setMessages(latest);
    } catch (err) {
      // ignore temporary polling errors
    }
  };

  const handleGenerateNew = async (modeToUse = emailMode, showToast = true) => {
    if (generateCooldown > 0) {
      addToast(`Vui lòng đợi ${generateCooldown}s trước khi tạo email mới!`, "warning");
      return;
    }

    // Check email limit
    if (userProfile && userProfile.emailLimit && userProfile.emailLimit > 0) {
      if (emailHistory.length >= userProfile.emailLimit) {
        addToast("Bạn đã đạt giới hạn tạo email!", "warning");
        return;
      }
    }
    
    setIsRefreshing(true);
    try {
      const customDom = selectedDomain || undefined;
      const info = await generateTempEmail("real", customPrefix, customDom);
      setEmailInfo(info);
      setMessages([]);
      setSelectedMessage(null);
      setCountdown(3);
      setGenerateCooldown(30);
      
      localStorage.setItem("temp_gmail_info", JSON.stringify(info));

      const newGenItem = {
        email: info.email,
        login: info.login,
        domain: info.domain,
        generatedAt: new Date().toISOString(),
        addedToDashboard: false,
      };

      setEmailHistory((prev) => [
        newGenItem,
        ...prev.filter((i) => i.email.toLowerCase() !== info.email.toLowerCase()),
      ]);

      // Save to history (Firestore)
      if (userProfile?.email) {
        await tempEmailHistoryRepo.create({
          email: info.email,
          login: info.login,
          domain: info.domain,
          generatedAt: new Date().toISOString(),
          addedToDashboard: false,
          ownerEmail: userProfile.email
        });
      }

      try {
        const currentUser = auth.currentUser;
        await tempEmailsLogRepo.create({
          email: info.email,
          domain: info.domain,
          userEmail: currentUser?.email || "Người dùng (Ẩn danh)"
        });
      } catch (e) {
        console.error("Failed to log temp email", e);
      }

      if (showToast) {
        addToast(
          "Đã đăng ký hòm thư thật (Real Disposable Email)!", 
          "success"
        );
      }
    } catch (err: any) {
      if (showToast) {
        addToast(`Lỗi tạo email: ${err.message || "Vui lòng thử lại!"}`, "error");
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddToDashboard = async () => {
    if (!emailInfo || !onAddAccount) return;
    setIsAddingToDashboard(true);
    try {
      const finalNote = accountNote.trim() || "Chờ duyệt";
      await onAddAccount({
        email: emailInfo.email,
        password: "Slhd1133#",
        status: AccountStatus.UNUSED,
        note: finalNote
      });
      addToast(`Đã thêm thành công email ${emailInfo.email} vào Dashboard!`, "success");
      setAccountNote(""); // reset note after successful add

      // Update local state history
      setEmailHistory((prev) =>
        prev.map((item) =>
          item.email.toLowerCase() === emailInfo.email.toLowerCase()
            ? { ...item, addedToDashboard: true, note: finalNote }
            : item
        )
      );

      // Update history list item state in Firestore
      if (userProfile?.email) {
        await tempEmailHistoryRepo.update(emailInfo.email, { 
          addedToDashboard: true, 
          note: finalNote 
        });
      }
    } catch (err: any) {
      addToast(`Lỗi khi thêm email: ${err.message || "Vui lòng thử lại!"}`, "error");
    } finally {
      setIsAddingToDashboard(false);
    }
  };

  const handleSwitchToEmail = async (item: {
    email: string;
    login: string;
    domain: string;
    generatedAt: string;
    addedToDashboard: boolean;
    note?: string;
  }) => {
    if (emailInfo?.email === item.email) {
      addToast("Hòm thư này hiện đã là hòm thư hoạt động chính!", "info");
      return;
    }
    setIsRefreshing(true);
    try {
      const info: GeneratedEmailInfo = {
        email: item.email,
        login: item.login,
        domain: item.domain,
        mode: "real"
      };
      setEmailInfo(info);
      setMessages([]);
      setSelectedMessage(null);
      setCountdown(3);
      
      localStorage.setItem("temp_gmail_info", JSON.stringify(info));
      
      const latest = await fetchMessages(info);
      setMessages(latest);
      addToast(`Đã chuyển thành công sang hòm thư cũ: ${item.email}`, "success");
    } catch (err: any) {
      addToast(`Lỗi khi khôi phục hòm thư: ${err.message || "Vui lòng thử lại!"}`, "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeleteHistoryItem = async (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEmailHistory((prev) => prev.filter((item) => item.email.toLowerCase() !== email.toLowerCase()));
    try {
      await tempEmailHistoryRepo.delete(email);
      addToast("Đã xóa email khỏi lịch sử!", "success");
    } catch (err) {
      addToast("Lỗi khi xóa lịch sử", "error");
    }
  };

  const handleClearHistory = async () => {
    setEmailHistory([]);
    try {
      localStorage.removeItem("temp_email_history_local");
      if (userProfile?.email) {
        await tempEmailHistoryRepo.clearAll(userProfile.email);
      }
      addToast("Đã xóa toàn bộ lịch sử!", "success");
    } catch (err) {
      addToast("Lỗi khi xóa lịch sử", "error");
    }
  };

  const handleCopy = () => {
    if (!emailInfo) return;
    copyToClipboard(emailInfo.email).then((success) => {
      if (success) {
        setCopied(true);
        addToast("Đã sao chép địa chỉ Email vào bộ nhớ tạm!", "success");
        setTimeout(() => setCopied(false), 2000);
      } else {
        addToast("Không thể sao chép địa chỉ Email", "error");
      }
    });
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await triggerCheck();
    setIsRefreshing(false);
    addToast("Hòm thư đã được cập nhật!", "info");
  };

  const handleOpenMessage = async (msg: TempEmailMessage) => {
    if (!emailInfo) return;
    try {
      const details = await fetchMessageDetails(emailInfo, msg.id);
      setSelectedMessage(details);
      
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m))
      );
    } catch (err) {
      addToast("Không thể tải chi tiết thư từ máy chủ!", "error");
    }
  };

  const handleDeleteMsg = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!emailInfo) return;
    try {
      const ok = await deleteMessage(emailInfo, id);
      if (ok) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        if (selectedMessage?.id === id) {
          setSelectedMessage(null);
        }
        addToast("Đã xóa thư thành công!", "success");
      } else {
        addToast("Không thể xóa thư!", "error");
      }
    } catch (err) {
      addToast("Có lỗi xảy ra khi xóa thư!", "error");
    }
  };



  const handleReportError = async () => {
    if (!emailInfo || !emailInfo.domain) return;
    
    try {
      const hasReport = await domainReportsRepo.hasReport(emailInfo.domain);
      if (hasReport) {
        addToast(`Tên miền ${emailInfo.domain} đã được báo cáo rồi!`, "warning");
        return;
      }

      const currentUser = auth.currentUser;
      await domainReportsRepo.create({
        domain: emailInfo.domain,
        userEmail: currentUser?.email || "Người dùng (Ẩn danh)",
        userName: currentUser?.displayName || "Người dùng (Ẩn danh)",
        note: `Domain ${emailInfo.domain} không nhận được thư.`
      });
      addToast(`Đã báo cáo domain ${emailInfo.domain} bị lỗi.`, "success");
    } catch (err) {
      addToast("Không thể gửi báo cáo lỗi.", "error");
    }
  };

  const handleSendTestFirebaseMail = async () => {
    if (!emailInfo?.email) return;
    if (testEmailCooldown > 0) {
      addToast(`Vui lòng đợi ${testEmailCooldown}s trước khi gửi lại thư test.`, "warning");
      return;
    }
    setIsSendingTestMail(true);
    try {
      const actionCodeSettings = {
        url: window.location.origin || window.location.href,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, emailInfo.email, actionCodeSettings);
      addToast("Đã gửi thư xác nhận test từ Firebase thành công! Hãy đợi khoảng 5-15 giây để nhận thư.", "success");
      setTestEmailCooldown(30);
    } catch (err: any) {
      if (err.code === "auth/quota-exceeded") {
        console.warn("Firebase quota exceeded for test email.");
        addToast("Firebase đã hết hạn mức gửi email miễn phí hôm nay. Vui lòng tự dùng Gmail cá nhân của bạn để gửi thư test nhé!", "warning");
        setTestEmailCooldown(3600); // 1 hour cooldown to prevent spamming
      } else {
        console.error("Failed to send Firebase test email:", err);
        addToast(`Không thể gửi thư test từ Firebase: ${err.message || err}`, "error");
      }
    } finally {
      setIsSendingTestMail(false);
    }
  };

  return (
    <div className="space-y-8" id="temp-email-hub">
      
      {/* Firebase Test Email Top Banner */}
      {emailInfo && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-all">
          <div className="flex items-start gap-3.5 max-w-2xl">
            <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Kiểm thử tốc độ nhận Mail với Firebase</h3>
                <span className="text-[9px] bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Khuyên dùng
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Gửi một thư xác nhận đăng nhập thực tế từ hệ thống Google Firebase đến địa chỉ <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 px-1.5 py-0.5 rounded-md">{emailInfo.email}</span> để tự mình trải nghiệm tốc độ nhận thư của hệ thống.
              </p>
            </div>
          </div>
          <div className="w-full md:w-auto shrink-0">
            <button
              onClick={handleSendTestFirebaseMail}
              disabled={isSendingTestMail || testEmailCooldown > 0}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-md shadow-indigo-500/10 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isSendingTestMail ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang gửi...
                </>
              ) : testEmailCooldown > 0 ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Gửi lại sau ({testEmailCooldown}s)
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Gửi thư test từ Firebase
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Panel Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Control Card & Configuration panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Main Card: Display and Actions */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                  Cấu hình Email
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">Thiết lập hòm thư nhận tin nhắn thật</p>
              </div>
            </div>

            {/* 1. Tiền tố (Prefix) | Tên miền (Domain) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
                  Tiền tố (Prefix)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: verify, admin..."
                  value={customPrefix}
                  onChange={(e) => setCustomPrefix(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1 block truncate">
                  <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                  Tên miền (Domain)
                </label>
                {availableDomains.length > 0 ? (
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 min-h-[38px]"
                  >
                    {availableDomains.map((dom) => {
                      const status = domainStatuses.find(s => s.domain === dom);
                      const isWorking = status ? status.isWorking : true;
                      return (
                        <option key={dom} value={dom}>
                          {isWorking ? "✓ " : "⚠️ "}@{dom}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="px-3 py-2.5 text-xs text-slate-400 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50">
                    Chưa có tên miền
                  </div>
                )}
              </div>
            </div>

            {/* 2. Địa chỉ hiện tại & Ghi chú tài khoản (Kích thước & Chiều rộng bằng nhau) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100 dark:border-slate-850">
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
                  Địa chỉ hiện tại:
                </span>
                <div className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 group transition-all min-h-[42px]">
                  <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-100 select-all truncate tracking-tight">
                    {emailInfo?.email || "Đang khởi tạo..."}
                  </span>
                  <button
                    onClick={handleCopy}
                    disabled={!emailInfo}
                    className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer shrink-0 ${
                      copied 
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/10" 
                        : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 hover:border-blue-500/30 shadow-sm"
                    }`}
                    title="Sao chép nhanh địa chỉ Email"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block truncate">
                  Ghi chú tài khoản:
                </label>
                <input
                  type="text"
                  placeholder="Mặc định: Chờ duyệt"
                  value={accountNote}
                  onChange={(e) => setAccountNote(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium min-h-[42px]"
                />
              </div>
            </div>

            {/* 3. Thêm Email vào Dashboard */}
            {emailInfo && onAddAccount && userProfile?.role === "admin" && (
              <div className="pt-1">
                {existingEmails?.includes(emailInfo.email) ? (
                  <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                    Đã thêm vào Dashboard
                  </div>
                ) : (
                  <button
                    onClick={handleAddToDashboard}
                    disabled={isAddingToDashboard}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-xs font-extrabold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 cursor-pointer transition-all active:scale-98 disabled:opacity-50 min-h-[44px]"
                  >
                    <PlusCircle className="w-4.5 h-4.5" />
                    Thêm Email vào Dashboard
                  </button>
                )}
              </div>
            )}

            {/* 4. Tạo mail mới | Làm mới | Báo cáo (Chiều rộng bằng nhau - grid-cols-3) */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-850">
              {/* Tạo mail mới */}
              <button
                onClick={() => handleGenerateNew("real")}
                disabled={isRefreshing}
                className="w-full flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span className="truncate">{generateCooldown > 0 ? `${generateCooldown}s...` : "Tạo mail mới"}</span>
              </button>

              {/* Làm mới */}
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing || !emailInfo}
                className="w-full flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-extrabold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all cursor-pointer active:scale-98 disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isRefreshing ? "animate-spin text-blue-600 dark:text-blue-400" : ""}`} />
                <span className="truncate">Làm mới</span>
              </button>

              {/* Báo cáo */}
              <button
                onClick={handleReportError}
                disabled={!emailInfo}
                className="w-full flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-extrabold bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all cursor-pointer active:scale-98 disabled:opacity-40"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Báo cáo</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-850 text-xs font-bold text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <span>Thời gian kiểm tra thư: <strong className="font-mono text-indigo-600 dark:text-indigo-400 text-xs font-black">{countdown}s</strong></span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">Tự động cập nhật</span>
            </div>
          </div>

          {/* Automatic Check Status Footer */}
          <div className="pt-1">
          </div>

        </div>

        {/* Right column: List of inboxes received (7 cols) */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
            
            {/* Inbox Title block */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500">
                  <Inbox className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                    Hòm thư đến (Inbox)
                  </h2>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    Danh sách thư sẽ tự động hiển thị tức thời bên dưới khi được gửi đến
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                {messages.length} thư
              </span>
            </div>

            {/* Email list body content */}
            <div className="flex-grow p-4 overflow-y-auto max-h-[520px] min-h-[350px]">
              <AnimatePresence mode="popLayout">
                {messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-24 text-center space-y-4"
                  >
                    <div className="p-4 rounded-full bg-slate-50 dark:bg-slate-950/50 text-slate-300 dark:text-slate-700">
                      <Mail className="w-12 h-12" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Chưa có thư gửi đến</p>
                      <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed font-medium">
                        Hệ thống kiểm tra thư tự động theo thời gian thực (mỗi 3 giây). Hãy gửi email thực tế đến địa chỉ này để nhận thư.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg, index) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.2, delay: index * 0.04 }}
                        onClick={() => handleOpenMessage(msg)}
                        className={`group relative p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          msg.read 
                            ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-850/30" 
                            : "bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/15 dark:border-blue-500/25 hover:bg-blue-500/10 dark:hover:bg-blue-500/15"
                        }`}
                      >
                        {/* Status bar */}
                        {!msg.read && (
                          <div className="absolute left-0 top-4 bottom-4 w-1 bg-blue-500 rounded-r-full" />
                        )}

                        <div className="flex items-start gap-3.5 flex-grow min-w-0 pl-1">
                          
                          {/* Sender Avatar */}
                          <div className="shrink-0">
                            {msg.avatarUrl ? (
                              <img 
                                src={msg.avatarUrl} 
                                alt={msg.senderName} 
                                className="w-9 h-9 rounded-xl object-cover border border-slate-200/50"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className={`p-2.5 rounded-xl ${
                                msg.read 
                                  ? "bg-slate-100 dark:bg-slate-800 text-slate-500" 
                                  : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              }`}>
                                <User className="w-4 h-4" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-1 min-w-0 flex-grow">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs font-black truncate ${
                                msg.read ? "text-slate-700 dark:text-slate-300" : "text-slate-900 dark:text-white"
                              }`}>
                                {msg.senderName || msg.from.split("<")[0].trim()}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono font-medium truncate max-w-[140px] sm:max-w-xs">
                                &lt;{msg.from.includes("<") ? msg.from.split("<")[1].replace(">", "") : msg.from}&gt;
                              </span>
                              
                              {msg.attachments && msg.attachments.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[8px] font-black">
                                  <Paperclip className="w-2.5 h-2.5" />
                                  {msg.attachments.length} tệp
                                </span>
                              )}
                            </div>

                            <p className={`text-xs truncate ${
                              msg.read ? "text-slate-500 dark:text-slate-400" : "text-slate-900 dark:text-white font-extrabold"
                            }`}>
                              {msg.subject}
                            </p>

                            {/* OTP Display Badge */}
                            {otpMap[msg.id] && (
                              <div 
                                className="mt-1 flex items-center gap-1.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(otpMap[msg.id]).then((success) => {
                                    if (success) {
                                      addToast(`Đã sao chép mã OTP: ${otpMap[msg.id]}`, "success");
                                    } else {
                                      addToast("Không thể sao chép mã OTP", "error");
                                    }
                                  });
                                }}
                              >
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-[11px] font-black shadow-sm group/otp hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all cursor-copy">
                                  <Key className="w-3 h-3" />
                                  Mã OTP: {otpMap[msg.id]}
                                  <Copy className="w-2.5 h-2.5 opacity-0 group-hover/otp:opacity-100 transition-opacity" />
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Timing and Operations */}
                        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0">
                          <span className="text-[9px] text-slate-400 font-mono font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-300" />
                            {new Date(msg.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>

                          <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <button
                              onClick={(e) => handleDeleteMsg(msg.id, e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                              title="Xóa thư"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="p-1.5 text-blue-500">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>

      {/* History and Stats Card - Spanning Full Width horizontally */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500">
              <History className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white">Lịch sử Email đã tạo</h3>
              <p className="text-[10px] text-slate-400">Danh sách các hòm thư rác thật bạn đã khởi tạo trong phiên làm việc</p>
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              Tổng cộng: {emailHistory.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Stats badges inside the top bar for a very modern dashboard look */}
            <div className="flex items-center gap-3 bg-slate-50/55 dark:bg-slate-950/40 px-3 py-1.5 rounded-2xl border border-slate-150/40 dark:border-slate-850/50">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Đã tạo: <span className="font-black text-slate-800 dark:text-white">{emailHistory.length}</span>
              </div>
              <div className="h-3 w-[1px] bg-slate-200 dark:bg-slate-800" />
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <Database className="w-3.5 h-3.5 text-indigo-500" />
                Đã thêm DB: <span className="font-black text-slate-800 dark:text-white">{emailHistory.filter(item => existingEmails?.includes(item.email)).length}</span>
              </div>
            </div>

            {/* Clear history button */}
            {emailHistory.length > 0 && userProfile?.role === "admin" && (
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 hover:border-rose-300 bg-rose-50/40 hover:bg-rose-50 dark:border-rose-950/20 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 transition-all duration-200 text-xs font-bold shadow-sm cursor-pointer"
                title="Xóa toàn bộ lịch sử tạo mail"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                Xóa lịch sử
              </button>
            )}

            {/* Search Input Bar */}
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm email hoặc ghi chú..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 text-xs bg-slate-50/80 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500 text-slate-700 dark:text-slate-300 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Email History Table */}
        {(() => {
          const filteredHistory = emailHistory.filter((item) => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
              item.email.toLowerCase().includes(query) ||
              (item.note && item.note.toLowerCase().includes(query))
            );
          });

          if (filteredHistory.length === 0) {
            return (
              <div className="text-center py-8 text-slate-400 dark:text-slate-600 text-xs font-medium">
                {searchQuery ? "Không tìm thấy kết quả phù hợp." : "Chưa có lịch sử email được lưu."}
              </div>
            );
          }

          const ITEMS_PER_PAGE = 10;
          const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE) || 1;
          const safePage = Math.min(Math.max(historyPage, 1), totalPages);
          const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
          const paginatedHistory = filteredHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);

          return (
            <div className="w-full border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-inner">
              <div className="max-h-[380px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                <table className="w-full text-left border-collapse text-xs min-w-[650px] table-fixed">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-extrabold tracking-wider uppercase text-[10px] whitespace-nowrap">
                      <th className="px-3.5 py-3 text-center w-12 shrink-0 bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-md sticky top-0 z-10">STT</th>
                      <th className="px-3.5 py-3 w-56 shrink-0 bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-md sticky top-0 z-10">Email tạm thời</th>
                      <th className="px-3.5 py-3 w-32 shrink-0 bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-md sticky top-0 z-10">Thời gian tạo</th>
                      <th className="px-3.5 py-3 bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-md sticky top-0 z-10">Ghi chú</th>
                      <th className="px-3.5 py-3 w-28 shrink-0 bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-md sticky top-0 z-10">Dashboard</th>
                      <th className="px-3.5 py-3 w-24 text-right shrink-0 bg-slate-100/90 dark:bg-slate-950/90 backdrop-blur-md sticky top-0 z-10">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {paginatedHistory.map((item, index) => {
                      const actualIndex = startIndex + index;
                      const isActive = emailInfo?.email === item.email;
                      const isCurrentlyInDB = existingEmails?.includes(item.email);
                      const wasAddedButDeleted = item.addedToDashboard && !isCurrentlyInDB;
                      
                      return (
                        <tr 
                          key={item.email + actualIndex}
                          onClick={() => handleSwitchToEmail(item)}
                          className={`group hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors cursor-pointer ${
                            isActive
                              ? "bg-indigo-50/30 dark:bg-indigo-950/10"
                              : "bg-white dark:bg-slate-900"
                          }`}
                        >
                          {/* index */}
                          <td className="px-3.5 py-3 text-center font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500">
                            {actualIndex + 1}
                          </td>

                          {/* email */}
                          <td className="px-3.5 py-3 w-56 shrink-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`font-mono select-all truncate ${
                                isActive 
                                  ? "font-black text-indigo-600 dark:text-indigo-400" 
                                  : "font-semibold text-slate-700 dark:text-slate-300"
                              }`}>
                                {item.email}
                              </span>
                              {isActive && (
                                <span className="shrink-0 flex h-1.5 w-1.5 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Created at */}
                          <td className="px-3.5 py-3 w-32 shrink-0 whitespace-nowrap text-slate-400 dark:text-slate-500 font-medium text-[10px]">
                            <div className="flex items-center gap-1">
                              <span>{new Date(item.generatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span>{new Date(item.generatedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                            </div>
                          </td>

                          {/* note */}
                          <td className="px-3.5 py-3 text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px]" title={item.note || "Không có ghi chú"}>
                            {item.note || <span className="text-slate-300 dark:text-slate-700 font-normal">—</span>}
                          </td>

                          {/* dashboard status */}
                          <td className="px-3.5 py-3 w-28 shrink-0 whitespace-nowrap">
                            {isCurrentlyInDB ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Đã thêm
                              </span>
                            ) : wasAddedButDeleted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                <XCircle className="w-3.5 h-3.5" />
                                Đã xóa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-slate-100 dark:bg-slate-850 text-slate-400 dark:text-slate-500 border border-transparent">
                                Chưa thêm
                              </span>
                            )}
                          </td>

                          {/* Action column */}
                          <td className="px-3.5 py-3 w-24 shrink-0 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={(e) => handleDeleteHistoryItem(item.email, e)}
                                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 dark:bg-slate-950/40 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors duration-150 border border-slate-100 dark:border-slate-800"
                                  title="Xóa khỏi lịch sử"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              <button
                                onClick={() => handleSwitchToEmail(item)}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 dark:bg-slate-950/40 dark:hover:bg-indigo-950/60 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-150 border border-slate-100 dark:border-slate-800"
                                title="Chuyển sang hòm thư này"
                              >
                                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination bar */}
              <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="text-slate-500 dark:text-slate-400 font-medium">
                  Hiển thị <span className="font-bold text-slate-800 dark:text-slate-200">{startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, filteredHistory.length)}</span> trong tổng số <span className="font-bold text-slate-800 dark:text-slate-200">{filteredHistory.length}</span> email (Trang {safePage}/{totalPages})
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setHistoryPage((prev) => Math.max(prev - 1, 1))}
                    disabled={safePage <= 1}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Trước
                  </button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setHistoryPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          pageNum === safePage
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setHistoryPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={safePage >= totalPages}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
                  >
                    Sau
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Modern Pop-up Message Body Viewer */}
      <AnimatePresence>
        {selectedMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMessage(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            {/* Main Modal body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-850 overflow-hidden flex flex-col max-h-[85vh] z-10"
            >
              {/* Header block */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    {selectedMessage.avatarUrl ? (
                      <img 
                        src={selectedMessage.avatarUrl} 
                        alt={selectedMessage.senderName} 
                        className="w-10 h-10 rounded-2xl object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <Mail className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 pr-4">
                    <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest">Nội dung chi tiết</span>
                    <h3 className="text-sm md:text-base font-black text-slate-900 dark:text-white truncate max-w-[280px] sm:max-w-[450px]">
                      {selectedMessage.subject}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sender & Receiver metadata block */}
              <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-850 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px] w-14 shrink-0 pt-0.5">Người gửi:</span>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedMessage.senderName || selectedMessage.from.split("<")[0].trim()}
                      </span>{" "}
                      <span className="font-mono text-slate-400 break-all text-[11px]">
                        &lt;{selectedMessage.from.includes("<") ? selectedMessage.from.split("<")[1].replace(">", "") : selectedMessage.from}&gt;
                      </span>
                    </div>
                  </div>
                  
                  <span className="text-[10px] text-slate-400 font-mono font-bold flex items-center gap-1 sm:self-start shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-300" />
                    {new Date(selectedMessage.date).toLocaleString('vi-VN')}
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px] w-14 shrink-0">Nhận bởi:</span>
                  <span className="font-mono font-black text-slate-700 dark:text-slate-300 select-all break-all text-[11px]">
                    {selectedMessage.to}
                  </span>
                </div>
              </div>

              {/* View options switcher tab */}
              <div className="px-6 py-2.5 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between bg-white dark:bg-slate-900">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("html")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "html"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                  >
                    Nội dung HTML
                  </button>
                  <button
                    onClick={() => setActiveTab("text")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "text"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    }`}
                  >
                    Văn bản thường (Text)
                  </button>
                </div>

                <span className="text-[10px] text-slate-400 font-bold bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded">
                  Cách ly bảo mật an toàn (Iframe Sandbox)
                </span>
              </div>

              {/* Render email body inside a secure iframe */}
              <div className="flex-grow overflow-y-auto p-6 bg-white">
                {activeTab === "html" && selectedMessage.body ? (
                  <iframe
                    title="Secure Email Sandboxed View"
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="utf-8">
                          <base target="_blank">
                          <style>
                            body {
                              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                              font-size: 14px;
                              line-height: 1.6;
                              color: #24292f;
                              margin: 0;
                              padding: 8px;
                            }
                            a {
                              color: #2563eb;
                              text-decoration: underline;
                            }
                            img {
                              max-width: 100% !important;
                              height: auto !important;
                            }
                          </style>
                        </head>
                        <body>
                          ${selectedMessage.body}
                        </body>
                      </html>
                    `}
                    className="w-full h-[320px] border-0"
                    sandbox="allow-popups allow-popups-to-escape-sandbox"
                  />
                ) : (
                  <pre className="text-xs text-slate-800 font-mono whitespace-pre-wrap select-text leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 max-h-[320px] overflow-y-auto">
                    {selectedMessage.textBody || selectedMessage.body || "Không tìm thấy nội dung dạng văn bản."}
                  </pre>
                )}
              </div>

              {/* Attachments Section if present */}
              {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-850">
                  <div className="flex items-center gap-2 mb-3">
                    <Paperclip className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Tệp đính kèm ({selectedMessage.attachments.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedMessage.attachments.map((att, i) => (
                      <div 
                        key={i}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-sm"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={att.filename}>
                            {att.filename}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {(att.size / 1024).toFixed(1)} KB &bull; {att.contentType.split("/")[1] || "tệp tin"}
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            addToast(`Đang mô phỏng tải tệp: ${att.filename}`, "info");
                            const dummy = document.createElement("a");
                            dummy.href = "#";
                            dummy.setAttribute("download", att.filename);
                            document.body.appendChild(dummy);
                            dummy.click();
                            dummy.remove();
                          }}
                          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all cursor-pointer shrink-0"
                          title="Tải xuống tệp tin"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom footer bar */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-850 flex items-center justify-end gap-3.5">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors cursor-pointer"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
