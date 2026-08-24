import { supabase } from "@/lib/supabase";

/* ============================================================
   BISO-COMMERCE — BASE OFFLINE
   ------------------------------------------------------------
   IndexedDB :
   - stockage local
   - fonctionnement hors connexion
   - file d'attente de synchronisation
   - synchronisation automatique avec Supabase
============================================================ */

const DB_NAME = "biso-commerce-offline";
const DB_VERSION = 8;

/* ============================================================
   STORES
============================================================ */

export const STORES = {
  products: "products",
  sales: "sales",
  debts: "debts",
  debtPayments: "debt_payments",
  subscriptions: "subscriptions",
  users: "users",
  syncQueue: "sync_queue",
} as const;

type StoreName =
  (typeof STORES)[keyof typeof STORES];

/* ============================================================
   DATABASE
============================================================ */

let dbPromise: Promise<IDBDatabase> | null = null;

let isSyncing = false;

/* ============================================================
   UTILITAIRES
============================================================ */

/**
 * Vérifie si IndexedDB est disponible.
 */
function isIndexedDBAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof indexedDB !== "undefined"
  );
}

/**
 * Vérifie si le navigateur considère Internet disponible.
 */
function isOnline(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return navigator.onLine;
}

/**
 * Génère un ID fiable.
 */
