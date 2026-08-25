"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  AlertCircle,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Eye,
  History,
  Loader2,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  UserPlus,
  Wallet,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type Currency = "FC" | "USD";

type Debt = {
  id: string;
  user_id: string;
  client_name: string;
  phone: string;
  total_amount: number;
  paid_amount: number;
  currency: Currency;
  created_at: string;
};

type LocalDebt = Debt & {
  synced: boolean;
};

type DebtPayment = {
  id: string;
  debt_id: string;
  user_id: string;
  amount: number;
  currency: Currency;
  paid_at: string;
  created_at: string;
};

type LocalDebtPayment = DebtPayment & {
  synced: boolean;
};

type DeleteDebtQueueItem = {
  id: string;
  user_id: string;
  created_at: number;
};

type Notice = {
  type: "success" | "error" | "info";
  message: string;
} | null;

type ConnectionState = "online" | "offline" | "syncing";

/* =========================================================
   HELPERS
========================================================= */

const formatMoney = (value: number) => {
  return Math.round(Number(value) || 0).toLocaleString("fr-FR");
};

const formatDate = (value: string) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatTime = (value: string) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getRemaining = (debt: Debt) => {
  return Math.max(
    0,
    Number(debt.total_amount || 0) -
      Number(debt.paid_amount || 0)
  );
};

const getProgress = (debt: Debt) => {
  const total = Number(debt.total_amount || 0);
  const paid = Number(debt.paid_amount || 0);

  if (total <= 0) return 0;

  return Math.min(
    100,
    Math.round((paid / total) * 100)
  );
};

const normalizeDebt = (
  debt: Debt | LocalDebt
): LocalDebt => {
  return {
    ...debt,
    id: String(debt.id),
    user_id: String(debt.user_id || ""),
    client_name: String(debt.client_name || ""),
    phone: String(debt.phone || ""),
    total_amount: Number(debt.total_amount || 0),
    paid_amount: Number(debt.paid_amount || 0),
    currency:
      debt.currency === "USD" ? "USD" : "FC",
    created_at:
      debt.created_at ||
      new Date().toISOString(),
    synced:
      "synced" in debt
        ? Boolean(debt.synced)
        : true,
  };
};

const normalizePayment = (
  payment: DebtPayment | LocalDebtPayment
): LocalDebtPayment => {
  return {
    ...payment,
    id: String(payment.id),
    debt_id: String(payment.debt_id),
    user_id: String(payment.user_id || ""),
    amount: Number(payment.amount || 0),
    currency:
      payment.currency === "USD" ? "USD" : "FC",
    paid_at:
      payment.paid_at ||
      new Date().toISOString(),
    created_at:
      payment.created_at ||
      new Date().toISOString(),
    synced:
      "synced" in payment
        ? Boolean(payment.synced)
        : true,
  };
};

/* =========================================================
   STYLES
========================================================= */

const inputClass = `
  w-full
  min-h-[52px]
  rounded-2xl
  border
  border-slate-200
  bg-white
  px-4
  py-3
  text-[15px]
  font-medium
  text-slate-800
  outline-none
  placeholder:text-slate-400
  focus:border-indigo-400
  focus:ring-4
  focus:ring-indigo-500/10
  transition-all
`;

const cardClass = `
  rounded-[26px]
  border
  border-slate-200/80
  bg-white
  shadow-[0_10px_35px_rgba(15,23,42,0.05)]
`;

/* =========================================================
   INDEXED DB DETTES
========================================================= */

const DEBT_DB_NAME = "biso-commerce-debts";
const DEBT_DB_VERSION = 1;

const DEBTS_STORE = "debts";
const DEBT_PAYMENTS_STORE = "debt_payments";
const DEBT_DELETE_QUEUE_STORE = "debt_delete_queue";

let debtDBPromise: Promise<IDBDatabase> | null = null;

function openDebtsDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error(
        "IndexedDB est disponible uniquement dans le navigateur."
      )
    );
  }

  if (!("indexedDB" in window)) {
    return Promise.reject(
      new Error("IndexedDB n'est pas supporté.")
    );
  }

  if (debtDBPromise) {
    return debtDBPromise;
  }

  debtDBPromise = new Promise<IDBDatabase>(
    (resolve, reject) => {
      const request = indexedDB.open(
        DEBT_DB_NAME,
        DEBT_DB_VERSION
      );

      request.onupgradeneeded = () => {
        const db = request.result;

        /* ====================================================
           DETTES
        ==================================================== */

        let debtsStore: IDBObjectStore;

        if (
          !db.objectStoreNames.contains(
            DEBTS_STORE
          )
        ) {
          debtsStore =
            db.createObjectStore(
              DEBTS_STORE,
              {
                keyPath: "id",
              }
            );
        } else {
          const transaction =
            request.transaction;

          if (!transaction) {
            return;
          }

          debtsStore =
            transaction.objectStore(
              DEBTS_STORE
            );
        }

        if (
          !debtsStore.indexNames.contains(
            "user_id"
          )
        ) {
          debtsStore.createIndex(
            "user_id",
            "user_id",
            {
              unique: false,
            }
          );
        }

        if (
          !debtsStore.indexNames.contains(
            "synced"
          )
        ) {
          debtsStore.createIndex(
            "synced",
            "synced",
            {
              unique: false,
            }
          );
        }

        if (
          !debtsStore.indexNames.contains(
            "created_at"
          )
        ) {
          debtsStore.createIndex(
            "created_at",
            "created_at",
            {
              unique: false,
            }
          );
        }

        /* ====================================================
           PAIEMENTS
        ==================================================== */

        let paymentsStore: IDBObjectStore;

        if (
          !db.objectStoreNames.contains(
            DEBT_PAYMENTS_STORE
          )
        ) {
          paymentsStore =
            db.createObjectStore(
              DEBT_PAYMENTS_STORE,
              {
                keyPath: "id",
              }
            );
        } else {
          const transaction =
            request.transaction;

          if (!transaction) {
            return;
          }

          paymentsStore =
            transaction.objectStore(
              DEBT_PAYMENTS_STORE
            );
        }

        if (
          !paymentsStore.indexNames.contains(
            "debt_id"
          )
        ) {
          paymentsStore.createIndex(
            "debt_id",
            "debt_id",
            {
              unique: false,
            }
          );
        }

        if (
          !paymentsStore.indexNames.contains(
            "user_id"
          )
        ) {
          paymentsStore.createIndex(
            "user_id",
            "user_id",
            {
              unique: false,
            }
          );
        }

        if (
          !paymentsStore.indexNames.contains(
            "synced"
          )
        ) {
          paymentsStore.createIndex(
            "synced",
            "synced",
            {
              unique: false,
            }
          );
        }

        if (
          !paymentsStore.indexNames.contains(
            "paid_at"
          )
        ) {
          paymentsStore.createIndex(
            "paid_at",
            "paid_at",
            {
              unique: false,
            }
          );
        }

        /* ====================================================
           FILE SUPPRESSION
        ==================================================== */

        let deleteStore: IDBObjectStore;

        if (
          !db.objectStoreNames.contains(
            DEBT_DELETE_QUEUE_STORE
          )
        ) {
          deleteStore =
            db.createObjectStore(
              DEBT_DELETE_QUEUE_STORE,
              {
                keyPath: "id",
              }
            );
        } else {
          const transaction =
            request.transaction;

          if (!transaction) {
            return;
          }

          deleteStore =
            transaction.objectStore(
              DEBT_DELETE_QUEUE_STORE
            );
        }

        if (
          !deleteStore.indexNames.contains(
            "user_id"
          )
        ) {
          deleteStore.createIndex(
            "user_id",
            "user_id",
            {
              unique: false,
            }
          );
        }

        if (
          !deleteStore.indexNames.contains(
            "created_at"
          )
        ) {
          deleteStore.createIndex(
            "created_at",
            "created_at",
            {
              unique: false,
            }
          );
        }
      };

      request.onsuccess = () => {
        const db = request.result;

        db.onversionchange = () => {
          db.close();
          debtDBPromise = null;
        };

        resolve(db);
      };

      request.onerror = () => {
        debtDBPromise = null;

        reject(
          request.error ||
            new Error(
              "Impossible d'ouvrir la base locale des dettes."
            )
        );
      };

      request.onblocked = () => {
        console.warn(
          "La base locale des dettes est bloquée par un autre onglet."
        );
      };
    }
  );

  return debtDBPromise;
}

