export enum AccountStatus {
  ACTIVE = "ACTIVE", // Hoạt động
  UNUSED = "UNUSED", // Chưa sử dụng
  IN_USE = "IN_USE", // Đang sử dụng
  LOCKED = "LOCKED", // Đã khóa
  SUSPENDED = "SUSPENDED" // Tạm ngưng
}

export interface GmailAccount {
  id: string;
  email: string;
  password?: string; // We'll store password in string format
  status: AccountStatus;
  note?: string;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}

export interface DashboardStats {
  total: number;
  active: number;
  unused: number;
  inUse: number;
  locked: number;
  suspended: number;
}

export type Theme = "light" | "dark";

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}
