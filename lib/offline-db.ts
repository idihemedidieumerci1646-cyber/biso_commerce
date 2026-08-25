import { supabase } from "@/lib/supabase";
// ============================================================
// BISO-COMMERCE — BASE OFFLINE
// IndexedDB : stockage local hors connexion
// ============================================================

const DB_NAME = "biso-commerce-offline";
const DB_VERSION = 10;

// Toutes les données que l'application pourra utiliser hors ligne
export const STORES = {
  products: "products",
  sales: "sales",
  debts: "debts",
  debtPayments: "debt_payments",
  subscriptions: "subscriptions",
  users: "users",
  syncQueue: "sync_queue",
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;

// ============================================================
// OUVRIR LA BASE
// ============================================================

export function openOfflineDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("IndexedDB est disponible uniquement dans le navigateur.")
    );
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      // PRODUITS
      if (!db.objectStoreNames.contains(STORES.products)) {
        const store = db.createObjectStore(STORES.products, {
          keyPath: "id",
        });

        store.createIndex("user_id", "user_id", {
          unique: false,
        });

        store.createIndex("name", "name", {
          unique: false,
        });
      }

      // VENTES
      if (!db.objectStoreNames.contains(STORES.sales)) {
        const store = db.createObjectStore(STORES.sales, {
          keyPath: "id",
        });

        store.createIndex("user_id", "user_id", {
          unique: false,
        });

        store.createIndex("product_id", "product_id", {
          unique: false,
        });

        store.createIndex("created_at", "created_at", {
          unique: false,
        });
      }

      // DETTES
      if (!db.objectStoreNames.contains(STORES.debts)) {
        const store = db.createObjectStore(STORES.debts, {
          keyPath: "id",
        });

        store.createIndex("user_id", "user_id", {
          unique: false,
        });
      }

      // PAIEMENTS DES DETTES
      if (!db.objectStoreNames.contains(STORES.debtPayments)) {
        const store = db.createObjectStore(STORES.debtPayments, {
          keyPath: "id",
        });

        store.createIndex("debt_id", "debt_id", {
          unique: false,
        });

        store.createIndex("user_id", "user_id", {
          unique: false,
        });
      }

      // ABONNEMENTS
      if (!db.objectStoreNames.contains(STORES.subscriptions)) {
        const store = db.createObjectStore(STORES.subscriptions, {
          keyPath: "id",
        });

        store.createIndex("user_id", "user_id", {
          unique: false,
        });
      }

      // UTILISATEURS
      if (!db.objectStoreNames.contains(STORES.users)) {
        const store = db.createObjectStore(STORES.users, {
          keyPath: "id",
        });

        store.createIndex("phone", "phone", {
          unique: false,
        });
      }

      // FILE D'ATTENTE POUR SYNCHRONISATION
      if (!db.objectStoreNames.contains(STORES.syncQueue)) {
        const store = db.createObjectStore(STORES.syncQueue, {
          keyPath: "id",
        });

        store.createIndex("user_id", "user_id", {
          unique: false,
        });

        store.createIndex("created_at", "created_at", {
          unique: false,
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };

    request.onblocked = () => {
      console.warn(
        "La base BISO-COMMERCE est bloquée par un autre onglet."
      );
    };
  });

  return dbPromise;
}

// ============================================================
// AJOUTER / REMPLACER
// ============================================================