/* =========================================================
   DB PUT
========================================================= */

async function putLocalDebt(
  debt: LocalDebt
): Promise<void> {
  const db = await openDebtsDB();

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          DEBTS_STORE,
          "readwrite"
        );

      transaction
        .objectStore(DEBTS_STORE)
        .put(debt);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          transaction.error ||
            new Error(
              "Impossible d'enregistrer la dette localement."
            )
        );
      };

      transaction.onabort = () => {
        reject(
          transaction.error ||
            new Error(
              "L'enregistrement local de la dette a été interrompu."
            )
        );
      };
    }
  );
}

/* =========================================================
   DB GET ALL DETTES
========================================================= */

async function getLocalDebts(): Promise<
  LocalDebt[]
> {
  const db = await openDebtsDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          DEBTS_STORE,
          "readonly"
        );

      const request =
        transaction
          .objectStore(DEBTS_STORE)
          .getAll();

      request.onsuccess = () => {
        const list =
          (request.result || []) as LocalDebt[];

        list.sort(
          (a, b) =>
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
        );

        resolve(
          list.map(normalizeDebt)
        );
      };

      request.onerror = () => {
        reject(
          request.error ||
            new Error(
              "Impossible de lire les dettes locales."
            )
        );
      };
    }
  );
}

/* =========================================================
   DB DELETE DETTE LOCALE
========================================================= */

async function deleteLocalDebt(
  id: string
): Promise<void> {
  const db = await openDebtsDB();

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          DEBTS_STORE,
          "readwrite"
        );

      transaction
        .objectStore(DEBTS_STORE)
        .delete(id);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          transaction.error ||
            new Error(
              "Impossible de supprimer la dette localement."
            )
        );
      };
    }
  );
}

/* =========================================================
   DB PUT PAIEMENT
========================================================= */

async function putLocalPayment(
  payment: LocalDebtPayment
): Promise<void> {
  const db = await openDebtsDB();

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          DEBT_PAYMENTS_STORE,
          "readwrite"
        );

      transaction
        .objectStore(
          DEBT_PAYMENTS_STORE
        )
        .put(payment);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          transaction.error ||
            new Error(
              "Impossible d'enregistrer le paiement localement."
            )
        );
      };
    }
  );
}

/* =========================================================
   DB GET PAIEMENTS
========================================================= */

async function getLocalPayments(
  debtId: string,
  userId: string
): Promise<LocalDebtPayment[]> {
  const db = await openDebtsDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          DEBT_PAYMENTS_STORE,
          "readonly"
        );

      const request =
        transaction
          .objectStore(
            DEBT_PAYMENTS_STORE
          )
          .index("debt_id")
          .getAll(debtId);

      request.onsuccess = () => {
        const list =
          (
            (request.result ||
              []) as LocalDebtPayment[]
          )
            .map(normalizePayment)
            .filter(
              (payment) =>
                String(
                  payment.user_id
                ) === String(userId)
            )
            .sort(
              (a, b) =>
                new Date(
                  b.paid_at
                ).getTime() -
                new Date(
                  a.paid_at
                ).getTime()
            );

        resolve(list);
      };

      request.onerror = () => {
        reject(
          request.error ||
            new Error(
              "Impossible de lire l'historique local."
            )
        );
      };
    }
  );
}

/* =========================================================
   DB DELETE PAIEMENTS D'UNE DETTE
========================================================= */

async function deleteLocalPaymentsForDebt(
  debtId: string
): Promise<void> {
  const db = await openDebtsDB();

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          DEBT_PAYMENTS_STORE,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          DEBT_PAYMENTS_STORE
        );

      const index =
        store.index("debt_id");

      const request =
        index.openCursor(
          IDBKeyRange.only(debtId)
        );

      request.onsuccess = () => {
        const cursor =
          request.result;

        if (!cursor) {
          return;
        }

        cursor.delete();
        cursor.continue();
      };

      request.onerror = () => {
        reject(
          request.error ||
            new Error(
              "Impossible de supprimer l'historique local."
            )
        );
      };

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          transaction.error ||
            new Error(
              "Impossible de supprimer l'historique local."
            )
        );
      };
    }
  );
}

/* =========================================================
   FILE SUPPRESSION
========================================================= */

async function addDebtDeleteQueue(
  item: DeleteDebtQueueItem
): Promise<void> {
  const db = await openDebtsDB();

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          DEBT_DELETE_QUEUE_STORE,
          "readwrite"
        );

      transaction
        .objectStore(
          DEBT_DELETE_QUEUE_STORE
        )
        .put(item);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          transaction.error ||
            new Error(
              "Impossible d'enregistrer la suppression hors connexion."
            )
        );
      };
    }
  );
}

async function getDebtDeleteQueue(): Promise<
  DeleteDebtQueueItem[]
> {
  const db = await openDebtsDB();

  return new Promise(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          DEBT_DELETE_QUEUE_STORE,
          "readonly"
        );

      const request =
        transaction
          .objectStore(
            DEBT_DELETE_QUEUE_STORE
          )
          .getAll();

      request.onsuccess = () => {
        resolve(
          (request.result ||
            []) as DeleteDebtQueueItem[]
        );
      };

      request.onerror = () => {
        reject(
          request.error ||
            new Error(
              "Impossible de lire la file de suppression."
            )
        );
      };
    }
  );
}

async function removeDebtDeleteQueue(
  id: string
): Promise<void> {
  const db = await openDebtsDB();

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          DEBT_DELETE_QUEUE_STORE,
          "readwrite"
        );

      transaction
        .objectStore(
          DEBT_DELETE_QUEUE_STORE
        )
        .delete(id);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(
          transaction.error ||
            new Error(
              "Impossible de terminer la suppression locale."
            )
        );
      };
    }
  );
}
/* =========================================================
   PAGE
========================================================= */

