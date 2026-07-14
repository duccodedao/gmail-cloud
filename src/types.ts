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
  lastPeerMeetAt?: string; // ISO String for last Peer Meet timestamp
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
  peerMet: number;
  notPeerMet: number;
}

export interface VaultItem {
  id: string;
  account: string;
  password?: string;
  webName: string;
  webLink?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type Theme = "light" | "dark";

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}
