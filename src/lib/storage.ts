/**
 * Firestore Real-Time Syncing Storage Utility
 * Integrates LocalStorage for instant UI changes and offline capability,
 * with Firestore for real-time multi-device database syncing.
 */

import { db, auth } from "./firebase";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";

const isServer = typeof window === 'undefined';

const getCollectionName = (key: string): string => {
  // Map local storage key prefix to Firestore collection names
  if (key === "audit_logs") return "audit_logs";
  return key;
};

// Helper to convert Date objects and serialize data cleanly for Firestore
const cleanForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(cleanForFirestore);
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          cleaned[key] = cleanForFirestore(val);
        }
      }
    }
    return cleaned;
  }
  return obj;
};

export const storage = {
  get: <T>(key: string): T[] => {
    if (isServer) return [];
    const data = localStorage.getItem(`chq_${key}`);
    return data ? JSON.parse(data) : [];
  },

  set: <T extends { id: string }>(key: string, data: T[]): void => {
    if (isServer) return;
    
    const oldData = storage.get<T>(key);
    localStorage.setItem(`chq_${key}`, JSON.stringify(data));

    // Async Sync to Firestore
    const colName = getCollectionName(key);
    
    // Identify and delete removed items
    const newIds = new Set(data.map(item => item.id));
    oldData.forEach(item => {
      if (item.id && !newIds.has(item.id)) {
        deleteDoc(doc(db, colName, item.id)).catch(err => 
          console.error(`Firestore sync delete error for ${colName}/${item.id}:`, err)
        );
      }
    });

    // Save current items
    data.forEach(item => {
      if (item.id) {
        const cleaned = cleanForFirestore(item);
        setDoc(doc(db, colName, item.id), cleaned, { merge: true }).catch(err => 
          console.error(`Firestore sync write error for ${colName}/${item.id}:`, err)
        );
      }
    });
  },

  add: <T extends { id?: string }>(key: string, item: T): T => {
    const data = storage.get<T>(key);
    const newItem = { ...item, id: item.id || `local_${Date.now()}`, createdAt: new Date() };
    
    // Cast newItem as T and push
    data.push(newItem as unknown as T);
    
    // storage.set will handle local writing and Firestore sync
    storage.set(key, data as any);
    return newItem;
  },

  update: <T extends { id: string }>(key: string, id: string, updates: Partial<T>): void => {
    const data = storage.get<T>(key);
    const index = data.findIndex(i => i.id === id);
    if (index !== -1) {
      const updatedItem = { ...data[index], ...updates, updatedAt: new Date() };
      data[index] = updatedItem;
      storage.set(key, data);
    }
  },

  delete: (key: string, id: string): void => {
    const data = storage.get<any>(key);
    const filtered = data.filter((i: any) => i.id !== id);
    storage.set(key, filtered);
  },

  log: (companyId: string, action: string, entityType: string, entityId: string, metadata: any = {}): void => {
    const logs = storage.get<any>("audit_logs");
    const currentUser = auth.currentUser;
    const userId = currentUser ? (currentUser.displayName || currentUser.email || "Unknown User") : "System";
    const newLog = {
      id: `log_${Date.now()}`,
      companyId,
      userId,
      action,
      entityType,
      entityId,
      metadata,
      timestamp: new Date()
    };
    logs.unshift(newLog); // Newest first
    storage.set("audit_logs", logs.slice(0, 100)); // Keep last 100
  }
};

let isSyncStarted = false;
const collectionsToSync = ["companies", "banks", "chequeBooks", "cheques", "vendors", "audit_logs"];

// Start Firestore real-time listener sync
export const startFirestoreSync = () => {
  if (isServer) return;
  if (!auth.currentUser) return;
  if (isSyncStarted) return;
  isSyncStarted = true;

  collectionsToSync.forEach(key => {
    const colRef = collection(db, getCollectionName(key));
    
    onSnapshot(colRef, (snapshot) => {
      const firestoreItems: any[] = [];
      snapshot.forEach(doc => {
        firestoreItems.push({ ...doc.data(), id: doc.id });
      });

      // Get current local items to see if we have unsynced data
      const currentStored = localStorage.getItem(`chq_${key}`);
      const localItems: any[] = currentStored ? JSON.parse(currentStored) : [];
      
      const firestoreIds = new Set(firestoreItems.map(item => item.id));
      let hasUnsyncedLocalData = false;

      // Upload any local items that are missing from Firestore
      localItems.forEach(localItem => {
        if (!firestoreIds.has(localItem.id)) {
          const cleaned = cleanForFirestore(localItem);
          setDoc(doc(db, getCollectionName(key), localItem.id), cleaned, { merge: true }).catch(err => 
            console.error(`Firestore auto-sync write error for ${key}/${localItem.id}:`, err)
          );
          firestoreItems.push(localItem); // Optimistically add to list so UI doesn't jump
          hasUnsyncedLocalData = true;
        }
      });

      const newSerialized = JSON.stringify(firestoreItems);
      
      if (currentStored !== newSerialized || hasUnsyncedLocalData) {
        localStorage.setItem(`chq_${key}`, newSerialized);
        window.dispatchEvent(new CustomEvent("storage_sync", { detail: { key } }));
      }
    }, (error) => {
      console.error(`Firestore real-time sync subscription error for collection '${key}':`, error);
    });
  });
};