function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 11)}`;
}

/* ============================================================
   OUVRIR LA BASE
============================================================ */

export function openOfflineDB(): Promise<IDBDatabase> {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(
      new Error(
        "IndexedDB est disponible uniquement dans le navigateur."
      )
    );
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    );

    /* ========================================================
       CRÉATION / MISE À JOUR
    ======================================================== */

    request.onupgradeneeded = () => {
      const db = request.result;

      /* ------------------------------------------------------
         PRODUITS
      ------------------------------------------------------ */

      if (
        !db.objectStoreNames.contains(
          STORES.products
        )
      ) {
        const store =
          db.createObjectStore(
            STORES.products,
            {
              keyPath: "id",
            }
          );

        store.createIndex(
          "user_id",
          "user_id",
          {
            unique: false,
          }
        );

        store.createIndex(
          "name",
          "name",
          {
            unique: false,
          }
        );
      }

      /* ------------------------------------------------------
         VENTES
      ------------------------------------------------------ */

      if (
        !db.objectStoreNames.contains(
          STORES.sales
        )
      ) {
        const store =
          db.createObjectStore(
            STORES.sales,
            {
              keyPath: "id",
            }
          );

        store.createIndex(
          "user_id",
          "user_id",
          {
            unique: false,
          }
        );

        store.createIndex(
          "product_id",
          "product_id",
          {
            unique: false,
          }
        );

        store.createIndex(
          "created_at",
          "created_at",
          {
            unique: false,
          }
        );
      }

      /* ------------------------------------------------------
         DETTES
      ------------------------------------------------------ */

      if (
        !db.objectStoreNames.contains(
          STORES.debts
        )
      ) {
        const store =
          db.createObjectStore(
            STORES.debts,
            {
              keyPath: "id",
            }
          );

        store.createIndex(
          "user_id",
          "user_id",
          {
            unique: false,
          }
        );
      }

      /* ------------------------------------------------------
         PAIEMENTS DETTES
      ------------------------------------------------------ */

      if (
        !db.objectStoreNames.contains(
          STORES.debtPayments
        )
      ) {
        const store =
          db.createObjectStore(
            STORES.debtPayments,
            {
              keyPath: "id",
            }
          );

        store.createIndex(
          "debt_id",
          "debt_id",
          {
            unique: false,
          }
        );

        store.createIndex(
          "user_id",
          "user_id",
          {
            unique: false,
          }
        );
      }

      /* ------------------------------------------------------
         ABONNEMENTS
      ------------------------------------------------------ */

      if (
        !db.objectStoreNames.contains(
          STORES.subscriptions
        )
      ) {
        const store =
          db.createObjectStore(
            STORES.subscriptions,
            {
              keyPath: "id",
            }
          );

        store.createIndex(
          "user_id",
          "user_id",
          {
            unique: false,
          }
        );
      }

      /* ------------------------------------------------------
         UTILISATEURS
      ------------------------------------------------------ */

      if (
        !db.objectStoreNames.contains(
          STORES.users
        )
      ) {
        const store =
          db.createObjectStore(
            STORES.users,
            {
              keyPath: "id",
            }
          );

        store.createIndex(
          "phone",
          "phone",
          {
            unique: false,
          }
        );
      }

      /* ------------------------------------------------------
         FILE DE SYNCHRONISATION
      ------------------------------------------------------ */

      if (
        !db.objectStoreNames.contains(
          STORES.syncQueue
        )
      ) {
        const store =
          db.createObjectStore(
            STORES.syncQueue,
            {
              keyPath: "id",
            }
          );

        store.createIndex(
          "user_id",
          "user_id",
          {
            unique: false,
          }
        );

        store.createIndex(
          "created_at",
          "created_at",
          {
            unique: false,
          }
        );
      }
    };

    /* ========================================================
       SUCCÈS
    ======================================================== */

    request.onsuccess = () => {
      const db = request.result;

      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };

      resolve(db);
    };

    /* ========================================================
       ERREUR
    ======================================================== */

    request.onerror = () => {
      dbPromise = null;

      reject(
        request.error ||
          new Error(
            "Impossible d'ouvrir IndexedDB."
          )
      );
    };

    /* ========================================================
       BASE BLOQUÉE
    ======================================================== */

    request.onblocked = () => {
      console.warn(
        "⚠️ La base BISO-COMMERCE est bloquée par un autre onglet."
      );
    };
  });

  return dbPromise;
}

/* ============================================================
   AJOUTER / REMPLACER
============================================================ */

export async function offlinePut<T>(
  storeName: StoreName,
  data: T
): Promise<void> {
  const db =
    await openOfflineDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          storeName,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          storeName
        );

      const request =
        store.put(data);

      request.onerror = () => {
        reject(
          request.error ||
            new Error(
              "Impossible d'enregistrer les données localement."
            )
        );
      };

      transaction.oncomplete =
        () => {
          resolve();
        };

      transaction.onerror = () => {
        reject(
          transaction.error ||
            new Error(
              "Erreur IndexedDB."
            )
        );
      };
    }
  );
}

/* ============================================================
   AJOUTER PLUSIEURS ÉLÉMENTS
============================================================ */

export async function offlinePutMany<T>(
  storeName: StoreName,
  data: T[]
): Promise<void> {
  if (!data.length) {
    return;
  }

  const db =
    await openOfflineDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          storeName,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          storeName
        );

      for (const item of data) {
        store.put(item);
      }

      transaction.oncomplete =
        () => {
          resolve();
        };

      transaction.onerror = () => {
        reject(
          transaction.error ||
            new Error(
              "Erreur lors de l'enregistrement local."
            )
        );
      };
    }
  );
}

/* ============================================================
   RÉCUPÉRER UN ÉLÉMENT
============================================================ */

export async function offlineGet<T>(
  storeName: StoreName,
  id: IDBValidKey
): Promise<T | undefined> {
  const db =
    await openOfflineDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          storeName,
          "readonly"
        );

      const store =
        transaction.objectStore(
          storeName
        );

      const request =
        store.get(id);

      request.onsuccess = () => {
        resolve(
          request.result as
            | T
            | undefined
        );
      };

      request.onerror = () => {
        reject(
          request.error ||
            new Error(
              "Impossible de récupérer les données."
            )
        );
      };
    }
  );
}

/* ============================================================
   RÉCUPÉRER TOUT
============================================================ */

export async function offlineGetAll<T>(
  storeName: StoreName
): Promise<T[]> {
  const db =
    await openOfflineDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          storeName,
          "readonly"
        );

      const store =
        transaction.objectStore(
          storeName
        );

      const request =
        store.getAll();

      request.onsuccess = () => {
        resolve(
          (request.result ||
            []) as T[]
        );
      };

      request.onerror = () => {
        reject(
          request.error ||
            new Error(
              "Impossible de récupérer les données."
            )
        );
      };
    }
  );
}

/* ============================================================
   SUPPRIMER
============================================================ */

export async function offlineDelete(
  storeName: StoreName,
  id: IDBValidKey
): Promise<void> {
  const db =
    await openOfflineDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          storeName,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          storeName
        );

      const request =
        store.delete(id);

      request.onerror = () => {
        reject(
          request.error ||
            new Error(
              "Impossible de supprimer les données locales."
            )
        );
      };

      transaction.oncomplete =
        () => {
          resolve();
        };

      transaction.onerror = () => {
        reject(
          transaction.error ||
            new Error(
              "Erreur IndexedDB."
            )
        );
      };
    }
  );
}

/* ============================================================
   VIDER UNE TABLE
============================================================ */

export async function offlineClear(
  storeName: StoreName
): Promise<void> {
  const db =
    await openOfflineDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          storeName,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          storeName
        );

      const request =
        store.clear();

      request.onerror = () => {
        reject(
          request.error
        );
      };

      transaction.oncomplete =
        () => {
          resolve();
        };

      transaction.onerror = () => {
        reject(
          transaction.error
        );
      };
    }
  );
}

/* ============================================================
   RÉCUPÉRER LES DONNÉES D'UN UTILISATEUR
============================================================ */

export async function offlineGetByUser<T>(
  storeName: StoreName,
  userId: string
): Promise<T[]> {
  const db =
    await openOfflineDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          storeName,
          "readonly"
        );

      const store =
        transaction.objectStore(
          storeName
        );

      if (
        !store.indexNames.contains(
          "user_id"
        )
      ) {
        reject(
          new Error(
            `Le store "${storeName}" ne possède pas l'index user_id.`
          )
        );

        return;
      }

      const index =
        store.index("user_id");

      const request =
        index.getAll(userId);

      request.onsuccess = () => {
        resolve(
          (request.result ||
            []) as T[]
        );
      };

      request.onerror = () => {
        reject(
          request.error ||
            new Error(
              "Impossible de récupérer les données utilisateur."
            )
        );
      };
    }
  );
}

