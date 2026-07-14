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
  mode: "real" | "simulated";
}

// Fetch active domains from our Express backend API
export async function getAvailableDomains(): Promise<string[]> {
  try {
    const response = await fetch("/api/domains");
    if (!response.ok) throw new Error("Failed to fetch domains");
    const json = await response.json();
    return json.success && Array.isArray(json.domains) ? json.domains : [];
  } catch (err) {
    console.error("Could not fetch domain list", err);
    return [
      "guerrillamail.com",
      "guerrillamail.info",
      "grr.la",
      "guerrillamail.biz",
      "guerrillamail.de",
      "guerrillamail.net",
      "guerrillamail.org",
      "guerrillamailblock.com",
      "pokemail.net",
      "sharklasers.com",
      "spam4.me"
    ];
  }
}

// Generate new temporary email using our Express backend API
export async function generateTempEmail(
  mode: "real" | "simulated",
  customPrefix?: string,
  customDomain?: string
): Promise<GeneratedEmailInfo> {
  const payload = {
    mode,
    customName: customPrefix?.trim() || undefined,
    customDomain: customDomain || undefined
  };

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Failed to generate temporary email from server");
  }

  const json = await response.json();
  if (!json.success) {
    throw new Error(json.error || "Failed to generate email");
  }

  return {
    email: json.data.email,
    login: json.data.login,
    domain: json.data.domain,
    mode: json.data.mode
  };
}

// Get messages for an email address from Express backend API
export async function fetchMessages(info: GeneratedEmailInfo): Promise<TempEmailMessage[]> {
  if (!info || !info.email) return [];
  
  const queryParams = new URLSearchParams({
    email: info.email,
    login: info.login,
    domain: info.domain,
    mode: info.mode
  });

  try {
    const response = await fetch(`/api/messages?${queryParams.toString()}`);
    if (!response.ok) throw new Error("Failed to fetch messages from server");
    const json = await response.json();

    if (!json.success || !Array.isArray(json.data)) return [];

    return json.data.map((msg: any) => ({
      id: String(msg.id),
      from: msg.from || "unknown@sender.com",
      to: info.email,
      subject: msg.subject || "(No Subject)",
      date: msg.date || new Date().toISOString(),
      read: !!msg.isRead,
      avatarUrl: msg.avatarUrl,
      senderName: msg.senderName,
      body: msg.body,
      textBody: msg.textBody,
      attachments: msg.attachments || []
    }));
  } catch (error) {
    throw error;
  }
}

// Fetch single message details from Express backend API
export async function fetchMessageDetails(info: GeneratedEmailInfo, id: string): Promise<TempEmailMessage> {
  const queryParams = new URLSearchParams({
    email: info.email,
    login: info.login,
    domain: info.domain,
    mode: info.mode
  });

  const response = await fetch(`/api/message/${id}?${queryParams.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch message details from server");
  const json = await response.json();

  if (!json.success || !json.data) {
    throw new Error(json.error || "Message details not found");
  }

  const detailed = json.data;
  return {
    id: String(detailed.id),
    from: detailed.from || "unknown@sender.com",
    to: info.email,
    subject: detailed.subject || "(No Subject)",
    date: detailed.date || new Date().toISOString(),
    body: detailed.htmlBody || detailed.body || "",
    textBody: detailed.textBody || detailed.body || "",
    attachments: (detailed.attachments || []).map((att: any) => ({
      filename: att.filename,
      contentType: att.contentType,
      size: att.size || 0
    })),
    read: true,
    avatarUrl: detailed.avatarUrl,
    senderName: detailed.senderName
  };
}

// Delete message from Express backend API
export async function deleteMessage(info: GeneratedEmailInfo, id: string): Promise<boolean> {
  const response = await fetch(`/api/message/${id}?email=${encodeURIComponent(info.email)}`, {
    method: "DELETE"
  });
  if (!response.ok) return false;
  const json = await response.json();
  return !!json.success;
}

// Trigger simulation of incoming email from Express backend API
export async function simulateIncomingEmail(
  email: string,
  senderType: "facebook" | "spotify" | "paypal" | "custom",
  customSender?: string,
  customSubject?: string
): Promise<TempEmailMessage> {
  const response = await fetch("/api/simulate-incoming", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      senderType,
      customSender,
      customSubject
    })
  });

  if (!response.ok) {
    throw new Error("Failed to trigger simulation");
  }

  const json = await response.json();
  if (!json.success || !json.data) {
    throw new Error(json.error || "Simulation response failed");
  }

  const detailed = json.data;
  return {
    id: String(detailed.id),
    from: detailed.from,
    to: email,
    subject: detailed.subject,
    date: detailed.date,
    body: detailed.htmlBody || detailed.body || "",
    textBody: detailed.textBody || detailed.body || "",
    attachments: (detailed.attachments || []).map((att: any) => ({
      filename: att.filename,
      contentType: att.contentType,
      size: att.size || 0
    })),
    read: !!detailed.isRead,
    avatarUrl: detailed.avatarUrl,
    senderName: detailed.senderName
  };
}
