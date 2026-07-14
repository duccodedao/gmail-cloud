import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  writeBatch,
  query,
  orderBy,
  onSnapshot,
  enableIndexedDbPersistence
} from "firebase/firestore";
import { GmailAccount, VaultItem } from "../types";

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

export { signInWithPopup, signOut, onAuthStateChanged };

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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
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
    console.log(`Firestore: Deleting account ID: ${id}`);
    const docRef = doc(db, COLLECTION_NAME, id);
    try {
      await deleteDoc(docRef);
      console.log(`Firestore: Successfully deleted account ID: ${id}`);
    } catch (error) {
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