/* ============================================================
   FILE DE SYNCHRONISATION
============================================================ */

export type SyncActionType =
  | "insert"
  | "update"
  | "delete";

export type SyncAction = {
  id: string;
  user_id: string;
  table: string;
  action: SyncActionType;
  data: any;
  created_at: string;
};

/* ============================================================
   AJOUTER À LA FILE
============================================================ */

export async function addToSyncQueue(
  action: Omit<
    SyncAction,
    "id" | "created_at"
  >
): Promise<void> {
  const item: SyncAction = {
    id: generateId(),
    created_at:
      new Date().toISOString(),
    ...action,
  };

  await offlinePut(
    STORES.syncQueue,
    item
  );
}

/* ============================================================
   RÉCUPÉRER LA FILE
============================================================ */

export async function getSyncQueue(): Promise<
  SyncAction[]
> {
  const queue =
    await offlineGetAll<SyncAction>(
      STORES.syncQueue
    );

  return queue.sort(
    (a, b) =>
      new Date(
        a.created_at
      ).getTime() -
      new Date(
        b.created_at
      ).getTime()
  );
}

/* ============================================================
   SUPPRIMER UNE ACTION DE LA FILE
============================================================ */

export async function removeFromSyncQueue(
  id: string
): Promise<void> {
  await offlineDelete(
    STORES.syncQueue,
    id
  );
}

/* ============================================================
   NOMBRE D'ACTIONS EN ATTENTE
============================================================ */

export async function getPendingSyncCount(): Promise<number> {
  try {
    const queue =
      await getSyncQueue();

    return queue.length;
  } catch {
    return 0;
  }
}

/* ============================================================
   SYNCHRONISER UNE ACTION
============================================================ */

