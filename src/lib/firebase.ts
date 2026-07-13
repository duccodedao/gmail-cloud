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
import { GmailAccount } from "../types";

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
      console.error("Firestore subscription error:", error);
      if (onError) onError(error);
    });
  },

  /**
   * Fetch all accounts (Manual)
   */
  async getAll(): Promise<GmailAccount[]> {
    console.log("Firestore: Fetching all accounts manually...");
    const colRef = collection(db, COLLECTION_NAME);
    const q = query(colRef, orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);
    console.log(`Firestore: Manual fetch returned ${snapshot.docs.length} documents`);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as GmailAccount[];
  },

  /**
   * Create a new Gmail account
   */
  async create(account: Omit<GmailAccount, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const id = "acc_" + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    console.log(`Firestore: Creating new account ${account.email} (ID: ${id})`);
    
    const docRef = doc(db, COLLECTION_NAME, id);
    await setDoc(docRef, {
      ...account,
      id,
      createdAt: now,
      updatedAt: now
    });
    console.log(`Firestore: Successfully created ${account.email}`);

    return id;
  },

  /**
   * Update an existing account
   */
  async update(id: string, updates: Partial<Omit<GmailAccount, "id" | "createdAt">>): Promise<void> {
    const now = new Date().toISOString();
    console.log(`Firestore: Updating account ID: ${id}`);
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: now
    });
    console.log(`Firestore: Successfully updated account ID: ${id}`);
  },

  /**
   * Delete an account
   */
  async delete(id: string): Promise<void> {
    console.log(`Firestore: Deleting account ID: ${id}`);
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    console.log(`Firestore: Successfully deleted account ID: ${id}`);
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
      console.error("Firestore batch delete error:", error);
      throw error;
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
    await batch.commit();
    console.log(`Firestore: Successfully committed batch import of ${accounts.length} accounts`);
  }
};
