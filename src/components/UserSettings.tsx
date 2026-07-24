import React, { useState, useEffect } from "react";
import { 
  User as UserIcon, 
  Mail, 
  Bell, 
  Volume2, 
  ShieldAlert, 
  RefreshCw, 
  Sparkles,
  Lock,
  CheckCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { AllowedUser } from "../types";
import { auth, allowedUsersRepo } from "../lib/firebase";
import { updateEmail, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

interface UserSettingsProps {
  userProfile: AllowedUser | null;
  addToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
  onRefreshProfile?: () => void;
}

export const UserSettings: React.FC<UserSettingsProps> = ({
  userProfile,
  addToast,
  onRefreshProfile
}) => {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isUpdatingName, setIsUpdatingName] = useState<boolean>(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState<boolean>(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>("");
  const [showPassCurrent, setShowPassCurrent] = useState<boolean>(false);
  const [showPassNew, setShowPassNew] = useState<boolean>(false);
  const [showPassConfirm, setShowPassConfirm] = useState<boolean>(false);

  const currentUser = auth.currentUser;
  const isGoogleUser = currentUser?.providerData.some(p => p.providerId === "google.com");

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || "");
      setEmail(userProfile.email || "");
    }
  }, [userProfile]);

  if (!userProfile) {
    return (
      <div className="p-6 text-center text-slate-500">
        Đang tải thông tin tài khoản...
      </div>
    );
  }

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast("Họ tên không được để trống", "warning");
      return;
    }
    setIsUpdatingName(true);
    try {
      // 1. Update Firestore Profile
      await allowedUsersRepo.update(userProfile.id, { name: name.trim() });
      
      // 2. Update Firebase Auth display name if possible
      if (currentUser) {
        await updateProfile(currentUser, { displayName: name.trim() });
      }

      addToast("Cập nhật họ tên thành công!", "success");
      if (onRefreshProfile) onRefreshProfile();
    } catch (err: any) {
      console.error("Failed to update display name:", err);
      addToast(`Lỗi khi cập nhật họ tên: ${err.message || err}`, "error");
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      addToast("Email không được để trống", "warning");
      return;
    }
    if (targetEmail === userProfile.email.toLowerCase()) {
      addToast("Email mới trùng với email hiện tại", "info");
      return;
    }

    setIsUpdatingEmail(true);
    try {
      if (!currentUser) throw new Error("Chưa đăng nhập");

      // 1. Update Firebase Authentication Email
      try {
        await updateEmail(currentUser, targetEmail);
      } catch (authErr: any) {
        if (authErr.code === "auth/requires-recent-login") {
          addToast("Vì lý do bảo mật, vui lòng đăng xuất và đăng nhập lại trước khi thực hiện đổi Email.", "warning");
          setIsUpdatingEmail(false);
          return;
        }
        throw authErr;
      }

      // 2. In Firestore, we create a new doc under the new lowercase email, copying old properties
      await allowedUsersRepo.create({
        id: targetEmail,
        email: targetEmail,
        name: userProfile.name,
        role: userProfile.role,
        note: userProfile.note || "",
        emailLimit: userProfile.emailLimit || 10,
        enableBrowserPush: userProfile.enableBrowserPush !== false,
        enableSound: userProfile.enableSound !== false,
        onlyUnich: userProfile.onlyUnich === true,
      });

      // 3. Delete old doc from Firestore
      await allowedUsersRepo.delete(userProfile.id);

      addToast("Đổi Email đăng nhập thành công!", "success");
      if (onRefreshProfile) onRefreshProfile();
    } catch (err: any) {
      if (err.code !== "auth/email-already-in-use" && err.code !== "auth/invalid-email") {
        console.error("Failed to update email:", err);
      }
      let errMsg = err.message || err;
      if (err.code === "auth/email-already-in-use") {
        errMsg = "Địa chỉ email này đã được sử dụng bởi tài khoản khác.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "Địa chỉ email không hợp lệ.";
      }
      addToast(`Lỗi đổi email: ${errMsg}`, "error");
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      addToast("Vui lòng nhập mật khẩu hiện tại", "warning");
      return;
    }
    if (newPassword.length < 6) {
      addToast("Mật khẩu mới phải từ 6 ký tự trở lên", "warning");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      addToast("Mật khẩu mới không khớp nhau", "warning");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (!currentUser || !currentUser.email) throw new Error("Chưa đăng nhập");

      // Reauthenticate user first
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password
      await updatePassword(currentUser, newPassword);
      addToast("Đổi mật khẩu tài khoản thành công!", "success");
      
      // Reset form fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      console.error("Failed to update password:", err);
      let errMsg = err.message || err;
      if (err.code === "auth/wrong-password") {
        errMsg = "Mật khẩu hiện tại không chính xác.";
      }
      addToast(`Lỗi đổi mật khẩu: ${errMsg}`, "error");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleTogglePreference = async (field: "enableBrowserPush" | "enableSound" | "onlyUnich", currentVal: boolean) => {
    try {
      await allowedUsersRepo.update(userProfile.id, {
        [field]: !currentVal
      });
      addToast("Đã lưu thiết lập thông báo tự động!", "success");
    } catch (err: any) {
      console.error("Failed to toggle setting:", err);
      addToast("Không thể lưu thiết lập tùy chọn", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Personal Profile Panel */}
      <div className="p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-blue-500" />
            Thông tin cá nhân
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wider">
            Thay đổi thông tin hồ sơ tài khoản của bạn
          </p>
        </div>

        <form onSubmit={handleUpdateName} className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Họ và tên hiển thị
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-sm focus:outline-none focus:border-blue-500"
                placeholder="Nhập họ tên hiển thị..."
              />
              <button
                type="submit"
                disabled={isUpdatingName || name.trim() === userProfile.name}
                className="flex items-center gap-1.5 px-5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white shadow-md shadow-blue-600/5 cursor-pointer transition-all active:scale-98 shrink-0 min-h-[44px]"
              >
                {isUpdatingName ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Lưu"}
              </button>
            </div>
          </div>
        </form>

        <form onSubmit={handleUpdateEmail} className="space-y-4 max-w-lg pt-4 border-t border-slate-100 dark:border-slate-850">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Gmail đăng nhập
              </label>
              {isGoogleUser && (
                <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold px-2 py-0.5 rounded-full">
                  Đăng nhập qua Google
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-normal mb-2">
              Email dùng để nhận thông tin hoặc sử dụng làm tài khoản đăng nhập chính của bạn.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isGoogleUser}
                className="flex-1 min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="Nhập địa chỉ Gmail mới..."
              />
              {!isGoogleUser && (
                <button
                  type="submit"
                  disabled={isUpdatingEmail || email.trim().toLowerCase() === userProfile.email.toLowerCase()}
                  className="flex items-center gap-1.5 px-5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white shadow-md shadow-blue-600/5 cursor-pointer transition-all active:scale-98 shrink-0 min-h-[44px]"
                >
                  {isUpdatingEmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Thay đổi"}
                </button>
              )}
            </div>
            {isGoogleUser && (
              <p className="text-[10px] text-amber-500 font-medium pl-1">
                * Vì bạn đăng nhập bằng Google, địa chỉ Email được quản lý bởi tài khoản Google của bạn.
              </p>
            )}
          </div>
        </form>
      </div>

      {/* 2. Password Change Panel (Only for Password Users) */}
      {!isGoogleUser && (
        <div className="p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-500" />
              Đổi mật khẩu tài khoản
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wider">
              Thay đổi mật khẩu đăng nhập trực tiếp
            </p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Mật khẩu hiện tại
              </label>
              <div className="relative">
                <input
                  type={showPassCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full min-h-[44px] pl-4 pr-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Nhập mật khẩu hiện tại..."
                />
                <button
                  type="button"
                  onClick={() => setShowPassCurrent(!showPassCurrent)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showPassNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full min-h-[44px] pl-4 pr-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)..."
                />
                <button
                  type="button"
                  onClick={() => setShowPassNew(!showPassNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showPassConfirm ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full min-h-[44px] pl-4 pr-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Nhập lại mật khẩu mới..."
                />
                <button
                  type="button"
                  onClick={() => setShowPassConfirm(!showPassConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="flex items-center justify-center gap-1.5 w-full md:w-auto px-6 py-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/5 cursor-pointer transition-all active:scale-98 min-h-[44px]"
            >
              {isUpdatingPassword ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Đang đổi mật khẩu...
                </>
              ) : (
                "Cập nhật mật khẩu mới"
              )}
            </button>
          </form>
        </div>
      )}

      {/* 3. Notification Preferences Panel */}
      <div className="p-6 md:p-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            Cấu hình tính năng Thông báo
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wider">
            Bật tắt các loại thông báo của hòm thư tạm thời
          </p>
        </div>

        <div className="space-y-4">
          {/* Item 1: Push notifications */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850">
            <div className="space-y-1 flex-1 pr-4">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-slate-400" />
                Thông báo đẩy Trình duyệt (Browser Push)
              </span>
              <span className="text-[11px] text-slate-400 font-medium leading-normal block">
                Nhận thông báo nổi của hệ thống trực tiếp trên màn hình thiết bị khi hòm thư có email mới.
              </span>
            </div>
            <div className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={userProfile.enableBrowserPush !== false}
                onChange={() => handleTogglePreference("enableBrowserPush", userProfile.enableBrowserPush !== false)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600" />
            </div>
          </div>

          {/* Item 2: Audio chime */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850">
            <div className="space-y-1 flex-1 pr-4">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-slate-400" />
                Thông báo bằng âm thanh (Sound Notification)
              </span>
              <span className="text-[11px] text-slate-400 font-medium leading-normal block">
                Phát ra âm thanh chuông "ding" êm ái khi có thư mới được gửi đến hòm thư tạm thời của bạn.
              </span>
            </div>
            <div className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={userProfile.enableSound !== false}
                onChange={() => handleTogglePreference("enableSound", userProfile.enableSound !== false)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600" />
            </div>
          </div>

          {/* Item 3: Only Unich */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850">
            <div className="space-y-1 flex-1 pr-4">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-slate-400" />
                Chỉ hiển thị thông báo đẩy từ Unich
              </span>
              <span className="text-[11px] text-slate-400 font-medium leading-normal block">
                Lọc và chỉ bật thông báo đẩy trình duyệt đối với các thư có chứa thông tin hoặc mã OTP từ Unich Wallet.
              </span>
            </div>
            <div className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={userProfile.onlyUnich === true}
                onChange={() => handleTogglePreference("onlyUnich", userProfile.onlyUnich === true)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