export default function DebtsPage() {
  const [debts, setDebts] =
    useState<Debt[]>([]);

  const [name, setName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [currency, setCurrency] =
    useState<Currency>("FC");

  const [search, setSearch] =
    useState("");

  const [selectedDebt, setSelectedDebt] =
    useState<Debt | null>(null);

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [payments, setPayments] =
    useState<DebtPayment[]>([]);

  const [showAll, setShowAll] =
    useState(false);

  const [showNewDebt, setShowNewDebt] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [savingDebt, setSavingDebt] =
    useState(false);

  const [payingDebt, setPayingDebt] =
    useState(false);

  const [loadingPayments, setLoadingPayments] =
    useState(false);

  const [deletingDebt, setDeletingDebt] =
    useState(false);

  const [notice, setNotice] =
    useState<Notice>(null);

  const [isOnline, setIsOnline] =
    useState(true);

  const [connectionState, setConnectionState] =
    useState<ConnectionState>("online");

  /* =========================================================
     NOTIFICATION
  ========================================================= */

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        setNotice(null);
      }, 5500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

  /* =========================================================
     UTILISATEUR
  ========================================================= */

  const getUserId = useCallback(
    async (): Promise<string | null> => {
      const savedUserId =
        localStorage.getItem("user_id");

      if (savedUserId) {
        return String(savedUserId);
      }

      if (!navigator.onLine) {
        return null;
      }

      const savedPhone =
        localStorage.getItem("phone");

      if (!savedPhone) {
        return null;
      }

      try {
        const {
          data: user,
          error,
        } = await supabase
          .from("users")
          .select("id")
          .eq("phone", savedPhone)
          .single();

        if (
          error ||
          !user?.id
        ) {
          return null;
        }

        const userId =
          String(user.id);

        localStorage.setItem(
          "user_id",
          userId
        );

        return userId;
      } catch (error) {
        console.error(
          "Erreur récupération utilisateur :",
          error
        );

        return null;
      }
    },
    []
  );

  /* =========================================================
     SYNCHRONISER SUPPRESSIONS
  ========================================================= */

  const syncPendingDebtDeletes =
    useCallback(async () => {
      if (!navigator.onLine) {
        return;
      }

      const userId =
        await getUserId();

      if (!userId) {
        return;
      }

      let queue: DeleteDebtQueueItem[] = [];

      try {
        queue =
          await getDebtDeleteQueue();
      } catch (error) {
        console.error(
          "Erreur lecture file suppression :",
          error
        );
        return;
      }

      const userQueue =
        queue.filter(
          (item) =>
            String(item.user_id) ===
            String(userId)
        );

      if (!userQueue.length) {
        return;
      }

      setConnectionState(
        "syncing"
      );

      for (const item of userQueue) {
        try {
          const {
            error,
          } = await supabase
            .from("debts")
            .delete()
            .eq("id", item.id)
            .eq("user_id", userId);

          if (error) {
            throw error;
          }

          await removeDebtDeleteQueue(
            item.id
          );

          await deleteLocalDebt(
            item.id
          );

          await deleteLocalPaymentsForDebt(
            item.id
          );
        } catch (error) {
          console.error(
            "Erreur synchronisation suppression dette :",
            error
          );
        }
      }
    }, [getUserId]);

  /* =========================================================
     SYNCHRONISER DETTES
  ========================================================= */

  const syncPendingDebts =
  useCallback(async () => {
    if (!navigator.onLine) {
      return;
    }

    const userId =
      await getUserId();

    if (!userId) {
      console.warn(
        "Synchronisation dettes impossible : user_id introuvable."
      );
      return;
    }

    try {
      const localDebts =
        await getLocalDebts();

      const pendingDebts =
        localDebts.filter(
          (debt) =>
            !debt.synced &&
            String(debt.user_id) ===
              String(userId)
        );

      if (!pendingDebts.length) {
        return;
      }

      setConnectionState("syncing");

      /*
       * IMPORTANT :
       * Chaque dette locale est envoyée à Supabase.
       * On ne la marque "synced" QUE si Supabase
       * confirme réellement l'enregistrement.
       */

      for (const debt of pendingDebts) {
        try {
          const payload = {
            id: debt.id,
            user_id: userId,
            client_name: debt.client_name,
            phone: debt.phone,
            total_amount: Number(
              debt.total_amount || 0
            ),
            paid_amount: Number(
              debt.paid_amount || 0
            ),
            currency: debt.currency,
            created_at: debt.created_at,
          };

          const {
            data,
            error,
          } = await supabase
            .from("debts")
            .upsert(
              payload,
              {
                onConflict: "id",
              }
            )
            .select()
            .single();

          if (error) {
            console.error(
              "Supabase a refusé la synchronisation de la dette :",
              error
            );

            /*
             * On NE SUPPRIME PAS la dette locale.
             * Elle reste synced:false et sera réessayée.
             */
            continue;
          }

          if (!data) {
            console.error(
              "Supabase n'a pas confirmé la dette :",
              debt.id
            );

            /*
             * Même chose :
             * on garde la dette localement.
             */
            continue;
          }

          /*
           * SUPABASE A CONFIRMÉ.
           * Maintenant seulement on marque la dette
           * comme synchronisée.
           */
          await putLocalDebt({
            ...debt,
            id: String(data.id || debt.id),
            user_id: userId,
            client_name: String(
              data.client_name ??
                debt.client_name
            ),
            phone: String(
              data.phone ??
                debt.phone
            ),
            total_amount: Number(
              data.total_amount ??
                debt.total_amount
            ),
            paid_amount: Number(
              data.paid_amount ??
                debt.paid_amount
            ),
            currency:
              data.currency === "USD"
                ? "USD"
                : "FC",
            created_at:
              data.created_at ??
              debt.created_at,
            synced: true,
          });

          /*
           * Mettre immédiatement l'état React
           * à jour avec la dette confirmée.
           */
          setDebts(
            (current) => {
              const exists =
                current.some(
                  (item) =>
                    String(item.id) ===
                    String(
                      debt.id
                    )
                );

              const syncedDebt: Debt = {
                id: String(
                  data.id ||
                    debt.id
                ),
                user_id:
                  userId,
                client_name:
                  String(
                    data.client_name ??
                      debt.client_name
                  ),
                phone:
                  String(
                    data.phone ??
                      debt.phone
                  ),
                total_amount:
                  Number(
                    data.total_amount ??
                      debt.total_amount
                  ),
                paid_amount:
                  Number(
                    data.paid_amount ??
                      debt.paid_amount
                  ),
                currency:
                  data.currency ===
                  "USD"
                    ? "USD"
                    : "FC",
                created_at:
                  data.created_at ??
                  debt.created_at,
              };

              if (exists) {
                return current.map(
                  (item) =>
                    String(
                      item.id
                    ) ===
                    String(
                      debt.id
                    )
                      ? syncedDebt
                      : item
                );
              }

              return [
                syncedDebt,
                ...current,
              ];
            }
          );

          window.dispatchEvent(
            new CustomEvent(
              "biso-debts-updated",
              {
                detail: {
                  debt: {
                    ...debt,
                    synced: true,
                  },
                },
              }
            )
          );

          console.log(
            "Dette synchronisée avec succès :",
            debt.id
          );
        } catch (error) {
          /*
           * Très important :
           * aucune suppression locale ici.
           */
          console.error(
            "Erreur synchronisation dette :",
            error
          );
        }
      }
    } catch (error) {
      console.error(
        "Erreur lecture des dettes locales pour synchronisation :",
        error
      );
    }
  }, [getUserId]);
  /* =========================================================
     SYNCHRONISER PAIEMENTS
  ========================================================= */

  const syncPendingPayments =
    useCallback(async () => {
      if (!navigator.onLine) {
        return;
      }

      const userId =
        await getUserId();

      if (!userId) {
        return;
      }

      const localDebts =
        await getLocalDebts();

      const db =
        await openDebtsDB();

      const localPayments =
        await new Promise<
          LocalDebtPayment[]
        >((resolve, reject) => {
          const transaction =
            db.transaction(
              DEBT_PAYMENTS_STORE,
              "readonly"
            );

          const request =
            transaction
              .objectStore(
                DEBT_PAYMENTS_STORE
              )
              .getAll();

          request.onsuccess = () => {
            resolve(
              (
                (request.result ||
                  []) as LocalDebtPayment[]
              )
                .map(
                  normalizePayment
                )
                .filter(
                  (payment) =>
                    String(
                      payment.user_id
                    ) ===
                    String(userId)
                )
            );
          };

          request.onerror = () => {
            reject(
              request.error
            );
          };
        });

      const pendingPayments =
        localPayments.filter(
          (payment) =>
            !payment.synced
        );

      for (const payment of pendingPayments) {
        try {
          const debt =
            localDebts.find(
              (item) =>
                item.id ===
                payment.debt_id
            );

          if (!debt) {
            continue;
          }

          /*
            La dette doit d'abord être présente
            sur Supabase.
          */

          if (!debt.synced) {
            continue;
          }

          const {
            data,
            error,
          } = await supabase
            .from("debt_payments")
            .upsert(
              {
                id: payment.id,
                debt_id:
                  payment.debt_id,
                user_id: userId,
                amount:
                  payment.amount,
                currency:
                  payment.currency,
                paid_at:
                  payment.paid_at,
                created_at:
                  payment.created_at,
              },
              {
                onConflict: "id",
              }
            )
            .select()
            .single();

          if (error) {
            throw error;
          }

          if (!data) {
            throw new Error(
              "Le paiement n'a pas été confirmé par Supabase."
            );
          }

          const {
            error:
              debtUpdateError,
          } = await supabase
            .from("debts")
            .update({
              paid_amount:
                debt.paid_amount,
            })
            .eq(
              "id",
              debt.id
            )
            .eq(
              "user_id",
              userId
            );

          if (debtUpdateError) {
            throw debtUpdateError;
          }

          await putLocalPayment({
            ...payment,
            synced: true,
            user_id: userId,
          });
        } catch (error) {
          console.error(
            "Erreur synchronisation paiement :",
            error
          );
        }
      }
    }, [getUserId]);

  /* =========================================================
     SYNCHRONISATION GLOBALE
  ========================================================= */

  const syncAllDebtsData =
    useCallback(async () => {
      if (!navigator.onLine) {
        return;
      }

      setConnectionState(
        "syncing"
      );

      try {
        await syncPendingDebtDeletes();
        await syncPendingDebts();
        await syncPendingPayments();
      } catch (error) {
        console.error(
          "Erreur synchronisation dettes :",
          error
        );
      }

      if (navigator.onLine) {
        setConnectionState(
          "online"
        );
      }
    }, [
      syncPendingDebtDeletes,
      syncPendingDebts,
      syncPendingPayments,
    ]);

  /* =========================================================
     CHARGER DETTES
  ========================================================= */

  const loadDebts =
    useCallback(async () => {
      setLoading(true);

      try {
        await openDebtsDB();

        const localDebts =
          await getLocalDebts();

        const savedUserId =
          localStorage.getItem(
            "user_id"
          );

        if (savedUserId) {
          const localVisible =
            localDebts
              .filter(
                (debt) =>
                  String(
                    debt.user_id
                  ) ===
                  String(
                    savedUserId
                  )
              );

          setDebts(
            localVisible
              .map(
                ({ synced: _synced, ...debt }) =>
                  debt
              )
          );
        }

        if (!navigator.onLine) {
          setConnectionState(
            "offline"
          );
          setLoading(false);
          return;
        }

        const userId =
          await getUserId();

        if (!userId) {
          setNotice({
            type: "error",
            message:
              "Utilisateur non connecté ou impossible à identifier.",
          });

          setConnectionState(
            "offline"
          );

          setLoading(false);
          return;
        }

        await syncAllDebtsData();

        const {
          data,
          error,
        } = await supabase
          .from("debts")
          .select("*")
          .eq(
            "user_id",
            userId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );

        if (error) {
          throw error;
        }

        const serverDebts =
  (
    (data || []) as Debt[]
  ).map(
    normalizeDebt
  );

for (
  const debt of serverDebts
) {
  await putLocalDebt({
    ...debt,
    synced: true,
  });
}

const refreshedLocal =
  await getLocalDebts();

const queue =
  await getDebtDeleteQueue();

        const deletedIds =
          new Set(
            queue
              .filter(
                (item) =>
                  String(
                    item.user_id
                  ) ===
                  String(
                    userId
                  )
              )
              .map(
                (item) =>
                  item.id
              )
          );

        const visible =
          refreshedLocal
            .filter(
              (debt) =>
                String(
                  debt.user_id
                ) ===
                  String(
                    userId
                  ) &&
                !deletedIds.has(
                  debt.id
                )
            )
            .sort(
              (a, b) =>
                new Date(
                  b.created_at
                ).getTime() -
                new Date(
                  a.created_at
                ).getTime()
            );

        setDebts(
          visible.map(
            ({
              synced: _synced,
              ...debt
            }) => debt
          )
        );

        setNotice(null);
        setConnectionState(
          "online"
        );
      } catch (error) {
        console.error(
          "Erreur chargement dettes :",
          error
        );

        try {
          const localDebts =
            await getLocalDebts();

          const savedUserId =
            localStorage.getItem(
              "user_id"
            );

          if (savedUserId) {
            setDebts(
              localDebts
                .filter(
                  (debt) =>
                    String(
                      debt.user_id
                    ) ===
                    String(
                      savedUserId
                    )
                )
                .map(
                  ({
                    synced: _synced,
                    ...debt
                  }) => debt
                )
            );
          }
        } catch (
          localError
        ) {
          console.error(
            "Erreur lecture cache dettes :",
            localError
          );
        }

        if (!navigator.onLine) {
          setConnectionState(
            "offline"
          );
          setNotice({
            type: "info",
            message:
              "Vous êtes hors connexion. Vos dettes enregistrées sur cet appareil restent disponibles.",
          });
        } else {
          setNotice({
            type: "error",
            message:
              "Impossible de charger les dettes depuis le serveur. Les données locales restent disponibles.",
          });
        }
      } finally {
        setLoading(false);
      }
    }, [
      getUserId,
      syncAllDebtsData,
    ]);

  /* =========================================================
     INITIALISATION
  ========================================================= */

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        await openDebtsDB();

        if (!active) {
          return;
        }

        setIsOnline(
          navigator.onLine
        );

        await loadDebts();
      } catch (error) {
        console.error(
          "Erreur initialisation dettes :",
          error
        );
      }
    };

    init();

    return () => {
      active = false;
    };
  }, [loadDebts]);

  /* =========================================================
     CONNEXION
  ========================================================= */

  useEffect(() => {
    const handleOnline =
      async () => {
        setIsOnline(true);
        setConnectionState(
          "syncing"
        );

        try {
          await syncAllDebtsData();
          await loadDebts();

          setNotice({
            type: "success",
            message:
              "Connexion rétablie. Vos données de dettes ont été synchronisées.",
          });
        } catch (error) {
          console.error(
            "Erreur retour connexion :",
            error
          );
        }
      };

    const handleOffline =
      () => {
        setIsOnline(false);
        setConnectionState(
          "offline"
        );

        setNotice({
          type: "info",
          message:
            "Vous êtes hors connexion. Les nouvelles dettes et les paiements seront enregistrés sur cet appareil.",
        });
      };

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

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
  }, [
    loadDebts,
    syncAllDebtsData,
  ]);

  /* =========================================================
     AJOUTER DETTE
  ========================================================= */

  const addDebt = async () => {
    const cleanName =
      name.trim();

    const cleanPhone =
      phone.trim();

    const numericAmount =
      Number(amount);

    if (
      !cleanName ||
      !cleanPhone ||
      !amount
    ) {
      setNotice({
        type: "info",
        message:
          "Remplissez le nom, le téléphone et le montant.",
      });
      return;
    }

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      setNotice({
        type: "error",
        message:
          "Le montant doit être supérieur à 0.",
      });
      return;
    }

    setSavingDebt(true);

    try {
      const userId =
        await getUserId();

      if (
        !userId &&
        navigator.onLine
      ) {
        setNotice({
          type: "error",
          message:
            "Impossible d'identifier votre compte.",
        });
        return;
      }

      if (
        !userId &&
        !navigator.onLine
      ) {
        setNotice({
          type: "error",
          message:
            "Votre compte n'est pas identifié sur cet appareil. Reconnectez-vous une fois à Internet avant d'ajouter une dette hors connexion.",
        });
        return;
      }

      const debtId =
        crypto.randomUUID();

      const createdAt =
        new Date().toISOString();

      const localDebt: LocalDebt = {
        id: debtId,
        user_id:
          String(
            userId
          ),
        client_name:
          cleanName,
        phone:
          cleanPhone,
        total_amount:
          numericAmount,
        paid_amount: 0,
        currency,
        created_at:
          createdAt,
        synced: false,
      };

      await putLocalDebt(
        localDebt
      );

      setDebts(
        (current) => [
          localDebt,
          ...current,
        ]
      );

      window.dispatchEvent(
        new CustomEvent(
          "biso-debts-updated",
          {
            detail: {
              debt: localDebt,
            },
          }
        )
      );

      setName("");
      setPhone("");
      setAmount("");
      setCurrency("FC");
      setShowNewDebt(false);

      if (!navigator.onLine) {
        setNotice({
          type: "success",
          message:
            `Dette de ${formatMoney(
              numericAmount
            )} ${currency} enregistrée sur cet appareil. Elle sera synchronisée automatiquement dès que la connexion reviendra.`,
        });
      } else {
        setNotice({
          type: "success",
          message:
            `Dette de ${formatMoney(
              numericAmount
            )} ${currency} enregistrée. Synchronisation avec le serveur en cours.`,
        });

        void syncAllDebtsData().then(
          () => {
            void loadDebts();
          }
        );
      }
    } catch (error) {
      console.error(
        "Erreur ajout dette :",
        error
      );

      setNotice({
        type: "error",
        message:
          "Impossible d'enregistrer la dette sur cet appareil.",
      });
    } finally {
      setSavingDebt(false);
    }
  };

  /* =========================================================
     CHARGER HISTORIQUE
  ========================================================= */

  const loadPayments = async (
    debtId: string
  ) => {
    setLoadingPayments(true);

    try {
      const userId =
        await getUserId();

      if (!userId) {
        setPayments([]);
        return;
      }

      const localPayments =
        await getLocalPayments(
          debtId,
          userId
        );

      setPayments(
        localPayments.map(
          ({
            synced: _synced,
            ...payment
          }) => payment
        )
      );

      if (!navigator.onLine) {
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("debt_payments")
        .select("*")
        .eq(
          "debt_id",
          debtId
        )
        .eq(
          "user_id",
          userId
        )
        .order(
          "paid_at",
          {
            ascending:
              false,
          }
        );

      if (error) {
        console.error(
          "Erreur historique serveur :",
          error
        );
        return;
      }

      const serverPayments =
        (
          (data || []) as DebtPayment[]
        ).map(
          normalizePayment
        );

      for (
        const payment of serverPayments
      ) {
        await putLocalPayment({
          ...payment,
          synced: true,
        });
      }

      const refreshed =
        await getLocalPayments(
          debtId,
          userId
        );

      setPayments(
        refreshed.map(
          ({
            synced: _synced,
            ...payment
          }) => payment
        )
      );
    } catch (error) {
      console.error(
        "Erreur historique :",
        error
      );
    } finally {
      setLoadingPayments(false);
    }
  };

  /* =========================================================
     OUVRIR DETTE
  ========================================================= */

  const openDebt = async (
    debt: Debt
  ) => {
    setSelectedDebt(debt);
    setPaymentAmount("");
    setPayments([]);

    await loadPayments(
      debt.id
    );
  };

  /* =========================================================
     FERMER DETTE
  ========================================================= */

  const closeDebt = () => {
    if (payingDebt) {
      return;
    }

    setSelectedDebt(null);
    setPaymentAmount("");
    setPayments([]);
  };

  /* =========================================================
     PAYER DETTE
  ========================================================= */

  const payDebt = async () => {
    if (!selectedDebt) {
      setNotice({
        type: "info",
        message:
          "Sélectionnez d'abord une dette.",
      });
      return;
    }

    const value =
      Number(paymentAmount);

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      setNotice({
        type: "error",
        message:
          "Saisissez un montant valide.",
      });
      return;
    }

    const remaining =
      getRemaining(
        selectedDebt
      );

    if (remaining <= 0) {
      setNotice({
        type: "info",
        message:
          "Cette dette est déjà entièrement payée.",
      });
      return;
    }

    if (value > remaining) {
      setNotice({
        type: "error",
        message:
          `Le paiement ne peut pas dépasser ${formatMoney(
            remaining
          )} ${selectedDebt.currency}.`,
      });
      return;
    }

    setPayingDebt(true);

    try {
      const userId =
        await getUserId();

      if (!userId) {
        setNotice({
          type: "error",
          message:
            "Utilisateur non identifié sur cet appareil.",
        });
        return;
      }

      const paymentId =
        crypto.randomUUID();

      const now =
        new Date().toISOString();

      const newPaid =
        Number(
          selectedDebt.paid_amount ||
            0
        ) + value;

      const total =
        Number(
          selectedDebt.total_amount ||
            0
        );

      const finalPaid =
        Math.min(
          newPaid,
          total
        );

      const localPayment:
        LocalDebtPayment = {
        id: paymentId,
        debt_id:
          selectedDebt.id,
        user_id:
          userId,
        amount: value,
        currency:
          selectedDebt.currency,
        paid_at: now,
        created_at: now,
        synced: false,
      };

      const updatedDebt:
        LocalDebt = {
        ...selectedDebt,
        user_id:
          userId,
        paid_amount:
          finalPaid,
        synced:
          "synced" in
          selectedDebt
            ? Boolean(
                (
                  selectedDebt as
                    LocalDebt
                )
                  .synced
              )
            : false,
      };

      /*
        Sauvegarde locale immédiate.
      */

      await putLocalPayment(
        localPayment
      );

      await putLocalDebt(
        updatedDebt
      );

      setDebts(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              updatedDebt.id
                ? {
                    ...updatedDebt,
                  }
                : item
          )
      );

      setSelectedDebt(
        updatedDebt
      );

      setPaymentAmount("");

      setPayments(
        (current) => [
          {
            id:
              localPayment.id,
            debt_id:
              localPayment.debt_id,
            user_id:
              localPayment.user_id,
            amount:
              localPayment.amount,
            currency:
              localPayment.currency,
            paid_at:
              localPayment.paid_at,
            created_at:
              localPayment.created_at,
          },
          ...current,
        ]
      );

      if (!navigator.onLine) {
        setNotice({
          type: "success",
          message:
            `Paiement de ${formatMoney(
              value
            )} ${selectedDebt.currency} enregistré hors connexion. Le solde est mis à jour immédiatement et sera synchronisé automatiquement dès que la connexion reviendra.`,
        });

        return;
      }

      setConnectionState(
        "syncing"
      );

      await syncAllDebtsData();
      await loadPayments(
        updatedDebt.id
      );

      const finalRemaining =
        Math.max(
          0,
          total - finalPaid
        );

      if (
        finalRemaining ===
        0
      ) {
        setNotice({
          type: "success",
          message:
            `Dette de ${updatedDebt.client_name} entièrement payée.`,
        });
      } else {
        setNotice({
          type: "success",
          message:
            `Paiement enregistré. Reste : ${formatMoney(
              finalRemaining
            )} ${updatedDebt.currency}.`,
        });
      }

      setConnectionState(
        "online"
      );
    } catch (error) {
      console.error(
        "Erreur paiement :",
        error
      );

      setNotice({
        type: "error",
        message:
          "Impossible d'enregistrer le paiement.",
      });
    } finally {
      setPayingDebt(false);
    }
  };

  /* =========================================================
     SUPPRIMER DETTE
  ========================================================= */

  const deleteDebt = async (
    debt: Debt
  ) => {
    const confirmed =
      window.confirm(
        `Voulez-vous vraiment supprimer la dette de ${debt.client_name} ?\n\nCette action supprimera également son historique de paiements et est irréversible.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingDebt(true);

    try {
      const userId =
        await getUserId();

      if (!userId) {
        setNotice({
          type: "error",
          message:
            "Utilisateur non identifié.",
        });
        return;
      }

      /*
        Suppression locale immédiate.
      */

      await deleteLocalDebt(
        debt.id
      );

      await deleteLocalPaymentsForDebt(
        debt.id
      );

      setDebts(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              debt.id
          )
      );

      if (
        selectedDebt?.id ===
        debt.id
      ) {
        closeDebt();
      }

      /*
        Hors connexion :
        la suppression attend Internet.
      */

      if (!navigator.onLine) {
        await addDebtDeleteQueue(
          {
            id: debt.id,
            user_id:
              userId,
            created_at:
              Date.now(),
          }
        );

        setNotice({
          type: "success",
          message:
            `Dette de ${debt.client_name} supprimée de cet appareil. La suppression sera synchronisée automatiquement dès que la connexion reviendra.`,
        });

        return;
      }

      setConnectionState(
        "syncing"
      );

      const {
        error,
      } = await supabase
        .from("debts")
        .delete()
        .eq(
          "id",
          debt.id
        )
        .eq(
          "user_id",
          userId
        );

      if (error) {
        /*
          Si le serveur refuse,
          on remet la dette en cache
          pour ne pas perdre les données.
        */

        const restored: LocalDebt = {
          ...debt,
          synced: true,
        };

        await putLocalDebt(
          restored
        );

        setDebts(
          (current) => [
            restored,
            ...current,
          ]
        );

        throw error;
      }

      setConnectionState(
        "online"
      );

      setNotice({
        type: "success",
        message:
          `Dette de ${debt.client_name} supprimée définitivement.`,
      });
    } catch (error) {
      console.error(
        "Erreur suppression :",
        error
      );

      if (navigator.onLine) {
        setNotice({
          type: "error",
          message:
            "Impossible de supprimer cette dette.",
        });
      }
    } finally {
      setDeletingDebt(false);
    }
  };

  /* =========================================================
     RECHERCHE
  ========================================================= */

  const filteredDebts =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return debts;
      }

      return debts.filter(
        (debt) =>
          debt.client_name
            .toLowerCase()
            .includes(query) ||
          debt.phone
            .toLowerCase()
            .includes(query)
      );
    }, [
      debts,
      search,
    ]);

  const visibleDebts =
    showAll
      ? filteredDebts
      : filteredDebts.slice(
          0,
          5
        );

  /* =========================================================
     STATISTIQUES
  ========================================================= */

  const totalRemainingFc =
    debts
      .filter(
        (debt) =>
          debt.currency ===
          "FC"
      )
      .reduce(
        (sum, debt) =>
          sum +
          getRemaining(
            debt
          ),
        0
      );

  const totalRemainingUsd =
    debts
      .filter(
        (debt) =>
          debt.currency ===
          "USD"
      )
      .reduce(
        (sum, debt) =>
          sum +
          getRemaining(
            debt
          ),
        0
      );

  const totalPaidFc =
    debts
      .filter(
        (debt) =>
          debt.currency ===
          "FC"
      )
      .reduce(
        (sum, debt) =>
          sum +
          Number(
            debt.paid_amount ||
              0
          ),
        0
      );

  const totalPaidUsd =
    debts
      .filter(
        (debt) =>
          debt.currency ===
          "USD"
      )
      .reduce(
        (sum, debt) =>
          sum +
          Number(
            debt.paid_amount ||
              0
          ),
        0
      );

  const unpaidCount =
    debts.filter(
      (debt) =>
        getRemaining(
          debt
        ) > 0
    ).length;

  /* =========================================================
     SUITE JSX DANS PARTIE 3
========================================================= */

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-3 py-4 pb-24 text-slate-900 sm:px-5 sm:py-7">

      <div className="mx-auto w-full max-w-6xl space-y-5">

        {/* =====================================================
            NOTIFICATION
        ===================================================== */}

        {notice && (
          <div
            className={`
              fixed
              left-3
              right-3
              top-4
              z-[9999]
              mx-auto
              flex
              max-w-xl
              items-start
              gap-3
              rounded-2xl
              border
              bg-white
              p-4
              shadow-2xl
              ${
                notice.type ===
                "success"
                  ? "border-emerald-200 text-emerald-700"
                  : notice.type ===
                    "error"
                  ? "border-red-200 text-red-700"
                  : "border-indigo-200 text-indigo-700"
              }
            `}
          >
            <div
              className={`
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                ${
                  notice.type ===
                  "success"
                    ? "bg-emerald-50"
                    : notice.type ===
                      "error"
                    ? "bg-red-50"
                    : "bg-indigo-50"
                }
              `}
            >
              {notice.type ===
              "success" ? (
                <CheckCircle
                  size={19}
                />
              ) : (
                <AlertCircle
                  size={19}
                />
              )}
            </div>

            <p className="flex-1 pt-1 text-sm font-bold leading-5">
              {notice.message}
            </p>

            <button
              type="button"
              onClick={() =>
                setNotice(null)
              }
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* =====================================================
            HEADER
        ===================================================== */}

        <section
          className={`${cardClass} overflow-hidden p-5 sm:p-7`}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex min-w-0 items-center gap-4">

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
                <Wallet size={26} />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">

                  <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                    Dettes
                  </h1>

                  <span className="hidden rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black text-indigo-600 sm:inline-flex">
                    GESTION
                  </span>

                </div>

                <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
                  Suivez facilement les crédits de vos clients.
                </p>
              </div>

            </div>

            <div className="flex flex-col gap-2">

              {/* STATUT CONNEXION */}

              <div
                className={`
                  inline-flex
                  min-h-[38px]
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  px-3
                  text-[10px]
                  font-black
                  ${
                    connectionState ===
                    "syncing"
                      ? "bg-indigo-50 text-indigo-600"
                      : isOnline
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-amber-50 text-amber-600"
                  }
                `}
              >
                {connectionState ===
                "syncing" ? (
                  <>
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                    Synchronisation...
                  </>
                ) : isOnline ? (
                  <>
                    <Wifi size={14} />
                    En ligne
                  </>
                ) : (
                  <>
                    <WifiOff
                      size={14}
                    />
                    Hors connexion
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">

                <button
                  type="button"
                  onClick={
                    loadDebts
                  }
                  disabled={loading}
                  className="
                    flex
                    min-h-[46px]
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    px-3
                    text-xs
                    font-black
                    text-slate-600
                    transition
                    hover:bg-slate-100
                    disabled:opacity-50
                    sm:px-4
                  "
                >
                  <RefreshCw
                    size={16}
                    className={
                      loading
                        ? "animate-spin"
                        : ""
                    }
                  />
                  Actualiser
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowNewDebt(
                      !showNewDebt
                    )
                  }
                  className="
                    flex
                    min-h-[46px]
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-indigo-600
                    px-3
                    text-xs
                    font-black
                    text-white
                    shadow-lg
                    shadow-indigo-600/20
                    transition
                    hover:bg-indigo-700
                    sm:px-4
                  "
                >
                  <Plus size={17} />
                  Nouvelle dette
                </button>

              </div>

            </div>

          </div>
        </section>

        {/* =====================================================
            STATISTIQUES
        ===================================================== */}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">

          <StatCard
            icon={
              <Banknote size={18} />
            }
            title="Reste FC"
            value={`${formatMoney(
              totalRemainingFc
            )} FC`}
            tone="indigo"
          />

          <StatCard
            icon={
              <CreditCard size={18} />
            }
            title="Reste USD"
            value={`${formatMoney(
              totalRemainingUsd
            )} $`}
            tone="emerald"
          />

          <StatCard
            icon={
              <User size={18} />
            }
            title="Dettes"
            value={String(
              unpaidCount
            )}
            tone="blue"
          />

          <StatCard
            icon={
              <Check size={18} />
            }
            title="Récupéré"
            value={`${formatMoney(
              totalPaidFc
            )} FC`}
            subtitle={`${formatMoney(
              totalPaidUsd
            )} USD`}
            tone="violet"
          />

        </section>

        {/* =====================================================
            NOUVELLE DETTE
        ===================================================== */}

        {showNewDebt && (
          <section
            className={`${cardClass} overflow-hidden p-5 sm:p-7`}
          >

            <div className="mb-6 flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <UserPlus size={20} />
                </div>

                <div>
                  <h2 className="font-black text-slate-900">
                    Nouvelle dette
                  </h2>

                  <p className="text-xs font-medium text-slate-500">
                    Ajoutez les informations du client.
                  </p>
                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowNewDebt(false)
                }
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>

            </div>

            {!isOnline && (
              <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-3.5">

                <WifiOff
                  size={18}
                  className="mt-0.5 shrink-0 text-amber-600"
                />

                <div>
                  <p className="text-xs font-black text-amber-800">
                    Mode hors connexion
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-amber-700">
                    La dette sera enregistrée
                    immédiatement sur cet appareil
                    puis synchronisée automatiquement
                    lorsque Internet reviendra.
                  </p>
                </div>

              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-xs font-black text-slate-600">
                  Nom du client
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  placeholder="Ex : Jean"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black text-slate-600">
                  Téléphone
                </label>

                <div className="relative">

                  <Phone
                    size={16}
                    className="
                      pointer-events-none
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />

                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) =>
                      setPhone(
                        e.target.value
                      )
                    }
                    placeholder="0812345678"
                    className={`${inputClass} pl-11`}
                  />

                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black text-slate-600">
                  Montant
                </label>

                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) =>
                    setAmount(
                      e.target.value
                    )
                  }
                  placeholder="Ex : 50000"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black text-slate-600">
                  Monnaie
                </label>

                <div className="grid grid-cols-2 gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      setCurrency("FC")
                    }
                    className={`
                      min-h-[52px]
                      rounded-2xl
                      border
                      font-black
                      transition
                      ${
                        currency ===
                        "FC"
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                          : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }
                    `}
                  >
                    🇨🇩 FC
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrency("USD")
                    }
                    className={`
                      min-h-[52px]
                      rounded-2xl
                      border
                      font-black
                      transition
                      ${
                        currency ===
                        "USD"
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                          : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }
                    `}
                  >
                    💵 USD
                  </button>

                </div>
              </div>

            </div>

            <button
              type="button"
              onClick={
                addDebt
              }
              disabled={
                savingDebt
              }
              className="
                mt-5
                flex
                min-h-[54px]
                w-full
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-indigo-600
                font-black
                text-white
                shadow-lg
                shadow-indigo-600/20
                transition
                hover:bg-indigo-700
                disabled:opacity-60
              "
            >
              {savingDebt ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Enregistrer la dette
                </>
              )}
            </button>

          </section>
        )}

        {/* =====================================================
            RECHERCHE
        ===================================================== */}

        <section
          className={`${cardClass} p-4`}
        >
          <div className="relative">

            <Search
              size={18}
              className="
                pointer-events-none
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Chercher nom ou téléphone"
              className={`
                ${inputClass}
                bg-slate-50
                pl-11
              `}
            />

          </div>
        </section>

        {/* =====================================================
            LISTE
        ===================================================== */}

        <section
          className={`${cardClass} overflow-hidden p-5 sm:p-7`}
        >

          <div className="mb-5 flex items-center justify-between gap-3">

            <div>
              <h2 className="text-lg font-black text-slate-900">
                Dettes clients
              </h2>

              <p className="mt-1 text-xs font-medium text-slate-500">
                {filteredDebts.length} enregistrée
                {filteredDebts.length !==
                1
                  ? "s"
                  : ""}
              </p>
            </div>

            {filteredDebts.length >
              5 && (
              <button
                type="button"
                onClick={() =>
                  setShowAll(
                    !showAll
                  )
                }
                className="
                  flex
                  items-center
                  gap-1
                  rounded-xl
                  border
                  border-indigo-100
                  bg-indigo-50
                  px-3
                  py-2
                  text-xs
                  font-black
                  text-indigo-600
                  transition
                  hover:bg-indigo-100
                "
              >
                {showAll ? (
                  <>
                    <ChevronUp
                      size={15}
                    />
                    Réduire
                  </>
                ) : (
                  <>
                    <ChevronDown
                      size={15}
                    />
                    Voir tout
                  </>
                )}
              </button>
            )}

          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-12">

              <Loader2
                size={28}
                className="animate-spin text-indigo-600"
              />

              <p className="mt-3 text-xs font-bold text-slate-400">
                Chargement...
              </p>

            </div>
          ) : visibleDebts.length ===
            0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                <Wallet size={24} />
              </div>

              <p className="mt-4 font-black text-slate-800">
                Aucune dette
              </p>

              <p className="mt-1 text-xs font-medium text-slate-400">
                Les dettes enregistrées apparaîtront ici.
              </p>

            </div>
          ) : (
            <div className="space-y-3">

              {visibleDebts.map(
                (debt) => {
                  const remaining =
                    getRemaining(
                      debt
                    );

                  const progress =
                    getProgress(
                      debt
                    );

                  const paid =
                    remaining <=
                    0;

                  return (
                    <article
                      key={
                        debt.id
                      }
                      className="
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        p-4
                        transition-all
                        hover:-translate-y-[1px]
                        hover:border-indigo-200
                        hover:shadow-lg
                        hover:shadow-slate-200/60
                      "
                    >
                      <div className="flex items-start justify-between gap-3">

                        <div className="flex min-w-0 items-center gap-3">

                          <div
                            className={`
                              flex
                              h-11
                              w-11
                              shrink-0
                              items-center
                              justify-center
                              rounded-2xl
                              ${
                                paid
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-indigo-50 text-indigo-600"
                              }
                            `}
                          >
                            {paid ? (
                              <Check
                                size={19}
                              />
                            ) : (
                              <User
                                size={19}
                              />
                            )}
                          </div>

                          <div className="min-w-0">

                            <h3 className="truncate font-black text-slate-900">
                              {debt.client_name}
                            </h3>

                            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-400">
                              <Phone
                                size={11}
                              />
                              {debt.phone}
                            </p>

                          </div>

                        </div>

                        <span
                          className={`
                            shrink-0
                            rounded-full
                            px-2.5
                            py-1.5
                            text-[9px]
                            font-black
                            ${
                              paid
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-amber-50 text-amber-600"
                            }
                          `}
                        >
                          {paid
                            ? "PAYÉE"
                            : "EN COURS"}
                        </span>

                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">

                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">

                          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                            Total
                          </p>

                          <p className="mt-1 text-sm font-black text-slate-900">
                            {formatMoney(
                              debt.total_amount
                            )}{" "}
                            {debt.currency}
                          </p>

                        </div>

                        <div
                          className={`
                            rounded-2xl
                            border
                            p-3
                            ${
                              paid
                                ? "border-emerald-100 bg-emerald-50/60"
                                : "border-amber-100 bg-amber-50/60"
                            }
                          `}
                        >

                          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                            {paid
                              ? "Reste"
                              : "À payer"}
                          </p>

                          <p
                            className={`
                              mt-1
                              text-sm
                              font-black
                              ${
                                paid
                                  ? "text-emerald-600"
                                  : "text-amber-600"
                              }
                            `}
                          >
                            {formatMoney(
                              remaining
                            )}{" "}
                            {debt.currency}
                          </p>

                        </div>

                      </div>

                      <div className="mt-4">

                        <div className="mb-1.5 flex justify-between">

                          <span className="text-[10px] font-medium text-slate-400">
                            Progression du paiement
                          </span>

                          <span className="text-[10px] font-black text-emerald-600">
                            {progress}%
                          </span>

                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                          <div
                            className="
                              h-full
                              rounded-full
                              bg-gradient-to-r
                              from-indigo-500
                              to-emerald-500
                              transition-all
                            "
                            style={{
                              width: `${progress}%`,
                            }}
                          />

                        </div>

                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-medium text-slate-400">

                        <span className="flex items-center gap-1">
                          <CalendarDays
                            size={11}
                          />
                          {formatDate(
                            debt.created_at
                          )}
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock
                            size={11}
                          />
                          {formatTime(
                            debt.created_at
                          )}
                        </span>

                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            openDebt(
                              debt
                            )
                          }
                          className="
                            flex
                            min-h-[45px]
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            text-xs
                            font-black
                            text-slate-700
                            transition
                            hover:border-indigo-200
                            hover:bg-indigo-50
                            hover:text-indigo-600
                          "
                        >
                          <Eye size={16} />
                          Voir
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openDebt(
                              debt
                            )
                          }
                          disabled={
                            paid
                          }
                          className={`
                            flex
                            min-h-[45px]
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            text-xs
                            font-black
                            transition
                            ${
                              paid
                                ? "cursor-not-allowed bg-slate-100 text-slate-300"
                                : "bg-emerald-600 text-white shadow-md shadow-emerald-600/15 hover:bg-emerald-700"
                            }
                          `}
                        >
                          <CreditCard
                            size={16}
                          />
                          Payer
                        </button>

                      </div>

                    </article>
                  );
                }
              )}

            </div>
          )}

        </section>
      </div>
            {/* =======================================================
          MODAL DÉTAILS DETTE
      ======================================================= */}

      {selectedDebt && (
        <div
          className="
            fixed
            inset-0
            z-[1000]
            flex
            items-end
            justify-center
            bg-slate-950/50
            p-0
            backdrop-blur-sm
            sm:items-center
            sm:p-4
          "
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDebt();
            }
          }}
        >

          <div
            className="
              max-h-[92vh]
              w-full
              max-w-xl
              overflow-y-auto
              rounded-t-[30px]
              border
              border-slate-200
              bg-white
              p-5
              shadow-2xl
              sm:rounded-[30px]
              sm:p-7
            "
          >

            {/* HEADER MODAL */}

            <div className="flex items-start justify-between gap-3">

              <div className="flex min-w-0 items-center gap-3">

                <div
                  className={`
                    flex
                    h-12
                    w-12
                    shrink-0
                    items-center
                    justify-center
                    rounded-2xl
                    ${
                      getRemaining(
                        selectedDebt
                      ) <= 0
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-indigo-50 text-indigo-600"
                    }
                  `}
                >
                  <Wallet size={21} />
                </div>

                <div className="min-w-0">

                  <h2 className="truncate text-lg font-black text-slate-900">
                    {selectedDebt.client_name}
                  </h2>

                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-400">
                    <Phone size={12} />
                    {selectedDebt.phone}
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={closeDebt}
                disabled={
                  payingDebt
                }
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-slate-100
                  text-slate-400
                  transition
                  hover:bg-slate-200
                  hover:text-slate-700
                "
              >
                <X size={18} />
              </button>

            </div>

            {/* RÉSUMÉ */}

            <div className="mt-5 grid grid-cols-2 gap-2">

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

                <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                  Dette
                </p>

                <p className="mt-1 text-sm font-black text-slate-900">
                  {formatMoney(
                    selectedDebt.total_amount
                  )}{" "}
                  {selectedDebt.currency}
                </p>

              </div>

              <div
                className={`
                  rounded-2xl
                  border
                  p-4
                  ${
                    getRemaining(
                      selectedDebt
                    ) <= 0
                      ? "border-emerald-100 bg-emerald-50"
                      : "border-amber-100 bg-amber-50"
                  }
                `}
              >

                <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                  Reste
                </p>

                <p
                  className={`
                    mt-1
                    text-sm
                    font-black
                    ${
                      getRemaining(
                        selectedDebt
                      ) <= 0
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }
                  `}
                >
                  {formatMoney(
                    getRemaining(
                      selectedDebt
                    )
                  )}{" "}
                  {selectedDebt.currency}
                </p>

              </div>

            </div>

            {/* DATE CRÉATION */}

            <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">

              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <CalendarDays size={16} />
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                    Créée le
                  </p>

                  <p className="text-xs font-bold text-slate-800">
                    {formatDate(
                      selectedDebt.created_at
                    )}
                  </p>
                </div>

              </div>

              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Clock size={16} />
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                    Heure
                  </p>

                  <p className="text-xs font-bold text-slate-800">
                    {formatTime(
                      selectedDebt.created_at
                    )}
                  </p>
                </div>

              </div>

            </div>

            {/* MODE HORS CONNEXION */}

            {!isOnline && (
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-3.5">

                <WifiOff
                  size={17}
                  className="mt-0.5 shrink-0 text-amber-600"
                />

                <div>

                  <p className="text-xs font-black text-amber-800">
                    Hors connexion
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-amber-700">
                    Les paiements effectués maintenant
                    seront enregistrés immédiatement sur
                    cet appareil et synchronisés automatiquement
                    lorsque Internet reviendra.
                  </p>

                </div>

              </div>
            )}

            {/* PAIEMENT */}

            {getRemaining(
              selectedDebt
            ) > 0 ? (
              <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">

                <div className="mb-3">

                  <div className="flex items-center gap-2">

                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <CreditCard size={17} />
                    </div>

                    <div>
                      <h3 className="font-black text-slate-900">
                        Enregistrer un paiement
                      </h3>

                      <p className="mt-1 text-[11px] font-medium text-slate-400">
                        Le paiement sera daté automatiquement.
                      </p>
                    </div>

                  </div>

                </div>

                <div className="relative">

                  <input
                    type="number"
                    min="0"
                    max={getRemaining(
                      selectedDebt
                    )}
                    value={
                      paymentAmount
                    }
                    onChange={(e) =>
                      setPaymentAmount(
                        e.target
                          .value
                      )
                    }
                    placeholder={`Reste : ${formatMoney(
                      getRemaining(
                        selectedDebt
                      )
                    )}`}
                    className={
                      inputClass
                    }
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                    {
                      selectedDebt.currency
                    }
                  </span>

                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      setPaymentAmount(
                        String(
                          getRemaining(
                            selectedDebt
                          )
                        )
                      )
                    }
                    className="
                      min-h-[44px]
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      text-xs
                      font-black
                      text-slate-600
                      transition
                      hover:bg-slate-50
                    "
                  >
                    Tout payer
                  </button>

                  <button
                    type="button"
                    onClick={
                      payDebt
                    }
                    disabled={
                      payingDebt
                    }
                    className="
                      flex
                      min-h-[44px]
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-emerald-600
                      text-xs
                      font-black
                      text-white
                      shadow-md
                      shadow-emerald-600/15
                      transition
                      hover:bg-emerald-700
                      disabled:opacity-60
                    "
                  >
                    {payingDebt ? (
                      <>
                        <Loader2
                          size={15}
                          className="animate-spin"
                        />
                        Enregistrement
                      </>
                    ) : (
                      <>
                        <Check
                          size={16}
                        />
                        Enregistrer
                      </>
                    )}
                  </button>

                </div>

              </div>
            ) : (
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <CheckCircle
                    size={19}
                  />
                </div>

                <div>
                  <p className="text-sm font-black text-emerald-700">
                    Dette entièrement payée
                  </p>

                  <p className="mt-1 text-[11px] font-medium text-slate-400">
                    Tous les paiements restent conservés dans l'historique.
                  </p>
                </div>

              </div>
            )}

            {/* HISTORIQUE */}

            <div className="mt-6">

              <div className="mb-3 flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <History size={18} />
                </div>

                <div>
                  <h3 className="font-black text-slate-900">
                    Historique
                  </h3>

                  <p className="text-[10px] font-medium text-slate-400">
                    Paiements reçus
                  </p>
                </div>

              </div>

              {loadingPayments ? (
                <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-8">
                  <Loader2
                    size={22}
                    className="animate-spin text-indigo-600"
                  />
                </div>
              ) : payments.length ===
                0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center">

                  <History
                    size={22}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-2 text-xs font-bold text-slate-400">
                    Aucun paiement enregistré.
                  </p>

                </div>
              ) : (
                <div className="space-y-2">

                  {payments.map(
                    (payment) => (
                      <div
                        key={
                          payment.id
                        }
                        className="
                          rounded-2xl
                          border
                          border-slate-200
                          bg-white
                          p-3
                          transition
                          hover:bg-slate-50
                        "
                      >

                        <div className="flex items-center justify-between gap-3">

                          <div className="flex min-w-0 items-center gap-3">

                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                              <Check
                                size={16}
                              />
                            </div>

                            <div className="min-w-0">

                              <p className="text-xs font-black text-slate-900">
                                {formatMoney(
                                  payment.amount
                                )}{" "}
                                {
                                  payment.currency
                                }
                              </p>

                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium text-slate-400">

                                <span className="flex items-center gap-1">
                                  <CalendarDays
                                    size={10}
                                  />
                                  {formatDate(
                                    payment.paid_at
                                  )}
                                </span>

                                <span className="flex items-center gap-1">
                                  <Clock
                                    size={10}
                                  />
                                  {formatTime(
                                    payment.paid_at
                                  )}
                                </span>

                              </div>

                            </div>

                          </div>

                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-600">
                            PAYÉ
                          </span>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>

            {/* SUPPRIMER */}

            <button
              type="button"
              onClick={() =>
                deleteDebt(
                  selectedDebt
                )
              }
              disabled={
                deletingDebt ||
                payingDebt
              }
              className="
                mt-5
                flex
                min-h-[44px]
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-red-100
                bg-red-50
                text-xs
                font-black
                text-red-600
                transition
                hover:bg-red-100
                disabled:opacity-50
              "
            >
              {deletingDebt ? (
                <>
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2
                    size={15}
                  />
                  Supprimer cette dette
                </>
              )}
            </button>

          </div>
        </div>
      )}

    </main>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  title,
  value,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  tone:
    | "indigo"
    | "emerald"
    | "blue"
    | "violet";
}) {
  const toneClass =
    tone === "indigo"
      ? "bg-indigo-50 text-indigo-600"
      : tone === "emerald"
      ? "bg-emerald-50 text-emerald-600"
      : tone === "blue"
      ? "bg-blue-50 text-blue-600"
      : "bg-violet-50 text-violet-600";

  return (
    <div
      className="
        overflow-hidden
        rounded-2xl
        border
        border-slate-200/80
        bg-white
        p-4
        shadow-[0_8px_25px_rgba(15,23,42,0.04)]
        transition
        hover:-translate-y-[1px]
        hover:shadow-lg
        hover:shadow-slate-200/60
        sm:p-5
      "
    >

      <div
        className={`
          mb-3
          flex
          h-9
          w-9
          items-center
          justify-center
          rounded-xl
          ${toneClass}
        `}
      >
        {icon}
      </div>

      <p className="text-[10px] font-black text-slate-400 sm:text-xs">
        {title}
      </p>

      <p className="mt-1 break-words text-sm font-black text-slate-900 sm:text-lg">
        {value}
      </p>

      {subtitle && (
        <p className="mt-1 text-[9px] font-bold text-slate-400 sm:text-[11px]">
          {subtitle}
        </p>
      )}

    </div>
  );
}