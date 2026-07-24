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

export interface AllowedUser {
  id: string; // Document ID (usually the lowercase email)
  email: string;
  name: string;
  username?: string;
  isApproved?: boolean;
  role: "admin" | "user";
  emailLimit?: number; // Optional limit for email creation
  note?: string;
  enableBrowserPush?: boolean;
  enableSound?: boolean;
  onlyUnich?: boolean;
  lastLoginIp?: string;
  lastLoginLat?: number;
  lastLoginLng?: number;
  lastLoginLocation?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DomainStatus {
  id: string; // Document ID (the domain name itself)
  domain: string;
  isWorking: boolean;
  updatedAt: string;
}

export interface DomainReport {
  id: string;
  domain: string;
  userEmail: string;
  userName: string;
  note: string;
  createdAt: string;
}

export interface TempEmailLog {
  id: string;
  email: string;
  domain: string;
  userEmail: string;
  createdAt: string;
}

export interface TestHistory {
  id: string;
  domain: string;
  status: "Hợp lệ" | "Hỏng";
  testedAt: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}