export async function offlinePut<T>(
  storeName: StoreName,
  data: T
): Promise<void> {
  const db = await openOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");

    const store = transaction.objectStore(storeName);

    store.put(data);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

// ============================================================
// AJOUTER PLUSIEURS ÉLÉMENTS
// ============================================================

export async function offlinePutMany<T>(
  storeName: StoreName,
  data: T[]
): Promise<void> {
  const db = await openOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");

    const store = transaction.objectStore(storeName);

    for (const item of data) {
      store.put(item);
    }

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

// ============================================================
// RÉCUPÉRER UN ÉLÉMENT
// ============================================================

export async function offlineGet<T>(
  storeName: StoreName,
  id: IDBValidKey
): Promise<T | undefined> {
  const db = await openOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");

    const store = transaction.objectStore(storeName);

    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result as T | undefined);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// ============================================================
// RÉCUPÉRER TOUS LES ÉLÉMENTS
// ============================================================

export async function offlineGetAll<T>(
  storeName: StoreName
): Promise<T[]> {
  const db = await openOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");

    const store = transaction.objectStore(storeName);

    const request = store.getAll();

    request.onsuccess = () => {
      resolve((request.result || []) as T[]);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// ============================================================
// SUPPRIMER
// ============================================================

export async function offlineDelete(
  storeName: StoreName,
  id: IDBValidKey
): Promise<void> {
  const db = await openOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");

    const store = transaction.objectStore(storeName);

    store.delete(id);

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

// ============================================================
// VIDER UNE TABLE LOCALE
// ============================================================

export async function offlineClear(
  storeName: StoreName
): Promise<void> {
  const db = await openOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");

    const store = transaction.objectStore(storeName);

    store.clear();

    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

// ============================================================
// RÉCUPÉRER LES DONNÉES D'UN UTILISATEUR
// ============================================================

export async function offlineGetByUser<T>(
  storeName: StoreName,
  userId: string
): Promise<T[]> {
  const db = await openOfflineDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");

    const store = transaction.objectStore(storeName);

    const index = store.index("user_id");

    const request = index.getAll(userId);

    request.onsuccess = () => {
      resolve((request.result || []) as T[]);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// ============================================================
// AJOUTER UNE ACTION À SYNCHRONISER
// ============================================================

export type SyncAction = {
  id: string;
  user_id: string;
  table: string;
  action: "insert" | "update" | "delete";
  data: any;
  created_at: string;
};

export async function addToSyncQueue(
  action: Omit<SyncAction, "id" | "created_at">
): Promise<void> {
  const item: SyncAction = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...action,
  };

  await offlinePut(STORES.syncQueue, item);
}

// ============================================================
// RÉCUPÉRER LA FILE DE SYNCHRONISATION
// ============================================================

export async function getSyncQueue(): Promise<SyncAction[]> {
  return offlineGetAll<SyncAction>(STORES.syncQueue);
}

// ============================================================
// SUPPRIMER UNE ACTION DE SYNCHRONISATION
// ============================================================

export async function removeFromSyncQueue(
  id: string
): Promise<void> {
  await offlineDelete(STORES.syncQueue, id);
}

// ============================================================
// SYNCHRONISATION DE BASE AVEC SUPABASE
// ============================================================

let isSyncing = false;

export async function syncOfflineData(): Promise<void> {
  if (typeof window === "undefined") return;

  if (!navigator.onLine) return;

  if (isSyncing) return;

  isSyncing = true;

  try {
    const queue = await getSyncQueue();

    if (queue.length === 0) {
      return;
    }

    for (const item of queue) {
      try {
        if (item.action === "insert") {
          const { error } = await supabase
            .from(item.table)
            .insert(item.data);

          if (error) {
            console.error(
              "Erreur synchronisation INSERT:",
              error
            );

            continue;
          }
        }

        if (item.action === "update") {
          if (!item.data?.id) {
            console.warn(
              "Impossible de synchroniser UPDATE sans id."
            );

            continue;
          }

          const { id, ...updateData } = item.data;

          const { error } = await supabase
            .from(item.table)
            .update(updateData)
            .eq("id", id)
            .eq("user_id", item.user_id);

          if (error) {
            console.error(
              "Erreur synchronisation UPDATE:",
              error
            );

            continue;
          }
        }

        if (item.action === "delete") {
          if (!item.data?.id) {
            console.warn(
              "Impossible de synchroniser DELETE sans id."
            );

            continue;
          }

          const { error } = await supabase
            .from(item.table)
            .delete()
            .eq("id", item.data.id)
            .eq("user_id", item.user_id);

          if (error) {
            console.error(
              "Erreur synchronisation DELETE:",
              error
            );

            continue;
          }
        }

        // Seulement après réussite Supabase,
        // on retire l'action de la file.
        await removeFromSyncQueue(item.id);
      } catch (error) {
        console.error(
          "Erreur pendant la synchronisation:",
          error
        );
      }
    }
  } finally {
    isSyncing = false;
  }
}

// ============================================================
// ÉCOUTER LE RETOUR D'INTERNET
// ============================================================

export function startOfflineSync(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleOnline = () => {
    console.log(
      "🌐 Internet revenu — synchronisation BISO-COMMERCE..."
    );

    syncOfflineData();
  };

  window.addEventListener("online", handleOnline);

  // Si Internet est déjà disponible
  if (navigator.onLine) {
    syncOfflineData();
  }

  return () => {
    window.removeEventListener("online", handleOnline);
  };
}