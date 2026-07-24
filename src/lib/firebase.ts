import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  writeBatch,
  query,
  where,
  orderBy,
  onSnapshot,
  enableIndexedDbPersistence
} from "firebase/firestore";
import { GmailAccount, VaultItem, AllowedUser } from "../types";

// User's provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCHjgJkqVmgpZ6s5HRobpqB6XT--Sa2_zY",
  authDomain: "tgapp-30a28.firebaseapp.com",
  projectId: "tgapp-30a28",
  storageBucket: "tgapp-30a28.firebasestorage.app",
  messagingSenderId: "329047273664",
  appId: "1:329047273664:web:c9e1bfe367afb54953fd25",
  measurementId: "G-68P4PT49B0"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Enable Offline Persistence for snappier UI
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn("Firestore persistence failed: Multiple tabs open");
    } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn("Firestore persistence failed: Browser not supported");
    }
});

export { db };
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword };

const COLLECTION_NAME = "gmail_accounts";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) return null as any;
  if (data === null || typeof data !== "object") return data;
  if (Array.isArray(data)) {
    return data.map(sanitizeForFirestore) as any;
  }
  const cleanObj: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleanObj[key] = sanitizeForFirestore(value);
    }
  }
  return cleanObj;
}

/**
 * Centrally log an error to Firestore and console.
 * Defined here to avoid circular dependency with logger.ts
 */
export async function logError(
  error: any, 
  source: string = "client", 
  context: any = {}
) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : null;
  const userEmail = auth.currentUser?.email || null;

  console.error(`[${source.toUpperCase()}] Error:`, message, context);

  try {
    const id = "err_" + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    const docRef = doc(db, "error_logs", id);
    const payload = sanitizeForFirestore({ 
      message, 
      source, 
      stack, 
      context, 
      userEmail,
      id, 
      createdAt: now 
    });
    await setDoc(docRef, payload);
  } catch (e) {
    console.error("Critical: Failed to log error to Firestore", e);
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email || null,
      })) || []
    },
    operationType,
    path
  };
  
  // Log to centralized error logs
  logError(error, "firestore", { operationType, path, authInfo: errInfo.authInfo });

  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// Master Accounts Repository API that handles Firestore operations
