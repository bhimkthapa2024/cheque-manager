/**
 * Simple Local Storage utility for development
 * This allows the app to function without a live Firebase connection.
 */

const isServer = typeof window === 'undefined';

export const storage = {
  get: <T>(key: string): T[] => {
    if (isServer) return [];
    const data = localStorage.getItem(`chq_${key}`);
    return data ? JSON.parse(data) : [];
  },

  set: <T>(key: string, data: T[]): void => {
    if (isServer) return;
    localStorage.setItem(`chq_${key}`, JSON.stringify(data));
  },

  add: <T extends { id?: string }>(key: string, item: T): T => {
    const data = storage.get<T>(key);
    const newItem = { ...item, id: item.id || `local_${Date.now()}`, createdAt: new Date() };
    data.push(newItem);
    storage.set(key, data);
    return newItem;
  },

  update: <T extends { id: string }>(key: string, id: string, updates: Partial<T>): void => {
    const data = storage.get<T>(key);
    const index = data.findIndex(i => i.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...updates, updatedAt: new Date() };
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
    const newLog = {
      id: `log_${Date.now()}`,
      companyId,
      userId: "Admin User", // For dev, we use a static user
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
