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
  sid_token?: string;
}

const LOCAL_STORAGE_DELETED = "tempEmail_deleted";
const LOCAL_STORAGE_READ = "tempEmail_read";
const LOCAL_STORAGE_SIMULATED = "tempEmail_simulated";

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

function getSimulatedMessages(): Record<string, TempEmailMessage[]> {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_SIMULATED);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function addSimulatedMessage(email: string, msg: TempEmailMessage) {
  try {
    const msgs = getSimulatedMessages();
    if (!msgs[email]) msgs[email] = [];
    msgs[email].unshift(msg);
    localStorage.setItem(LOCAL_STORAGE_SIMULATED, JSON.stringify(msgs));
  } catch {}
}

const GUERRILLA_API = "https://api.guerrillamail.com/ajax.php";

async function getGuerrillaToken(login: string): Promise<string> {
  const response = await fetch(`${GUERRILLA_API}?f=set_email_user&email_user=${encodeURIComponent(login)}`);
  if (!response.ok) throw new Error('Failed to fetch token from Guerrilla Mail');
  const data = await response.json();
  if (!data.sid_token) throw new Error('No sid_token returned from Guerrilla Mail');
  return data.sid_token;
}

// Fetch active domains
export async function getAvailableDomains(): Promise<string[]> {
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

// Generate new temporary email using Guerrilla Mail API directly
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

  const sid_token = await getGuerrillaToken(login);
  const email = `${login}@${domain}`;

  return {
    email,
    login,
    domain,
    mode: "real",
    sid_token
  };
}

// Get messages for an email address
export async function fetchMessages(info: GeneratedEmailInfo): Promise<TempEmailMessage[]> {
  if (!info || !info.email) return [];
  
  let token = info.sid_token;
  if (!token) {
    token = await getGuerrillaToken(info.login);
    info.sid_token = token;
  }

  const deleted = getLocalSet(LOCAL_STORAGE_DELETED);
  const read = getLocalSet(LOCAL_STORAGE_READ);
  const simulated = getSimulatedMessages()[info.email] || [];

  try {
    const response = await fetch(`${GUERRILLA_API}?f=get_email_list&offset=0&sid_token=${token}`);
    if (!response.ok) throw new Error("Failed to fetch messages from Guerrilla Mail");
    const data = await response.json();
    
    let list: any[] = Array.isArray(data.list) ? data.list : [];
    
    const realMessages = list
      .filter(msg => !deleted.has(String(msg.mail_id)))
      .map(msg => {
        const fromStr = msg.mail_from;
        const senderName = fromStr.split('@')[0] || fromStr;
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random&color=fff&size=80`;
        return {
          id: String(msg.mail_id),
          from: fromStr,
          to: info.email,
          subject: msg.mail_subject,
          date: msg.mail_timestamp > 0 ? new Date(msg.mail_timestamp * 1000).toISOString() : new Date().toISOString(),
          read: msg.mail_read === 1 || read.has(String(msg.mail_id)),
          senderName,
          avatarUrl
        } as TempEmailMessage;
      });

    const activeSimulated = simulated.filter(msg => !deleted.has(msg.id));
    
    return [...activeSimulated, ...realMessages].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    throw error;
  }
}

// Fetch single message details
export async function fetchMessageDetails(info: GeneratedEmailInfo, id: string): Promise<TempEmailMessage> {
  let token = info.sid_token;
  if (!token) {
    token = await getGuerrillaToken(info.login);
    info.sid_token = token;
  }

  addToLocalSet(LOCAL_STORAGE_READ, id);

  // Check if simulated
  const simulated = getSimulatedMessages()[info.email] || [];
  const simMsg = simulated.find(m => m.id === id);
  if (simMsg) {
    simMsg.read = true;
    return simMsg;
  }

  const response = await fetch(`${GUERRILLA_API}?f=fetch_email&email_id=${id}&sid_token=${token}`);
  if (!response.ok) throw new Error("Failed to fetch message details");
  const msg = await response.json();

  const fromStr = msg.mail_from;
  const senderName = fromStr.split('@')[0] || fromStr;
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random&color=fff&size=80`;

  return {
    id: String(msg.mail_id),
    from: fromStr,
    to: info.email,
    subject: msg.mail_subject,
    date: msg.mail_timestamp > 0 ? new Date(msg.mail_timestamp * 1000).toISOString() : new Date().toISOString(),
    body: msg.mail_body || msg.mail_excerpt || "",
    textBody: msg.mail_excerpt || "",
    attachments: [],
    read: true,
    avatarUrl,
    senderName
  };
}

// Delete message
export async function deleteMessage(info: GeneratedEmailInfo, id: string): Promise<boolean> {
  let token = info.sid_token;
  if (!token) {
    token = await getGuerrillaToken(info.login);
    info.sid_token = token;
  }

  addToLocalSet(LOCAL_STORAGE_DELETED, id);

  try {
    const response = await fetch(`${GUERRILLA_API}?f=del_email&email_ids[]=${id}&sid_token=${token}`);
    return response.ok;
  } catch {
    return true; // We already marked it as deleted locally
  }
}

// Trigger simulation of incoming email
export async function simulateIncomingEmail(
  email: string,
  senderType: "facebook" | "spotify" | "paypal" | "custom",
  customSender?: string,
  customSubject?: string
): Promise<TempEmailMessage> {
  
  let from = customSender || "unknown@service.com";
  let subject = customSubject || "You have a new notification";
  let body = "<p>This is a simulated message for testing purposes.</p>";

  if (senderType === "facebook") {
    from = "notification@facebookmail.com";
    subject = "Someone tagged you in a photo";
    body = "<p>Hi there,</p><p>You were tagged in a new photo on Facebook.</p>";
  } else if (senderType === "spotify") {
    from = "no-reply@spotify.com";
    subject = "Your new Discover Weekly is ready";
    body = "<p>Discover new music based on what you love.</p>";
  } else if (senderType === "paypal") {
    from = "service@paypal.com";
    subject = "Receipt for your payment";
    body = "<p>You sent a payment of $15.00 USD.</p>";
  }

  const senderName = from.split("@")[0];
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random&color=fff&size=80`;

  const simulatedMsg: TempEmailMessage = {
    id: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    from,
    to: email,
    subject,
    date: new Date().toISOString(),
    body,
    textBody: body.replace(/<[^>]+>/g, ''),
    attachments: [],
    read: false,
    avatarUrl,
    senderName
  };

  addSimulatedMessage(email, simulatedMsg);
  return simulatedMsg;
}