async function syncOneAction(
  item: SyncAction
): Promise<boolean> {
  try {
    /* --------------------------------------------------------
       INSERT
    -------------------------------------------------------- */

    if (
      item.action === "insert"
    ) {
      const { error } =
        await supabase
          .from(item.table)
          .upsert(item.data, {
            onConflict: "id",
          });

      if (error) {
        console.error(
          "❌ Erreur synchronisation INSERT :",
          error
        );

        return false;
      }

      return true;
    }

    /* --------------------------------------------------------
       UPDATE
    -------------------------------------------------------- */

    if (
      item.action === "update"
    ) {
      if (!item.data?.id) {
        console.warn(
          "⚠️ UPDATE sans id :",
          item
        );

        return false;
      }

      const {
        id,
        user_id,
        ...updateData
      } = item.data;

      let query =
        supabase
          .from(item.table)
          .update(updateData)
          .eq("id", id);

      /*
       * On protège les données utilisateur.
       */
      if (item.user_id) {
        query = query.eq(
          "user_id",
          item.user_id
        );
      }

      const { error } =
        await query;

      if (error) {
        console.error(
          "❌ Erreur synchronisation UPDATE :",
          error
        );

        return false;
      }

      return true;
    }

    /* --------------------------------------------------------
       DELETE
    -------------------------------------------------------- */

    if (
      item.action === "delete"
    ) {
      if (!item.data?.id) {
        console.warn(
          "⚠️ DELETE sans id :",
          item
        );

        return false;
      }

      let query =
        supabase
          .from(item.table)
          .delete()
          .eq(
            "id",
            item.data.id
          );

      /*
       * Protection utilisateur.
       */
      if (item.user_id) {
        query = query.eq(
          "user_id",
          item.user_id
        );
      }

      const { error } =
        await query;

      if (error) {
        console.error(
          "❌ Erreur synchronisation DELETE :",
          error
        );

        return false;
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error(
      "❌ Erreur action synchronisation :",
      error
    );

    return false;
  }
}

/* ============================================================
   SYNCHRONISATION COMPLÈTE
============================================================ */

export async function syncOfflineData(): Promise<void> {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  if (!navigator.onLine) {
    return;
  }

  if (isSyncing) {
    return;
  }

  isSyncing = true;

  try {
    const queue =
      await getSyncQueue();

    if (!queue.length) {
      return;
    }

    console.log(
      `🔄 BISO-COMMERCE : ${queue.length} action(s) à synchroniser.`
    );

    for (const item of queue) {
      /*
       * Internet peut disparaître
       * pendant la synchronisation.
       */
      if (!navigator.onLine) {
        console.warn(
          "📴 Internet perdu pendant la synchronisation."
        );

        break;
      }

      const success =
        await syncOneAction(item);

      if (success) {
        /*
         * L'action est supprimée
         * seulement après succès Supabase.
         */
        await removeFromSyncQueue(
          item.id
        );

        console.log(
          "✅ Synchronisé :",
          item.action,
          item.table,
          item.data?.id
        );
      }
    }
  } catch (error) {
    console.error(
      "❌ Erreur synchronisation globale :",
      error
    );
  } finally {
    isSyncing = false;
  }
}

/* ============================================================
   SYNCHRONISER MANUELLEMENT
============================================================ */

export async function forceOfflineSync(): Promise<void> {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  if (!navigator.onLine) {
    return;
  }

  await syncOfflineData();
}

/* ============================================================
   ÉCOUTER LE RETOUR D'INTERNET
============================================================ */

export function startOfflineSync(): () => void {
  if (
    typeof window === "undefined"
  ) {
    return () => {};
  }

  const handleOnline = () => {
    console.log(
      "🌐 Internet revenu — synchronisation BISO-COMMERCE..."
    );

    /*
     * Petit délai pour laisser
     * la connexion se stabiliser.
     */
    setTimeout(() => {
      syncOfflineData();
    }, 500);
  };

  const handleOffline = () => {
    console.log(
      "📴 BISO-COMMERCE fonctionne maintenant hors connexion."
    );
  };

  window.addEventListener(
    "online",
    handleOnline
  );

  window.addEventListener(
    "offline",
    handleOffline
  );

  /*
   * Si Internet est déjà disponible
   * au démarrage.
   */
  if (navigator.onLine) {
    setTimeout(() => {
      syncOfflineData();
    }, 500);
  }

  /*
   * Fonction de nettoyage.
   */
  return () => {
    window.removeEventListener(
      "online",
      handleOnline
    );

    window.removeEventListener(
      "offline",
      handleOffline
    );
  };
}