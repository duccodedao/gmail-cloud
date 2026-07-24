import React, { useState } from "react";
import { 
  Sparkles,
  ShieldAlert,
  Loader2,
  MapPin,
  Globe,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { motion } from "motion/react";

export interface LocationData {
  ip?: string;
  lat?: number;
  lng?: number;
  locationString?: string;
}

interface LoginViewProps {
  onGoogleLogin: (locationData?: LocationData) => Promise<void>;
  addToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onGoogleLogin,
  addToast
}) => {
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);

  const getGeoLocation = (): Promise<{ lat?: number; lng?: number }> => {
    return new Promise((resolve) => {
      try {
        if (!navigator || !navigator.geolocation) {
          resolve({});
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          },
          (err) => {
            console.warn("Geolocation permission error/denied:", err);
            resolve({});
          },
          {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 0,
          }
        );
      } catch (e) {
        console.warn("Geolocation access exception:", e);
        resolve({});
      }
    });
  };

  const getIpInfo = async (): Promise<{ ip?: string; locationString?: string }> => {
    try {
      const res = await fetch("https://ipapi.co/json/").catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.ip) {
          return {
            ip: data.ip,
            locationString: [data.city, data.region, data.country_name].filter(Boolean).join(", "),
          };
        }
      }
    } catch (e) {
      // Fallback to ipify
    }

    try {
      const res = await fetch("https://api.ipify.org?format=json").catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.ip) {
          return { ip: data.ip };
        }
      }
    } catch (e) {
      console.warn("Failed to fetch IP:", e);
    }

    return {};
  };

  const handleGoogleClick = async () => {
    setLoading(true);
    setStatusText("Đang xác thực vị trí GPS và IP...");

    try {
      // Fetch geolocation & IP in parallel
      const [geo, ipInfo] = await Promise.all([
        getGeoLocation(),
        getIpInfo()
      ]);

      const locationData: LocationData = {
        ip: ipInfo.ip,
        lat: geo.lat,
        lng: geo.lng,
        locationString: ipInfo.locationString
      };

      if (geo.lat && geo.lng) {
        addToast(`Tọa độ GPS: ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}`, "info");
      }
      if (ipInfo.ip) {
        addToast(`Địa chỉ IP: ${ipInfo.ip}`, "info");
      }

      setStatusText("Đang mở cửa sổ đăng nhập Google...");
      await onGoogleLogin(locationData);
    } catch (err: any) {
      console.error("Login process error:", err);
      addToast("Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.", "error");
    } finally {
      setLoading(false);
      setStatusText(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center relative overflow-hidden p-4">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/30 dark:shadow-black/50 space-y-7">
          
          {/* Header */}
          <div className="flex flex-col items-center space-y-3.5 text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 text-white">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                AIS Cloud Workspace
              </h1>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
                Hệ sinh thái quản lý tài khoản & OTP tự động
              </p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>Phương thức đăng nhập duy nhất</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Hệ thống hiện chỉ chấp nhận đăng nhập duy nhất bằng tài khoản <strong>Google</strong>. Sau khi đăng nhập, tài khoản sẽ được phê duyệt bởi Quản trị viên trước khi truy cập.
            </p>
          </div>



          {/* Main Action Button */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleClick}
              disabled={loading}
              id="google-login-btn"
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/20 active:scale-98 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>{statusText || "Đang xử lý đăng nhập..."}</span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                  </div>
                  <span>Đăng nhập nhanh bằng Google</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-1 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Xác thực an toàn qua Google OAuth 2.0</span>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
