import { AccountStatus } from "../types";

export interface TempEmailAttachment {
  filename: string;
  contentType: string;
  size: number;
}

export interface TempEmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body?: string;
  textBody?: string;
  attachments?: TempEmailAttachment[];
  read: boolean;
  avatarUrl?: string;
  senderName?: string;
}

export interface GeneratedEmailInfo {
  email: string;
  login: string;
  domain: string;
  mode: "real";
  sid_token?: string;
  password?: string;
}

const API_BASE = "/api/tempmail";

const LOCAL_STORAGE_DELETED = "tempEmail_deleted";
const LOCAL_STORAGE_READ = "tempEmail_read";

function getLocalSet(key: string): Set<string> {
  try {
    const data = localStorage.getItem(key);
    return new Set(data ? JSON.parse(data) : []);
  } catch {
    return new Set();
  }
}

function addToLocalSet(key: string, value: string) {
  try {
    const set = getLocalSet(key);
    set.add(value);
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {}
}

export async function getAvailableDomains(): Promise<string[]> {
  const url = `${API_BASE}/domains`;
  console.log(`Fetching domains from: ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch domains");
    const data = await response.json();
    return data.domains.map((d: any) => d.qdn);
  } catch (error) {
    console.error("inboxes.com domains failed", error);
    return [
      "blondmail.com", "chapsmail.com", "clowmail.com", "dropjar.com", 
      "fivermail.com", "getairmail.com", "getmule.com", "getnada.com", 
      "gimpmail.com", "givmail.com", "guysmail.com", "inboxbear.com", 
      "replyloop.com", "robot-mail.com", "tafmail.com", "temptami.com", 
      "tupmail.com", "vomoto.com", "web-library.net"
    ];
  }
}

export async function simulateIncomingWelcomeEmail(email: string) {
  console.log("simulated welcome email is disabled", email);
}

export async function generateTempEmail(
  mode: "real" | "simulated",
  customPrefix?: string,
  customDomain?: string
): Promise<GeneratedEmailInfo> {
  const domains = await getAvailableDomains();
  let domain = customDomain && domains.includes(customDomain) ? customDomain : domains[0];
  
  let login = "";
  if (customPrefix && customPrefix.trim().length > 0) {
    login = customPrefix.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (login.length === 0) login = Math.random().toString(36).substring(2, 10);
  } else {
    login = Math.random().toString(36).substring(2, 11);
  }

  const address = `${login}@${domain}`;

  // inboxes.com does not require explicit mailbox creation!
  // It simply starts receiving emails for any address you give it.
  return {
    email: address,
    login,
    domain,
    mode: "real"
  };
}

export async function fetchMessages(info: GeneratedEmailInfo): Promise<TempEmailMessage[]> {
  if (!info || !info.email) return [];
  
  try {
    const deleted = getLocalSet(LOCAL_STORAGE_DELETED);
    const read = getLocalSet(LOCAL_STORAGE_READ);

    const response = await fetch(`${API_BASE}/inbox/${encodeURIComponent(info.email)}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Inbox fetch failed", response.status, errorData);
      throw new Error(errorData.error || `Failed to fetch messages: ${response.status}`);
    }
    const data = await response.json();
    
    const list = Array.isArray(data.msgs) ? data.msgs : [];
    
    const messages = list
      .filter((msg: any) => !deleted.has(msg.uid))
      .map((msg: any) => {
        const fromStr = msg.f || "Unknown";
        const senderName = fromStr.split('@')[0] || fromStr;
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random&color=fff&size=80`;
        
        return {
          id: msg.uid,
          from: fromStr,
          to: info.email,
          subject: msg.s || "No Subject",
          date: msg.cr,
          read: read.has(msg.uid),
          senderName,
          avatarUrl
        } as TempEmailMessage;
      });

    return messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error("Error fetching messages", error);
    throw error;
  }
}

export async function fetchMessageDetails(info: GeneratedEmailInfo, id: string, markAsRead = true): Promise<TempEmailMessage> {
  if (markAsRead) {
    addToLocalSet(LOCAL_STORAGE_READ, id);
  }

  const response = await fetch(`${API_BASE}/message/${id}?email=${encodeURIComponent(info.email)}`);
  if (!response.ok) throw new Error("Failed to fetch message details");
  const msg = await response.json();

  const fromStr = msg.f || "Unknown";
  const senderName = fromStr.split('@')[0] || fromStr;
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random&color=fff&size=80`;

  return {
    id: msg.uid,
    from: fromStr,
    to: info.email,
    subject: msg.s || "No Subject",
    date: msg.cr,
    body: msg.html || msg.text || "",
    textBody: msg.text || "",
    attachments: [],
    read: true,
    avatarUrl,
    senderName
  };
}

export async function deleteMessage(info: GeneratedEmailInfo, id: string): Promise<boolean> {
  addToLocalSet(LOCAL_STORAGE_DELETED, id);
  try {
    const response = await fetch(`${API_BASE}/message/${id}`, {
      method: "DELETE"
    });
    return response.ok;
  } catch (error) {
    console.error("Delete failed", error);
    return true; // Consider it deleted locally at least
  }
}

export async function simulateIncomingEmail(): Promise<TempEmailMessage> {
  throw new Error("Simulated mode is disabled");
}
