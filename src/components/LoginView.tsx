import React, { useState } from "react";
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Sparkles,
  ShieldAlert,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LoginViewProps {
  onGoogleLogin: () => Promise<void>;
  onEmailSignIn: (email: string, pass: string) => Promise<void>;
  onEmailSignUp: (email: string, pass: string, name: string) => Promise<void>;
  addToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onGoogleLogin,
  onEmailSignIn,
  onEmailSignUp,
  addToast
}) => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      addToast("Vui lòng điền đầy đủ email và mật khẩu", "warning");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      addToast("Vui lòng điền họ tên", "warning");
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      addToast("Mật khẩu xác nhận không chính xác", "error");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        await onEmailSignIn(email.trim(), password);
      } else {
        await onEmailSignUp(email.trim(), password, name.trim());
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setLoading(true);
    try {
      await onGoogleLogin();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8" id="login-screen-wrapper">
      {/* Visual Background Elements */}
      <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-[#4285F4]/5 via-transparent to-transparent pointer-events-none z-0" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Brand Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4285F4] to-[#34A853] shadow-lg shadow-blue-500/10 mb-4">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">Gmail</h1>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-[#4285F4]/10 text-[#4285F4] dark:text-[#60a5fa] uppercase tracking-wide">Cloud</span>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-widest mt-1">Workspace Accounts Manager</p>
        </div>

        {/* Auth Box Container */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xl shadow-slate-100/50 dark:shadow-none p-8 space-y-6">
          
          {/* Tabs header toggler */}
          <div className="flex p-1 bg-slate-100/80 dark:bg-slate-800 rounded-xl relative" id="auth-tab-switch">
            <button
              onClick={() => { setMode("signin"); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all relative cursor-pointer ${
                mode === "signin" 
                  ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-950 shadow-sm" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => { setMode("signup"); }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all relative cursor-pointer ${
                mode === "signup" 
                  ? "text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-950 shadow-sm" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Đăng ký tài khoản
            </button>
          </div>

          <div className="space-y-4">
            <h2 className="text-base font-extrabold text-slate-850 dark:text-slate-100 tracking-tight leading-snug">
              {mode === "signin" ? "Chào mừng trở lại!" : "Tạo tài khoản mới"}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              {mode === "signin" 
                ? "Đăng nhập để bắt đầu quản lý tài khoản Gmail đám mây hoặc sử dụng hòm thư tạm thời." 
                : "Vui lòng hoàn thành thông tin bên dưới. Quản trị viên cần phê duyệt trước khi bạn có thể truy cập."
              }
            </p>
          </div>

          {/* Core Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  key="signup-name-input"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Họ và Tên
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                      <User className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Hồng Đức..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs minimalist-input text-slate-800 dark:text-slate-200 focus:outline-none transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Địa chỉ Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Mail className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs minimalist-input text-slate-800 dark:text-slate-200 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Mật Khẩu
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs minimalist-input text-slate-800 dark:text-slate-200 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Confirm Password (Signup only) */}
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  key="signup-confirm-password"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs minimalist-input text-slate-800 dark:text-slate-200 focus:outline-none transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Tigger Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Đăng nhập ngay" : "Đăng ký cấp quyền"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Horizontal Divider lines */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Hoặc tiếp tục với</span>
            <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
          </div>

          {/* Dynamic 1-click Google log in */}
          <button
            onClick={handleGoogleClick}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/40 text-slate-700 dark:text-slate-300 transition-all cursor-pointer font-bold text-xs shadow-sm bg-white dark:bg-slate-900 disabled:opacity-50"
            id="google-login-btn"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Đăng nhập nhanh với Google
          </button>
        </div>
      </motion.div>
    </div>
  );
};