export const accountsRepo = {
  /**
   * Subscribe to real-time account updates
   */
  subscribe(callback: (accounts: GmailAccount[]) => void, onError?: (error: any) => void) {
    console.log("Firestore: Establishing real-time subscription...");
    const colRef = collection(db, COLLECTION_NAME);
    const q = query(colRef, orderBy("updatedAt", "desc"));
    
    return onSnapshot(q, (snapshot) => {
      console.log(`Firestore: Received update with ${snapshot.docs.length} documents`);
      const accounts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GmailAccount[];
      callback(accounts);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
      if (onError) onError(error);
    });
  },

  /**
   * Fetch all accounts (Manual)
   */
  async getAll(): Promise<GmailAccount[]> {
    try {
      console.log("Firestore: Fetching all accounts manually...");
      const colRef = collection(db, COLLECTION_NAME);
      const q = query(colRef, orderBy("updatedAt", "desc"));
      const snapshot = await getDocs(q);
      console.log(`Firestore: Manual fetch returned ${snapshot.docs.length} documents`);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GmailAccount[];
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
      return [];
    }
  },

  /**
   * Create a new Gmail account
   */
  async create(account: Omit<GmailAccount, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const id = "acc_" + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    console.log(`Firestore: Creating new account ${account.email} (ID: ${id})`);
    
    const docRef = doc(db, COLLECTION_NAME, id);
    try {
      await setDoc(docRef, {
        ...account,
        id,
        createdAt: now,
        updatedAt: now
      });
      console.log(`Firestore: Successfully created ${account.email}`);
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
      return "";
    }
  },

  /**
   * Update an existing account
   */
  async update(id: string, updates: Partial<Omit<GmailAccount, "id" | "createdAt">>): Promise<void> {
    const now = new Date().toISOString();
    console.log(`Firestore: Updating account ID: ${id}`);
    const docRef = doc(db, COLLECTION_NAME, id);
    try {
      await updateDoc(docRef, {
        ...updates,
        updatedAt: now
      });
      console.log(`Firestore: Successfully updated account ID: ${id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, COLLECTION_NAME);
    }
  },

  /**
   * Delete an account
   */
  async delete(id: string): Promise<void> {
    console.log(`Firestore: Attempting to delete account ID: ${id}`);
    const docRef = doc(db, COLLECTION_NAME, id);
    try {
      await deleteDoc(docRef);
      console.log(`Firestore: Successfully deleted account ID: ${id}`);
    } catch (error) {
      console.error(`Firestore: Error deleting account ID: ${id}`, error);
      handleFirestoreError(error, OperationType.DELETE, COLLECTION_NAME);
    }
  },

  /**
   * Delete multiple accounts in a single batch
   */
  async deleteMultiple(ids: string[]): Promise<void> {
    try {
      console.log(`Firestore: Beginning batch delete of ${ids.length} accounts`);
      const batch = writeBatch(db);
      ids.forEach(id => {
        const docRef = doc(db, COLLECTION_NAME, id);
        batch.delete(docRef);
      });
      await batch.commit();
      console.log(`Firestore: Successfully batch deleted ${ids.length} accounts`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, COLLECTION_NAME);
    }
  },

  /**
   * Bulk import accounts
   */
  async importBulk(accounts: Omit<GmailAccount, "id" | "createdAt" | "updatedAt">[]): Promise<void> {
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    console.log(`Firestore: Beginning batch import of ${accounts.length} accounts`);

    for (const raw of accounts) {
      const id = "acc_" + Math.random().toString(36).substring(2, 11);
      const docRef = doc(db, COLLECTION_NAME, id);
      batch.set(docRef, {
        ...raw,
        id,
        createdAt: now,
        updatedAt: now
      });
    }
    try {
      await batch.commit();
      console.log(`Firestore: Successfully committed batch import of ${accounts.length} accounts`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTION_NAME);
    }
  }
};

const VAULT_COLLECTION = "web_vault";

export const vaultRepo = {
  subscribe(callback: (items: VaultItem[]) => void, onError?: (error: any) => void) {
    const colRef = collection(db, VAULT_COLLECTION);
    const q = query(colRef, orderBy("updatedAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as VaultItem[];
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, VAULT_COLLECTION);
      if (onError) onError(error);
    });
  },

  async create(item: Omit<VaultItem, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const id = "vault_" + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    const docRef = doc(db, VAULT_COLLECTION, id);
    try {
      await setDoc(docRef, { ...item, id, createdAt: now, updatedAt: now });
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, VAULT_COLLECTION);
      return "";
    }
  },

  async update(id: string, updates: Partial<Omit<VaultItem, "id" | "createdAt">>): Promise<void> {
    const now = new Date().toISOString();
    const docRef = doc(db, VAULT_COLLECTION, id);
    try {
      await updateDoc(docRef, { ...updates, updatedAt: now });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, VAULT_COLLECTION);
    }
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, VAULT_COLLECTION, id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, VAULT_COLLECTION);
    }
  }
};

const ALLOWED_USERS_COLLECTION = "allowed_users";

export const allowedUsersRepo = {
  subscribe(callback: (items: AllowedUser[]) => void, onError?: (error: any) => void) {
    const colRef = collection(db, ALLOWED_USERS_COLLECTION);
    const q = query(colRef, orderBy("updatedAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AllowedUser[];
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, ALLOWED_USERS_COLLECTION);
      if (onError) onError(error);
    });
  },

  subscribeOne(email: string, callback: (user: AllowedUser | null) => void, onError?: (error: any) => void) {
    const id = email.trim().toLowerCase();
    const docRef = doc(db, ALLOWED_USERS_COLLECTION, id);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as AllowedUser);
      } else {
        callback(null);
      }
    }, (error) => {
      if (onError) onError(error);
    });
  },

  async getAll(): Promise<AllowedUser[]> {
    try {
      const colRef = collection(db, ALLOWED_USERS_COLLECTION);
      const q = query(colRef, orderBy("updatedAt", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AllowedUser[];
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, ALLOWED_USERS_COLLECTION);
      return [];
    }
  },

  async getById(email: string): Promise<AllowedUser | null> {
    try {
      const id = email.trim().toLowerCase();
      const docRef = doc(db, ALLOWED_USERS_COLLECTION, id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return { id: snapshot.id, ...snapshot.data() } as AllowedUser;
    } catch (error) {
      console.error("Error getting user by id:", error);
      return null;
    }
  },

  async getByUsername(username: string): Promise<AllowedUser | null> {
    try {
      const colRef = collection(db, ALLOWED_USERS_COLLECTION);
      const q = query(colRef, where("username", "==", username));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as AllowedUser;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return null;
    }
  },

  async create(item: Omit<AllowedUser, "createdAt" | "updatedAt">): Promise<string> {
    const id = item.email.trim().toLowerCase();
    const now = new Date().toISOString();
    const docRef = doc(db, ALLOWED_USERS_COLLECTION, id);
    try {
      const payload = sanitizeForFirestore({
        ...item,
        id,
        email: item.email.trim().toLowerCase(),
        createdAt: now,
        updatedAt: now
      });
      await setDoc(docRef, payload);
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, ALLOWED_USERS_COLLECTION);
      return "";
    }
  },

  async update(id: string, updates: Partial<Omit<AllowedUser, "id" | "createdAt">>): Promise<void> {
    const now = new Date().toISOString();
    const docRef = doc(db, ALLOWED_USERS_COLLECTION, id);
    const sanitizedUpdates: any = { ...updates, updatedAt: now };
    if (updates.email) {
      sanitizedUpdates.email = updates.email.trim().toLowerCase();
    }
    try {
      await updateDoc(docRef, sanitizeForFirestore(sanitizedUpdates));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, ALLOWED_USERS_COLLECTION);
    }
  },

  async delete(id: string): Promise<void> {
    console.log(`Firestore: Attempting to delete allowed user ID: ${id}`);
    const docRef = doc(db, ALLOWED_USERS_COLLECTION, id);
    try {
      await deleteDoc(docRef);
      console.log(`Firestore: Successfully deleted allowed user ID: ${id}`);
    } catch (error) {
      console.error(`Firestore: Error deleting allowed user ID: ${id}`, error);
      handleFirestoreError(error, OperationType.DELETE, ALLOWED_USERS_COLLECTION);
    }
  }
};

const DOMAIN_STATUS_COLLECTION = "domain_status";
export const domainStatusRepo = {
  subscribe(callback: (items: any[]) => void, onError?: (error: any) => void) {
    const colRef = collection(db, DOMAIN_STATUS_COLLECTION);
    return onSnapshot(colRef, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, DOMAIN_STATUS_COLLECTION);
      if (onError) onError(error);
    });
  },
  async getAll(): Promise<any[]> {
    try {
      const colRef = collection(db, DOMAIN_STATUS_COLLECTION);
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, DOMAIN_STATUS_COLLECTION);
      return [];
    }
  },
  async setStatus(domain: string, isWorking: boolean): Promise<void> {
    const id = domain.replace(/\./g, "_");
    const now = new Date().toISOString();
    const docRef = doc(db, DOMAIN_STATUS_COLLECTION, id);
    try {
      await setDoc(docRef, { id, domain, isWorking, updatedAt: now }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, DOMAIN_STATUS_COLLECTION);
    }
  }
};

const DOMAIN_REPORTS_COLLECTION = "domain_reports";
export const domainReportsRepo = {
  subscribe(callback: (items: any[]) => void, onError?: (error: any) => void) {
    const colRef = collection(db, DOMAIN_REPORTS_COLLECTION);
    const q = query(colRef, orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, DOMAIN_REPORTS_COLLECTION);
      if (onError) onError(error);
    });
  },
  async create(report: Omit<any, "id" | "createdAt">): Promise<string> {
    const id = "rep_" + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    const docRef = doc(db, DOMAIN_REPORTS_COLLECTION, id);
    try {
      await setDoc(docRef, { ...report, id, createdAt: now });
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, DOMAIN_REPORTS_COLLECTION);
      return "";
    }
  },
  async hasReport(domain: string): Promise<boolean> {
    try {
      const colRef = collection(db, DOMAIN_REPORTS_COLLECTION);
      const q = query(colRef, where("domain", "==", domain));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error("Error checking report", error);
      return false;
    }
  },
  async delete(id: string): Promise<void> {
    const docRef = doc(db, DOMAIN_REPORTS_COLLECTION, id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, DOMAIN_REPORTS_COLLECTION);
    }
  }
};

const TEMP_EMAILS_LOG_COLLECTION = "temp_emails_log";
export const tempEmailsLogRepo = {
  subscribe(callback: (items: any[]) => void, onError?: (error: any) => void) {
    const colRef = collection(db, TEMP_EMAILS_LOG_COLLECTION);
    const q = query(colRef, orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, TEMP_EMAILS_LOG_COLLECTION);
      if (onError) onError(error);
    });
  },
  async create(log: Omit<any, "id" | "createdAt">): Promise<string> {
    const id = "log_" + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    const docRef = doc(db, TEMP_EMAILS_LOG_COLLECTION, id);
    try {
      await setDoc(docRef, { ...log, id, createdAt: now });
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, TEMP_EMAILS_LOG_COLLECTION);
      return "";
    }
  },
  async delete(id: string): Promise<void> {
    const docRef = doc(db, TEMP_EMAILS_LOG_COLLECTION, id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, TEMP_EMAILS_LOG_COLLECTION);
    }
  }
};

const TEST_HISTORY_COLLECTION = "test_history";
export const testHistoryRepo = {
  subscribe(callback: (items: any[]) => void, onError?: (error: any) => void) {
    const colRef = collection(db, TEST_HISTORY_COLLECTION);
    const q = query(colRef, orderBy("testedAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, TEST_HISTORY_COLLECTION);
      if (onError) onError(error);
    });
  },
  async create(history: Omit<any, "id" | "testedAt">): Promise<string> {
    const id = "test_" + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    const docRef = doc(db, TEST_HISTORY_COLLECTION, id);
    try {
      await setDoc(docRef, { ...history, id, testedAt: now });
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, TEST_HISTORY_COLLECTION);
      return "";
    }
  }
};

const TEMP_EMAIL_HISTORY_COLLECTION = "temp_email_history";
export const tempEmailHistoryRepo = {
  subscribe(userEmail: string, callback: (items: any[]) => void, onError?: (error: any) => void) {
    const colRef = collection(db, TEMP_EMAIL_HISTORY_COLLECTION);
    const q = query(
      colRef, 
      where("ownerEmail", "==", userEmail.toLowerCase())
    );
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      items.sort((a: any, b: any) => {
        const dateA = a.generatedAt ? new Date(a.generatedAt).getTime() : 0;
        const dateB = b.generatedAt ? new Date(b.generatedAt).getTime() : 0;
        return dateB - dateA;
      });
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, TEMP_EMAIL_HISTORY_COLLECTION);
      if (onError) onError(error);
    });
  },
  async getAll(userEmail: string): Promise<any[]> {
    try {
      const colRef = collection(db, TEMP_EMAIL_HISTORY_COLLECTION);
      const q = query(
        colRef, 
        where("ownerEmail", "==", userEmail.toLowerCase())
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      items.sort((a: any, b: any) => {
        const dateA = a.generatedAt ? new Date(a.generatedAt).getTime() : 0;
        const dateB = b.generatedAt ? new Date(b.generatedAt).getTime() : 0;
        return dateB - dateA;
      });
      return items;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, TEMP_EMAIL_HISTORY_COLLECTION);
      return [];
    }
  },
  async create(item: any): Promise<string> {
    const id = item.email.replace(/[@.]/g, "_");
    const docRef = doc(db, TEMP_EMAIL_HISTORY_COLLECTION, id);
    try {
      await setDoc(docRef, { 
        ...item, 
        id,
        ownerEmail: item.ownerEmail.toLowerCase(),
        generatedAt: item.generatedAt || new Date().toISOString() 
      }, { merge: true });
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, TEMP_EMAIL_HISTORY_COLLECTION);
      return "";
    }
  },
  async update(email: string, updates: any): Promise<void> {
    const id = email.replace(/[@.]/g, "_");
    const docRef = doc(db, TEMP_EMAIL_HISTORY_COLLECTION, id);
    try {
      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, TEMP_EMAIL_HISTORY_COLLECTION);
    }
  },
  async delete(email: string): Promise<void> {
    const id = email.replace(/[@.]/g, "_");
    const docRef = doc(db, TEMP_EMAIL_HISTORY_COLLECTION, id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, TEMP_EMAIL_HISTORY_COLLECTION);
    }
  },
  async clearAll(userEmail: string): Promise<void> {
    try {
      const colRef = collection(db, TEMP_EMAIL_HISTORY_COLLECTION);
      const q = query(colRef, where("ownerEmail", "==", userEmail.toLowerCase()));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, TEMP_EMAIL_HISTORY_COLLECTION);
    }
  }
};

const ERROR_LOGS_COLLECTION = "error_logs";
export const errorLogsRepo = {
  subscribe(callback: (items: any[]) => void, onError?: (error: any) => void) {
    const colRef = collection(db, ERROR_LOGS_COLLECTION);
    const q = query(colRef, orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, ERROR_LOGS_COLLECTION);
      if (onError) onError(error);
    });
  },
  async create(log: { message: string; source: string; stack?: string; context?: any; userEmail?: string }): Promise<string> {
    const id = "err_" + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    const docRef = doc(db, ERROR_LOGS_COLLECTION, id);
    try {
      const payload = sanitizeForFirestore({ ...log, id, createdAt: now });
      await setDoc(docRef, payload);
      return id;
    } catch (error) {
      console.error("Critical: Failed to log error to Firestore", error);
      return "";
    }
  },
  async delete(id: string): Promise<void> {
    const docRef = doc(db, ERROR_LOGS_COLLECTION, id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, ERROR_LOGS_COLLECTION);
    }
  },
  async clearAll(): Promise<void> {
    try {
      const colRef = collection(db, ERROR_LOGS_COLLECTION);
      const snapshot = await getDocs(colRef);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, ERROR_LOGS_COLLECTION);
    }
  }
};

