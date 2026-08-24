"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

import {
  PlusCircle,
  Trash2,
  Wallet,
  Banknote,
  Search,
  History,
  CalendarDays,
  RefreshCw,
  Wifi,
  WifiOff,
  CloudOff,
  Cloud,
  CheckCircle,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react";

/* ============================================================
   TYPES
============================================================ */

type Expense = {
  local_id: string;
  id?: number | string;
  user_id: string;
  title: string;
  amount: number;
  currency: string;
  created_at: string;
  synced: boolean;
};

type PendingExpenseDelete = {
  local_id: string;
  server_id?: number | string;
  user_id: string;
  created_at: number;
};

type SyncStatus =
  | "online"
  | "offline"
  | "syncing"
  | "error";

type Notice = {
  type: "success" | "error" | "info";
  title: string;
  message: string;
} | null;

/* ============================================================
   INDEXED DB
============================================================ */

const EXPENSES_DB_NAME =
  "biso-commerce-expenses";

const EXPENSES_DB_VERSION = 1;

const EXPENSES_STORE =
  "expenses";

const EXPENSE_DELETE_QUEUE =
  "expense_delete_queue";

let expensesDBPromise:
  | Promise<IDBDatabase>
  | null = null;

/* ============================================================
   OUVRIR INDEXED DB
============================================================ */

function openExpensesDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error(
        "IndexedDB est disponible uniquement dans le navigateur."
      )
    );
  }

  if (expensesDBPromise) {
    return expensesDBPromise;
  }

  expensesDBPromise =
    new Promise<IDBDatabase>(
      (resolve, reject) => {
        const request =
          indexedDB.open(
            EXPENSES_DB_NAME,
            EXPENSES_DB_VERSION
          );

        request.onupgradeneeded =
          () => {
            const db =
              request.result;

            const transaction =
              request.transaction;

            if (!transaction) {
              return;
            }

            /* ==================================================
               STORE DÉPENSES
            ================================================== */

            let expensesStore:
              IDBObjectStore;

            if (
              !db.objectStoreNames.contains(
                EXPENSES_STORE
              )
            ) {
              expensesStore =
                db.createObjectStore(
                  EXPENSES_STORE,
                  {
                    keyPath:
                      "local_id",
                  }
                );
            } else {
              expensesStore =
                transaction.objectStore(
                  EXPENSES_STORE
                );
            }

            if (
              !expensesStore.indexNames.contains(
                "user_id"
              )
            ) {
              expensesStore.createIndex(
                "user_id",
                "user_id",
                {
                  unique: false,
                }
              );
            }

            if (
              !expensesStore.indexNames.contains(
                "created_at"
              )
            ) {
              expensesStore.createIndex(
                "created_at",
                "created_at",
                {
                  unique: false,
                }
              );
            }

            if (
              !expensesStore.indexNames.contains(
                "synced"
              )
            ) {
              expensesStore.createIndex(
                "synced",
                "synced",
                {
                  unique: false,
                }
              );
            }

            /* ==================================================
               FILE DE SUPPRESSION
            ================================================== */

            let deleteStore:
              IDBObjectStore;

            if (
              !db.objectStoreNames.contains(
                EXPENSE_DELETE_QUEUE
              )
            ) {
              deleteStore =
                db.createObjectStore(
                  EXPENSE_DELETE_QUEUE,
                  {
                    keyPath:
                      "local_id",
                  }
                );
            } else {
              deleteStore =
                transaction.objectStore(
                  EXPENSE_DELETE_QUEUE
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

        request.onsuccess =
          () => {
            const db =
              request.result;

            /*
              IMPORTANT :
              On ne ferme jamais cette connexion
              après chaque opération.
            */

            db.onversionchange =
              () => {
                db.close();
                expensesDBPromise =
                  null;
              };

            resolve(db);
          };

        request.onerror = () => {
          expensesDBPromise =
            null;

          reject(
            request.error ||
              new Error(
                "Impossible d'ouvrir la base locale des dépenses."
              )
          );
        };

        request.onblocked = () => {
          console.warn(
            "La base locale des dépenses est bloquée."
          );
        };
      }
    );

  return expensesDBPromise;
}

/* ============================================================
   SAUVEGARDER UNE DÉPENSE LOCALE
============================================================ */

async function saveExpenseLocal(
  expense: Expense
): Promise<void> {
  const db =
    await openExpensesDB();

  return new Promise(
    (resolve, reject) => {
      let transaction: IDBTransaction;

      try {
        transaction =
          db.transaction(
            EXPENSES_STORE,
            "readwrite"
          );
      } catch (error) {
        reject(error);
        return;
      }

      const store =
        transaction.objectStore(
          EXPENSES_STORE
        );

      store.put(expense);

      transaction.oncomplete =
        () => {
          resolve();
        };

      transaction.onerror = () => {
        reject(
          transaction.error ||
            new Error(
              "Impossible de sauvegarder la dépense localement."
            )
        );
      };

      transaction.onabort = () => {
        reject(
          transaction.error ||
            new Error(
              "La sauvegarde locale a été interrompue."
            )
        );
      };
    }
  );
}

/* ============================================================
   RÉCUPÉRER LES DÉPENSES LOCALES
============================================================ */

async function getLocalExpenses(): Promise<
  Expense[]
> {
  const db =
    await openExpensesDB();

  return new Promise(
    (resolve, reject) => {
      let transaction: IDBTransaction;

      try {
        transaction =
          db.transaction(
            EXPENSES_STORE,
            "readonly"
          );
      } catch (error) {
        reject(error);
        return;
      }

      const request =
        transaction
          .objectStore(
            EXPENSES_STORE
          )
          .getAll();

      request.onsuccess = () => {
        const list =
          (request.result ||
            []) as Expense[];

        list.sort(
          (a, b) =>
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
        );

        resolve(list);
      };

      request.onerror = () => {
        reject(
          request.error ||
            new Error(
              "Impossible de récupérer les dépenses locales."
            )
        );
      };
    }
  );
}

/* ============================================================
   SUPPRIMER UNE DÉPENSE LOCALE
============================================================ */

async function removeLocalExpense(
  localId: string
): Promise<void> {
  const db =
    await openExpensesDB();

  return new Promise(
    (resolve, reject) => {
      let transaction: IDBTransaction;

      try {
        transaction =
          db.transaction(
            EXPENSES_STORE,
            "readwrite"
          );
      } catch (error) {
        reject(error);
        return;
      }

      transaction
        .objectStore(
          EXPENSES_STORE
        )
        .delete(localId);

      transaction.oncomplete =
        () => {
          resolve();
        };

      transaction.onerror = () => {
        reject(
          transaction.error ||
            new Error(
              "Impossible de supprimer la dépense localement."
            )
        );
      };
    }
  );
}

/* ============================================================
   AJOUTER À LA FILE DE SUPPRESSION
============================================================ */

async function addExpenseDeleteQueue(
  item: PendingExpenseDelete
): Promise<void> {
  const db =
    await openExpensesDB();

  return new Promise(
    (resolve, reject) => {
      let transaction: IDBTransaction;

      try {
        transaction =
          db.transaction(
            EXPENSE_DELETE_QUEUE,
            "readwrite"
          );
      } catch (error) {
        reject(error);
        return;
      }

      transaction
        .objectStore(
          EXPENSE_DELETE_QUEUE
        )
        .put(item);

      transaction.oncomplete =
        () => {
          resolve();
        };

      transaction.onerror = () => {
        reject(
          transaction.error ||
            new Error(
              "Impossible d'enregistrer la suppression locale."
            )
        );
      };
    }
  );
}

/* ============================================================
   LIRE LA FILE DE SUPPRESSION
============================================================ */

async function getExpenseDeleteQueue(): Promise<
  PendingExpenseDelete[]
> {
  const db =
    await openExpensesDB();

  return new Promise(
    (resolve, reject) => {
      let transaction: IDBTransaction;

      try {
        transaction =
          db.transaction(
            EXPENSE_DELETE_QUEUE,
            "readonly"
          );
      } catch (error) {
        reject(error);
        return;
      }

      const request =
        transaction
          .objectStore(
            EXPENSE_DELETE_QUEUE
          )
          .getAll();

      request.onsuccess = () => {
        resolve(
          (request.result ||
            []) as PendingExpenseDelete[]
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

/* ============================================================
   SUPPRIMER DE LA FILE
============================================================ */

async function removeExpenseDeleteQueue(
  localId: string
): Promise<void> {
  const db =
    await openExpensesDB();

  return new Promise(
    (resolve, reject) => {
      let transaction: IDBTransaction;

      try {
        transaction =
          db.transaction(
            EXPENSE_DELETE_QUEUE,
            "readwrite"
          );
      } catch (error) {
        reject(error);
        return;
      }

      transaction
        .objectStore(
          EXPENSE_DELETE_QUEUE
        )
        .delete(localId);

      transaction.oncomplete =
        () => {
          resolve();
        };

      transaction.onerror = () => {
        reject(
          transaction.error ||
            new Error(
              "Impossible de terminer la suppression."
            )
        );
      };
    }
  );
}

/* ============================================================
   UTILISATEUR
============================================================ */

async function resolveUserId(): Promise<
  string | null
> {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const savedUserId =
    localStorage.getItem(
      "user_id"
    );

  if (savedUserId) {
    return String(
      savedUserId
    );
  }

  if (!navigator.onLine) {
    return null;
  }

  const phone =
    localStorage.getItem(
      "phone"
    );

  if (!phone) {
    return null;
  }

  try {
    const {
      data: user,
      error,
    } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
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
  } catch {
    return null;
  }
}

/* ============================================================
   DATE LOCALE
============================================================ */

function getDate(
  date: Date
): string {
  const offset =
    date.getTimezoneOffset() *
    60000;

  return new Date(
    date.getTime() -
      offset
  )
    .toISOString()
    .split("T")[0];
}

/* ============================================================
   FORMAT ARGENT
============================================================ */

function formatMoney(
  value: number
): string {
  return Math.round(
    Number(value || 0)
  )
    .toString()
    .replace(
      /\B(?=(\d{3})+(?!\d))/g,
      " "
    );
}

/* ============================================================
   PAGE DÉPENSES
============================================================ */

export default function ExpensesPage() {
  const [
    expenses,
    setExpenses,
  ] = useState<Expense[]>([]);

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    currency,
    setCurrency,
  ] = useState("FC");

  const [
    showAll,
    setShowAll,
  ] = useState(false);

  const [
    searchDate,
    setSearchDate,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    loadingExpenses,
    setLoadingExpenses,
  ] = useState(true);

  const [
    isOnline,
    setIsOnline,
  ] = useState(true);

  const [
    syncStatus,
    setSyncStatus,
  ] = useState<SyncStatus>(
    "online"
  );

  const [
    notice,
    setNotice,
  ] = useState<Notice>(
    null
  );

  const [
    pendingDeletes,
    setPendingDeletes,
  ] = useState(0);

  /* ==========================================================
     POPUP SUCCÈS AJOUT
  ========================================================== */

  const [
    showExpenseSuccess,
    setShowExpenseSuccess,
  ] = useState(false);

  /* ==========================================================
     MODAL SUPPRESSION
  ========================================================== */

  const [
    deleteTarget,
    setDeleteTarget,
  ] = useState<Expense | null>(
    null
  );

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  /* ==========================================================
     DATES
  ========================================================== */

  const todayStr =
    getDate(new Date());

  const yesterdayStr =
    getDate(
      new Date(
        Date.now() -
          86400000
      )
    );

  /* ==========================================================
     CHARGER LES LOCALES
  ========================================================== */

  const loadLocalExpenses =
    useCallback(
      async () => {
        try {
          const userId =
            await resolveUserId();

          if (!userId) {
            setExpenses([]);
            return;
          }

          const local =
            await getLocalExpenses();

          const userExpenses =
            local.filter(
              (expense) =>
                String(
                  expense.user_id
                ) ===
                String(
                  userId
                )
            );

          userExpenses.sort(
            (a, b) =>
              new Date(
                b.created_at
              ).getTime() -
              new Date(
                a.created_at
              ).getTime()
          );

          setExpenses(
            userExpenses
          );
        } catch (error) {
          console.error(
            "Erreur lecture dépenses locales :",
            error
          );
        }
      },
      []
    );

  /* ==========================================================
     NOMBRE SUPPRESSIONS EN ATTENTE
  ========================================================== */

  const updatePendingDeletes =
    useCallback(
      async () => {
        try {
          const userId =
            await resolveUserId();

          if (!userId) {
            setPendingDeletes(
              0
            );
            return;
          }

          const queue =
            await getExpenseDeleteQueue();

          const count =
            queue.filter(
              (item) =>
                String(
                  item.user_id
                ) ===
                String(
                  userId
                )
            ).length;

          setPendingDeletes(
            count
          );
        } catch (error) {
          console.error(
            "Erreur compteur suppressions :",
            error
          );
        }
      },
      []
    );

  /* ==========================================================
     SYNCHRONISER SUPPRESSIONS
  ========================================================== */

  const syncPendingExpenseDeletes =
    useCallback(
      async () => {
        if (
          typeof navigator !==
            "undefined" &&
          !navigator.onLine
        ) {
          return;
        }

        const userId =
          await resolveUserId();

        if (!userId) {
          return;
        }

        let queue:
          PendingExpenseDelete[];

        try {
          queue =
            await getExpenseDeleteQueue();
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
              String(
                item.user_id
              ) ===
              String(
                userId
              )
          );

        if (
          !userQueue.length
        ) {
          setPendingDeletes(
            0
          );
          return;
        }

        setSyncStatus(
          "syncing"
        );

        for (
          const item of userQueue
        ) {
          try {
            if (
              item.server_id !==
                undefined &&
              item.server_id !==
                null
            ) {
              const {
                error,
              } = await supabase
                .from(
                  "expenses"
                )
                .delete()
                .eq(
                  "id",
                  item.server_id
                )
                .eq(
                  "user_id",
                  userId
                );

              if (error) {
                throw error;
              }
            }

            await removeExpenseDeleteQueue(
              item.local_id
            );
          } catch (error) {
            console.error(
              "Erreur synchronisation suppression :",
              error
            );

            setSyncStatus(
              "error"
            );

            return;
          }
        }

        await updatePendingDeletes();

        setSyncStatus(
          "online"
        );
      },
      [
        updatePendingDeletes,
      ]
    );

  /* ==========================================================
     SYNCHRONISER AJOUTS LOCAUX
  ========================================================== */

  const syncLocalExpenses =
    useCallback(
      async () => {
        if (
          typeof navigator !==
            "undefined" &&
          !navigator.onLine
        ) {
          return;
        }

        const userId =
          await resolveUserId();

        if (!userId) {
          return;
        }

        try {
          const local =
            await getLocalExpenses();

          const pending =
            local.filter(
              (expense) =>
                String(
                  expense.user_id
                ) ===
                  String(
                    userId
                  ) &&
                expense.synced ===
                  false
            );

          if (
            !pending.length
          ) {
            return;
          }

          setSyncStatus(
            "syncing"
          );

          for (
            const expense of pending
          ) {
            try {
              const {
                data,
                error,
              } = await supabase
                .from(
                  "expenses"
                )
                .insert({
                  title:
                    expense.title,

                  amount:
                    expense.amount,

                  currency:
                    expense.currency,

                  user_id:
                    userId,

                  created_at:
                    expense.created_at,
                })
                .select(
                  "id,title,amount,currency,created_at,user_id"
                )
                .single();

              if (error) {
                throw error;
              }

              await saveExpenseLocal(
                {
                  ...expense,

                  id: data.id,

                  user_id:
                    String(
                      data.user_id ||
                        userId
                    ),

                  title:
                    data.title,

                  amount:
                    Number(
                      data.amount
                    ) || 0,

                  currency:
                    data.currency,

                  created_at:
                    data.created_at,

                  synced:
                    true,
                }
              );
            } catch (error) {
              console.error(
                "Erreur synchronisation dépense :",
                error
              );
            }
          }

          await loadLocalExpenses();

          setSyncStatus(
            "online"
          );
        } catch (error) {
          console.error(
            "Erreur globale synchronisation :",
            error
          );

          setSyncStatus(
            "error"
          );
        }
      },
      [
        loadLocalExpenses,
      ]
    );

  /* ==========================================================
     CHARGER DEPUIS SUPABASE
  ========================================================== */

  const loadOnlineExpenses =
    useCallback(
      async () => {
        if (
          typeof navigator !==
            "undefined" &&
          !navigator.onLine
        ) {
          return;
        }

        const userId =
          await resolveUserId();

        if (!userId) {
          return;
        }

        try {
          setSyncStatus(
            "syncing"
          );

          const {
            data,
            error,
          } = await supabase
            .from("expenses")
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

          const local =
            await getLocalExpenses();

          const userLocal =
            local.filter(
              (expense) =>
                String(
                  expense.user_id
                ) ===
                String(
                  userId
                )
            );

          for (
            const serverExpense of
              data || []
          ) {
            const existing =
              userLocal.find(
                (expense) =>
                  String(
                    expense.id ??
                      ""
                  ) ===
                  String(
                    serverExpense.id
                  )
              );

            const expenseToSave:
              Expense = {
              local_id:
                existing?.local_id ||
                `server-${serverExpense.id}`,

              id:
                serverExpense.id,

              user_id:
                String(
                  serverExpense.user_id
                ),

              title:
                serverExpense.title,

              amount:
                Number(
                  serverExpense.amount
                ) || 0,

              currency:
                serverExpense.currency,

              created_at:
                serverExpense.created_at,

              synced:
                true,
            };

            await saveExpenseLocal(
              expenseToSave
            );
          }

          await loadLocalExpenses();

          setSyncStatus(
            "online"
          );
        } catch (error) {
          console.error(
            "Erreur chargement Supabase :",
            error
          );

          await loadLocalExpenses();

          setSyncStatus(
            "error"
          );
        }
      },
      [
        loadLocalExpenses,
      ]
    );

  /* ==========================================================
     CHARGEMENT GLOBAL
  ========================================================== */

  const loadExpenses =
    useCallback(
      async () => {
        setLoadingExpenses(
          true
        );

        try {
          await loadLocalExpenses();

          if (
            typeof navigator !==
              "undefined" &&
            navigator.onLine
          ) {
            await syncPendingExpenseDeletes();

            await syncLocalExpenses();

            await loadOnlineExpenses();
          } else {
            setSyncStatus(
              "offline"
            );
          }

          await updatePendingDeletes();
        } catch (error) {
          console.error(
            "Erreur chargement dépenses :",
            error
          );
        } finally {
          setLoadingExpenses(
            false
          );
        }
      },
      [
        loadLocalExpenses,
        syncPendingExpenseDeletes,
        syncLocalExpenses,
        loadOnlineExpenses,
        updatePendingDeletes,
      ]
    );

  /* ==========================================================
     INITIALISATION
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    const init =
      async () => {
        try {
          await openExpensesDB();

          if (!mounted) {
            return;
          }

          setIsOnline(
            navigator.onLine
          );

          await loadExpenses();
        } catch (error) {
          console.error(
            "Erreur initialisation :",
            error
          );
        }
      };

    init();

    return () => {
      mounted = false;
    };
  }, [loadExpenses]);

  /* ==========================================================
     ONLINE / OFFLINE
  ========================================================== */

  useEffect(() => {
    const handleOnline =
      async () => {
        setIsOnline(true);

        setSyncStatus(
          "syncing"
        );

        setNotice({
          type: "info",
          title:
            "Connexion retrouvée",
          message:
            "Synchronisation automatique de vos dépenses en cours.",
        });

        await syncPendingExpenseDeletes();

        await syncLocalExpenses();

        await loadOnlineExpenses();

        await updatePendingDeletes();

        setNotice({
          type: "success",
          title:
            "Synchronisation terminée",
          message:
            "Vos dépenses locales sont maintenant synchronisées avec BISO-COMMERCE.",
        });
      };

    const handleOffline =
      () => {
        setIsOnline(false);

        setSyncStatus(
          "offline"
        );

        setNotice({
          type: "info",
          title:
            "Mode hors connexion",
          message:
            "Vous pouvez continuer à enregistrer, consulter et supprimer vos dépenses. Elles seront synchronisées automatiquement au retour d'Internet.",
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
    syncPendingExpenseDeletes,
    syncLocalExpenses,
    loadOnlineExpenses,
    updatePendingDeletes,
  ]);

  /* ==========================================================
     AJOUTER UNE DÉPENSE
  ========================================================== */

  const addExpense =
    async () => {
      if (loading) {
        return;
      }

      setNotice(null);

      if (
        !title.trim() ||
        !amount
      ) {
        setNotice({
          type: "error",
          title:
            "Informations manquantes",
          message:
            "Remplissez le nom et le montant de la dépense.",
        });

        return;
      }

      const numericAmount =
        Number(amount);

      if (
        !Number.isFinite(
          numericAmount
        )
      ) {
        setNotice({
          type: "error",
          title:
            "Montant invalide",
          message:
            "Veuillez saisir un montant valide.",
        });

        return;
      }

      if (
        numericAmount <= 0
      ) {
        setNotice({
          type: "error",
          title:
            "Montant invalide",
          message:
            "Le montant doit être supérieur à zéro.",
        });

        return;
      }

      const userId =
        await resolveUserId();

      if (!userId) {
        setNotice({
          type: "error",
          title:
            "Compte introuvable",
          message:
            "Votre utilisateur n'est pas identifié sur cet appareil.",
        });

        return;
      }

      setLoading(true);

      try {
        const localExpense:
          Expense = {
          local_id:
            crypto.randomUUID(),

          user_id:
            userId,

          title:
            title.trim(),

          amount:
            numericAmount,

          currency:
            currency,

          created_at:
            new Date().toISOString(),

          synced:
            false,
        };

        /* ==================================================
           SAUVEGARDE LOCALE PRIORITAIRE
        ================================================== */

        await saveExpenseLocal(
          localExpense
        );

        /* ==================================================
           AFFICHAGE IMMÉDIAT
        ================================================== */

        setExpenses(
          (current) =>
            [
              localExpense,
              ...current,
            ].sort(
              (a, b) =>
                new Date(
                  b.created_at
                ).getTime() -
                new Date(
                  a.created_at
                ).getTime()
            )
        );

        /* ==================================================
           RESET FORMULAIRE
        ================================================== */

        setTitle("");
        setAmount("");

        /* ==================================================
           OUVRIR LA CONFIRMATION
        ================================================== */

        setShowExpenseSuccess(
          true
        );

        /* ==================================================
           SYNCHRONISATION
        ================================================== */

        if (!navigator.onLine) {
          setSyncStatus(
            "offline"
          );
        } else {
          setSyncStatus(
            "syncing"
          );

          void syncLocalExpenses();
        }
      } catch (error) {
        console.error(
          "Erreur ajout dépense :",
          error
        );

        setNotice({
          type: "error",
          title:
            "Enregistrement impossible",
          message:
            "La dépense n'a pas pu être enregistrée sur cet appareil.",
        });
      } finally {
        setLoading(false);
      }
    };

  /* ==========================================================
     DEMANDER SUPPRESSION
  ========================================================== */

  const askDeleteExpense =
    (expense: Expense) => {
      if (deleting) {
        return;
      }

      setDeleteTarget(
        expense
      );
    };

  /* ==========================================================
     SUPPRIMER UNE DÉPENSE
  ========================================================== */

  const deleteExpense =
    async () => {
      const expense =
        deleteTarget;

      if (!expense) {
        return;
      }

      if (deleting) {
        return;
      }

      const previousExpenses =
        expenses;

      setDeleting(true);

      try {
        /* ==================================================
           SUPPRESSION IMMÉDIATE DE L'INTERFACE
        ================================================== */

        setExpenses(
          (current) =>
            current.filter(
              (item) =>
                item.local_id !==
                expense.local_id
            )
        );

        /* ==================================================
           PAS ENCORE SYNCHRONISÉE
        ================================================== */

        if (
          !expense.synced
        ) {
          await removeLocalExpense(
            expense.local_id
          );

          setDeleteTarget(
            null
          );

          setNotice({
            type: "success",
            title:
              "Dépense supprimée",
            message:
              "La dépense a été supprimée définitivement de cet appareil.",
          });

          return;
        }

        /* ==================================================
           SUPPRIMER DU CACHE LOCAL
        ================================================== */

        await removeLocalExpense(
          expense.local_id
        );

        /* ==================================================
           HORS CONNEXION
        ================================================== */

        if (!navigator.onLine) {
          await addExpenseDeleteQueue({
            local_id:
              expense.local_id,

            server_id:
              expense.id,

            user_id:
              expense.user_id,

            created_at:
              Date.now(),
          });

          await updatePendingDeletes();

          setSyncStatus(
            "offline"
          );

          setDeleteTarget(
            null
          );

          setNotice({
            type: "success",
            title:
              "Suppression enregistrée",
            message:
              "La dépense est supprimée de l'appareil. Sa suppression sur le serveur sera effectuée automatiquement dès que la connexion reviendra.",
          });

          return;
        }

        /* ==================================================
           EN LIGNE
        ================================================== */

        if (
          expense.id ===
            undefined ||
          expense.id ===
            null
        ) {
          throw new Error(
            "Identifiant serveur de la dépense introuvable."
          );
        }

        setSyncStatus(
          "syncing"
        );

        const {
          data,
          error,
        } = await supabase
          .from("expenses")
          .delete()
          .eq(
            "id",
            expense.id
          )
          .eq(
            "user_id",
            expense.user_id
          )
          .select("id");

        if (error) {
          throw error;
        }

        if (
          !data ||
          data.length ===
            0
        ) {
          throw new Error(
            "La dépense n'a pas été supprimée du serveur."
          );
        }

        setSyncStatus(
          "online"
        );

        setDeleteTarget(
          null
        );

        setNotice({
          type: "success",
          title:
            "Dépense supprimée",
          message:
            "La dépense a été supprimée définitivement.",
        });
      } catch (error) {
        console.error(
          "Erreur suppression dépense :",
          error
        );

        /* ==================================================
           INTERNET TOMBÉ
        ================================================== */

        if (
          !navigator.onLine &&
          expense.synced
        ) {
          try {
            await addExpenseDeleteQueue({
              local_id:
                expense.local_id,

              server_id:
                expense.id,

              user_id:
                expense.user_id,

              created_at:
                Date.now(),
            });

            await updatePendingDeletes();

            setSyncStatus(
              "offline"
            );

            setDeleteTarget(
              null
            );

            setNotice({
              type: "success",
              title:
                "Suppression enregistrée",
              message:
                "La suppression sera synchronisée automatiquement au retour de la connexion.",
            });

            return;
          } catch {
            /* restauration ci-dessous */
          }
        }

        /* ==================================================
           RESTAURATION
        ================================================== */

        try {
          await saveExpenseLocal(
            expense
          );
        } catch (restoreError) {
          console.error(
            "Erreur restauration :",
            restoreError
          );
        }

        setExpenses(
          previousExpenses
        );

        setSyncStatus(
          "error"
        );

        setNotice({
          type: "error",
          title:
            "Suppression impossible",
          message:
            "La dépense a été restaurée car sa suppression n'a pas pu être finalisée.",
        });
      } finally {
        setDeleting(false);
      }
    };

  /* ==========================================================
     ACTUALISER
  ========================================================== */

  const refreshExpenses =
    async () => {
      if (
        loadingExpenses
      ) {
        return;
      }

      await loadExpenses();
    };

  /* ==========================================================
     TOTALS
  ========================================================== */

  const totals =
    useMemo(() => {
      let fc = 0;
      let usd = 0;

      expenses.forEach(
        (expense) => {
          const expenseDate =
            expense.created_at.split(
              "T"
            )[0];

          if (
            expenseDate !==
            todayStr
          ) {
            return;
          }

          const amountValue =
            Number(
              expense.amount ||
                0
            );

          const currencyValue =
            String(
              expense.currency ||
                ""
            ).toUpperCase();

          if (
            currencyValue ===
            "FC"
          ) {
            fc += amountValue;
          } else if (
            currencyValue ===
              "$" ||
            currencyValue ===
              "USD"
          ) {
            usd += amountValue;
          }
        }
      );

      return {
        fc,
        usd,
      };
    }, [
      expenses,
      todayStr,
    ]);

  const totalFc =
    totals.fc;

  const totalUsd =
    totals.usd;

  /* ==========================================================
     DÉPENSES AUJOURD'HUI
  ========================================================== */

  const todayExpenses =
    expenses.filter(
      (expense) =>
        expense.created_at.split(
          "T"
        )[0] ===
        todayStr
    );

  /* ==========================================================
     DÉPENSES HIER
  ========================================================== */

  const yesterdayExpenses =
    expenses.filter(
      (expense) =>
        expense.created_at.split(
          "T"
        )[0] ===
        yesterdayStr
    );

  /* ==========================================================
     RECHERCHE DATE
  ========================================================== */

  const searchedExpenses =
    searchDate
      ? expenses.filter(
          (expense) =>
            expense.created_at.split(
              "T"
            )[0] ===
            searchDate
        )
      : expenses;

  const displayedExpenses =
    searchDate
      ? searchedExpenses
      : expenses;

  /* ==========================================================
     RENDU
  ========================================================== */

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#f5f7fb]">
      <div className="mx-auto w-full max-w-7xl space-y-5 overflow-x-hidden p-4 sm:p-6 lg:p-8">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div
          className="
            w-full
            overflow-hidden
            rounded-[26px]
            border
            border-slate-100
            bg-white
            p-5
            shadow-sm
            sm:p-6
          "
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex min-w-0 items-center gap-4">
              <div
                className="
                  flex
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-indigo-50
                  p-3
                "
              >
                <Wallet
                  className="text-indigo-600"
                  size={30}
                />
              </div>

              <div className="min-w-0">

                <h1
                  className="
                    break-words
                    text-2xl
                    font-black
                    tracking-tight
                    text-slate-900
                    sm:text-3xl
                  "
                >
                  Gestion des dépenses
                </h1>

                <p
                  className="
                    mt-1
                    break-words
                    text-sm
                    leading-6
                    text-slate-500
                  "
                >
                  Suivi des sorties d'argent du commerce
                </p>

              </div>
            </div>

            {/* STATUT */}

            <div className="flex flex-wrap items-center gap-2">

              <div
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${
                  isOnline
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {isOnline ? (
                  <>
                    <Wifi size={15} />
                    En ligne
                  </>
                ) : (
                  <>
                    <WifiOff size={15} />
                    Hors connexion
                  </>
                )}
              </div>

              {syncStatus ===
                "syncing" && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700">
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                  Synchronisation...
                </div>
              )}

              {syncStatus ===
                "online" &&
                isOnline && (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                    <Cloud size={15} />
                    Synchronisé
                  </div>
                )}

              {pendingDeletes >
                0 && (
                <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">
                  <CloudOff size={15} />

                  {pendingDeletes} suppression
                  {pendingDeletes >
                  1
                    ? "s"
                    : ""}{" "}
                  en attente
                </div>
              )}

              <button
                type="button"
                onClick={
                  refreshExpenses
                }
                disabled={
                  loadingExpenses
                }
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-3
                  py-2
                  text-xs
                  font-black
                  text-slate-700
                  shadow-sm
                  transition
                  hover:bg-slate-50
                  disabled:opacity-50
                "
              >
                <RefreshCw
                  size={15}
                  className={
                    loadingExpenses
                      ? "animate-spin"
                      : ""
                  }
                />
                Actualiser
              </button>

            </div>
          </div>

          {!isOnline && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-3.5">
              <CloudOff
                size={18}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div>
                <p className="text-xs font-black text-amber-800">
                  Mode hors connexion
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700">
                  Vous pouvez continuer à enregistrer,
                  consulter et supprimer vos dépenses.
                  Les changements seront synchronisés
                  automatiquement lorsque Internet reviendra.
                </p>
              </div>
            </div>
          )}

          {notice && (
            <div
              className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 ${
                notice.type ===
                "success"
                  ? "border-emerald-100 bg-emerald-50"
                  : notice.type ===
                    "error"
                  ? "border-red-100 bg-red-50"
                  : "border-indigo-100 bg-indigo-50"
              }`}
              role="status"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white ${
                  notice.type ===
                  "success"
                    ? "text-emerald-600"
                    : notice.type ===
                      "error"
                    ? "text-red-600"
                    : "text-indigo-600"
                }`}
              >
                {notice.type ===
                "success" ? (
                  <CheckCircle
                    size={18}
                  />
                ) : (
                  <AlertTriangle
                    size={18}
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-black ${
                    notice.type ===
                    "success"
                      ? "text-emerald-800"
                      : notice.type ===
                        "error"
                      ? "text-red-800"
                      : "text-indigo-800"
                  }`}
                >
                  {notice.title}
                </p>

                <p
                  className={`mt-1 text-xs leading-5 ${
                    notice.type ===
                    "success"
                      ? "text-emerald-700"
                      : notice.type ===
                        "error"
                      ? "text-red-700"
                      : "text-indigo-700"
                  }`}
                >
                  {notice.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setNotice(null)
                }
                className="rounded-lg p-1 text-slate-400 hover:bg-white"
                aria-label="Fermer"
              >
                <X size={15} />
              </button>
            </div>
          )}
        </div>

        {/* ====================================================
            STATISTIQUES
        ==================================================== */}

        <div
          className="
            grid
            w-full
            grid-cols-2
            gap-3
            sm:gap-5
          "
        >
          <StatCard
            title="Dépenses du jour FC"
            value={`${formatMoney(
              totalFc
            )} FC`}
            description="Total enregistré aujourd'hui"
            icon={
              <Banknote
                size={23}
                className="text-indigo-600"
              />
            }
          />

          <StatCard
            title="Dépenses du jour USD"
            value={`${formatMoney(
              totalUsd
            )} $`}
            description="Total enregistré aujourd'hui"
            icon={
              <Banknote
                size={23}
                className="text-indigo-600"
              />
            }
          />
        </div>

        {/* ====================================================
            AJOUT DÉPENSE
        ==================================================== */}

        <div
          className="
            w-full
            overflow-hidden
            rounded-[26px]
            border
            border-slate-100
            bg-white
            p-5
            shadow-sm
            sm:p-6
          "
        >
          <div
            className="
              mb-6
              flex
              min-w-0
              items-center
              gap-3
            "
          >
            <div
              className="
                flex
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-indigo-50
                p-2.5
              "
            >
              <PlusCircle
                size={21}
                className="text-indigo-600"
              />
            </div>

            <div className="min-w-0">
              <h2
                className="
                  break-words
                  text-xl
                  font-black
                  text-slate-900
                "
              >
                Nouvelle dépense
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Enregistrez une nouvelle sortie d'argent
              </p>
            </div>
          </div>

          <div className="space-y-5">

            {/* NOM */}

            <div className="min-w-0">
              <label className="mb-2 block text-xs font-bold text-slate-600">
                Nom de la dépense
              </label>

              <input
                placeholder="Nom de la dépense"
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value
                  )
                }
                className="
                  block
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  p-4
                  text-slate-900
                  outline-none
                  transition
                  placeholder:text-slate-400
                  focus:border-indigo-500
                  focus:bg-white
                  focus:ring-4
                  focus:ring-indigo-50
                "
              />
            </div>

            {/* MONTANT */}

            <div className="min-w-0">
              <label className="mb-2 block text-xs font-bold text-slate-600">
                Montant de la dépense
              </label>

              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                placeholder="Montant de la dépense"
                value={amount}
                onChange={(e) =>
                  setAmount(
                    e.target.value
                  )
                }
                className="
                  block
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  p-4
                  text-slate-900
                  outline-none
                  transition
                  placeholder:text-slate-400
                  focus:border-indigo-500
                  focus:bg-white
                  focus:ring-4
                  focus:ring-indigo-50
                "
              />
            </div>

            {/* MONNAIE */}

            <div className="min-w-0">
              <label className="mb-2 block text-xs font-bold text-slate-600">
                Devise
              </label>

              <select
                value={
                  currency
                }
                onChange={(e) =>
                  setCurrency(
                    e.target.value
                  )
                }
                className="
                  block
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  p-4
                  text-slate-900
                  outline-none
                  transition
                  focus:border-indigo-500
                  focus:bg-white
                  focus:ring-4
                  focus:ring-indigo-50
                "
              >
                <option value="FC">
                  🇨🇩 Franc Congolais (FC)
                </option>

                <option value="$">
                  🇺🇸 Dollar ($)
                </option>
              </select>
            </div>

            {/* RÉSUMÉ */}

            {amount &&
              Number(amount) >
                0 && (
                <div
                  className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-indigo-100
                    bg-indigo-50
                    p-4
                  "
                >
                  <p className="text-xs font-bold text-slate-500">
                    Montant
                  </p>

                  <p className="mt-1 break-words text-2xl font-black text-indigo-600">
                    {formatMoney(
                      Number(
                        amount
                      )
                    )}{" "}
                    {currency}
                  </p>
                </div>
              )}

            {/* BOUTON */}

            <button
              type="button"
              onClick={
                addExpense
              }
              disabled={
                loading
              }
              className="
                flex
                min-h-[52px]
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-indigo-600
                py-4
                font-black
                text-white
                shadow-sm
                transition
                hover:bg-indigo-700
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {loading ? (
                <>
                  <Loader2
                    size={20}
                    className="animate-spin"
                  />
                  Enregistrement...
                </>
              ) : (
                <>
                  <PlusCircle size={20} />
                  Ajouter la dépense
                </>
              )}
            </button>
          </div>
        </div>

        {/* ====================================================
            CONTROLES HISTORIQUE
        ==================================================== */}

        <div
          className="
            w-full
            overflow-hidden
            rounded-[26px]
            border
            border-slate-100
            bg-white
            p-5
            shadow-sm
            sm:p-6
          "
        >
          <div
            className="
              mb-5
              flex
              min-w-0
              items-center
              gap-3
            "
          >
            <div
              className="
                flex
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-indigo-50
                p-2.5
              "
            >
              <History
                size={21}
                className="text-indigo-600"
              />
            </div>

            <div className="min-w-0">
              <h2 className="break-words font-black text-slate-900">
                Historique
              </h2>

              <p className="break-words text-xs text-slate-500">
                Consultez les dépenses du commerce
              </p>
            </div>
          </div>

          <div
            className="
              flex
              min-w-0
              flex-col
              gap-3
              md:flex-row
            "
          >
            <div className="relative min-w-0 flex-1">
              <CalendarDays
                size={18}
                className="
                  pointer-events-none
                  absolute
                  left-3
                  top-1/2
                  z-10
                  -translate-y-1/2
                  text-indigo-600
                "
              />

              <input
                type="date"
                value={
                  searchDate
                }
                onChange={(e) =>
                  setSearchDate(
                    e.target.value
                  )
                }
                className="
                  block
                  min-h-[48px]
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50
                  p-3
                  pl-10
                  text-slate-900
                  outline-none
                  transition
                  focus:border-indigo-500
                  focus:bg-white
                  focus:ring-4
                  focus:ring-indigo-50
                "
              />
            </div>

            {searchDate && (
              <button
                type="button"
                onClick={() =>
                  setSearchDate(
                    ""
                  )
                }
                className="
                  min-h-[48px]
                  shrink-0
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-5
                  py-3
                  text-sm
                  font-bold
                  text-slate-600
                  transition
                  hover:bg-slate-50
                "
              >
                Effacer
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setShowAll(
                  !showAll
                )
              }
              className="
                flex
                min-h-[48px]
                shrink-0
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-indigo-600
                px-5
                py-3
                font-black
                text-white
                shadow-sm
                transition
                hover:bg-indigo-700
              "
            >
              <Search size={18} />

              {showAll
                ? "Cacher historique"
                : "Voir toutes les dépenses"}
            </button>
          </div>
        </div>

        {/* ====================================================
            AUJOURD'HUI / HIER
        ==================================================== */}

        {!showAll &&
          !searchDate && (
            <div
              className="
                grid
                w-full
                grid-cols-2
                gap-3
                sm:gap-5
              "
            >
              <ExpenseList
                title="Aujourd'hui"
                data={
                  todayExpenses
                }
                onDelete={
                  askDeleteExpense
                }
              />

              <ExpenseList
                title="Hier"
                data={
                  yesterdayExpenses
                }
                onDelete={
                  askDeleteExpense
                }
              />
            </div>
          )}

        {/* ====================================================
            DATE RECHERCHÉE
        ==================================================== */}

        {searchDate &&
          !showAll && (
            <div
              className="
                w-full
                overflow-hidden
                rounded-[26px]
                border
                border-slate-100
                bg-white
                p-5
                shadow-sm
                sm:p-6
              "
            >
              <div
                className="
                  mb-5
                  flex
                  min-w-0
                  items-center
                  justify-between
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    min-w-0
                    items-center
                    gap-3
                  "
                >
                  <div
                    className="
                      flex
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-indigo-50
                      p-2.5
                    "
                  >
                    <CalendarDays
                      size={21}
                      className="text-indigo-600"
                    />
                  </div>

                  <div className="min-w-0">
                    <h2 className="break-words font-black text-slate-900">
                      Dépenses du{" "}
                      {searchDate}
                    </h2>

                    <p className="break-words text-xs text-slate-500">
                      Dépenses enregistrées à cette date
                    </p>
                  </div>
                </div>

                <span
                  className="
                    shrink-0
                    rounded-xl
                    bg-indigo-50
                    px-3
                    py-2
                    text-xs
                    font-black
                    text-indigo-600
                  "
                >
                  {
                    searchedExpenses.length
                  }
                </span>
              </div>

              {searchedExpenses.length ===
              0 ? (
                <EmptyState />
              ) : (
                <div className="min-w-0">
                  {searchedExpenses.map(
                    (expense) => (
                      <ExpenseRow
                        key={
                          expense.local_id
                        }
                        expense={
                          expense
                        }
                        onDelete={
                          askDeleteExpense
                        }
                      />
                    )
                  )}
                </div>
              )}
            </div>
          )}

        {/* ====================================================
            HISTORIQUE COMPLET
        ==================================================== */}

        {showAll && (
          <div
            className="
              w-full
              overflow-hidden
              rounded-[26px]
              border
              border-slate-100
              bg-white
              p-5
              shadow-sm
              sm:p-6
            "
          >
            <div
              className="
                mb-5
                flex
                min-w-0
                items-center
                justify-between
                gap-3
              "
            >
              <div
                className="
                  flex
                  min-w-0
                  items-center
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-indigo-50
                    p-2.5
                  "
                >
                  <History
                    size={22}
                    className="text-indigo-600"
                  />
                </div>

                <div className="min-w-0">
                  <h2
                    className="
                      break-words
                      text-xl
                      font-black
                      text-slate-900
                    "
                  >
                    Historique complet
                  </h2>

                  <p className="break-words text-xs text-slate-500">
                    Toutes les dépenses enregistrées
                  </p>
                </div>
              </div>

              <div
                className="
                  shrink-0
                  rounded-xl
                  bg-indigo-50
                  px-3
                  py-2
                  text-xs
                  font-bold
                  text-indigo-600
                "
              >
                {
                  displayedExpenses.length
                }{" "}
                dépense
                {displayedExpenses.length >
                1
                  ? "s"
                  : ""}
              </div>
            </div>

            {displayedExpenses.length ===
            0 ? (
              <EmptyState
                showDescription
              />
            ) : (
              <div className="min-w-0">
                {displayedExpenses.map(
                  (expense) => (
                    <ExpenseRow
                      key={
                        expense.local_id
                      }
                      expense={
                        expense
                      }
                      onDelete={
                        askDeleteExpense
                      }
                    />
                  )
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ======================================================
          POPUP SUCCÈS — AJOUT DÉPENSE
      ====================================================== */}

      {showExpenseSuccess && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-slate-950/45
            p-4
            backdrop-blur-sm
          "
          role="dialog"
          aria-modal="true"
          aria-labelledby="expense-success-title"
        >
          <div
            className="
              w-full
              max-w-md
              overflow-hidden
              rounded-[28px]
              border
              border-slate-200
              bg-white
              shadow-2xl
            "
          >
            <div className="p-5 sm:p-6">

              <div className="flex flex-col items-center text-center">

                <div
                  className="
                    flex
                    h-16
                    w-16
                    items-center
                    justify-center
                    rounded-2xl
                    bg-emerald-50
                    text-emerald-600
                  "
                >
                  <CheckCircle size={34} />
                </div>

                <h2
                  id="expense-success-title"
                  className="
                    mt-4
                    text-xl
                    font-black
                    text-slate-900
                    sm:text-2xl
                  "
                >
                  Dépense enregistrée ✅
                </h2>

                

                {!isOnline ? (
                  <div
                    className="
                      mt-4
                      w-full
                      rounded-2xl
                      border
                      border-amber-100
                      bg-amber-50
                      p-3
                      text-left
                    "
                  >
                    <div className="flex items-start gap-2.5">

                      <CloudOff
                        size={18}
                        className="
                          mt-0.5
                          shrink-0
                          text-amber-600
                        "
                      />

                      <div>
                        <p className="text-xs font-black text-amber-800">
                          Enregistrée hors connexion
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-amber-700">
                          Elle reste enregistrée
                          sur cet appareil et sera
                          automatiquement synchronisée
                          lorsque Internet reviendra.
                        </p>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div
                    className="
                      mt-4
                      w-full
                      rounded-2xl
                      border
                      border-indigo-100
                      bg-indigo-50
                      p-3
                      text-left
                    "
                  >
                    <div className="flex items-start gap-2.5">


                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setShowExpenseSuccess(
                      false
                    )
                  }
                  className="
                    mt-5
                    flex
                    min-h-[50px]
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-emerald-600
                    px-4
                    py-3
                    text-sm
                    font-black
                    text-white
                    shadow-sm
                    transition
                    hover:bg-emerald-700
                    active:scale-[0.99]
                  "
                >
                  <CheckCircle size={17} />
                  OK
                </button>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL CONFIRMATION SUPPRESSION
      ====================================================== */}

      {deleteTarget && (
        <div
          className="
            fixed
            inset-0
            z-[110]
            flex
            items-center
            justify-center
            bg-slate-950/45
            p-4
            backdrop-blur-sm
          "
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-expense-title"
        >
          <div
            className="
              w-full
              max-w-md
              overflow-hidden
              rounded-[28px]
              border
              border-slate-200
              bg-white
              shadow-2xl
            "
          >
            <div className="p-5 sm:p-6">

              <div className="flex items-start gap-3">

                <div
                  className="
                    flex
                    h-12
                    w-12
                    shrink-0
                    items-center
                    justify-center
                    rounded-2xl
                    bg-red-50
                    text-red-600
                  "
                >
                  <Trash2 size={22} />
                </div>

                <div className="min-w-0 flex-1">

                  <h2
                    id="delete-expense-title"
                    className="
                      text-lg
                      font-black
                      text-slate-900
                    "
                  >
                    Supprimer cette dépense ?
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Voulez-vous vraiment supprimer
                    cette dépense ? Cette action est
                    irréversible.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget(null)
                  }
                  disabled={deleting}
                  className="
                    rounded-xl
                    p-2
                    text-slate-400
                    transition
                    hover:bg-slate-100
                    hover:text-slate-700
                    disabled:opacity-50
                  "
                  aria-label="Fermer"
                >
                  <X size={18} />
                </button>

              </div>

              <div
                className="
                  mt-5
                  rounded-2xl
                  border
                  border-slate-200
                  bg-slate-50
                  p-4
                "
              >
                <div className="flex items-center gap-3">

                  <div
                    className="
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-white
                      text-indigo-600
                      shadow-sm
                    "
                  >
                    <Wallet size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="break-words text-sm font-black text-slate-900">
                      {deleteTarget.title}
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {formatMoney(
                        deleteTarget.amount
                      )}{" "}
                      {deleteTarget.currency}
                    </p>

                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {new Date(
                        deleteTarget.created_at
                      ).toLocaleString(
                        "fr-FR",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>

                </div>
              </div>

              <div
                className="
                  mt-5
                  grid
                  grid-cols-2
                  gap-2
                "
              >
                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget(null)
                  }
                  disabled={deleting}
                  className="
                    min-h-[46px]
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    px-3
                    text-xs
                    font-black
                    text-slate-700
                    transition
                    hover:bg-slate-100
                    disabled:opacity-50
                  "
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={
                    deleteExpense
                  }
                  disabled={
                    deleting
                  }
                  className="
                    flex
                    min-h-[46px]
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-red-600
                    px-3
                    text-xs
                    font-black
                    text-white
                    transition
                    hover:bg-red-700
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {deleting ? (
                    <>
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <Trash2 size={15} />
                      Supprimer
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </main>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="
        w-full
        min-w-0
        overflow-hidden
        rounded-[26px]
        border
        border-slate-100
        bg-white
        p-4
        shadow-sm
        transition
        hover:shadow-md
        sm:p-6
      "
    >
      <div
        className="
          flex
          min-w-0
          items-start
          justify-between
          gap-2
          sm:gap-4
        "
      >
        <div className="min-w-0">
          <p
            className="
              break-words
              text-xs
              font-bold
              text-slate-500
              sm:text-sm
            "
          >
            {title}
          </p>

          <p
            className="
              mt-1
              break-words
              text-[10px]
              text-slate-400
              sm:text-xs
            "
          >
            {description}
          </p>
        </div>

        <div
          className="
            flex
            shrink-0
            items-center
            justify-center
            rounded-2xl
            bg-indigo-50
            p-2
            sm:p-3
          "
        >
          {icon}
        </div>
      </div>

      <p
        className="
          mt-4
          break-words
          text-xl
          font-black
          tracking-tight
          text-slate-900
          sm:mt-5
          sm:text-3xl
        "
      >
        {value}
      </p>
    </div>
  );
}

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({
  showDescription = false,
}: {
  showDescription?: boolean;
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-slate-100
        bg-slate-50
        p-8
        text-center
      "
    >
      <div
        className="
          mx-auto
          mb-3
          flex
          w-fit
          items-center
          justify-center
          rounded-2xl
          bg-white
          p-3
          shadow-sm
        "
      >
        <History
          size={32}
          className="text-slate-400"
        />
      </div>

      <p className="font-bold text-slate-700">
        Aucune dépense trouvée.
      </p>

      {showDescription && (
        <p className="mt-1 text-xs text-slate-400">
          Les dépenses enregistrées
          apparaîtront ici.
        </p>
      )}
    </div>
  );
}

/* ============================================================
   LISTE DES DÉPENSES
============================================================ */

function ExpenseList({
  title,
  data,
  onDelete,
}: {
  title: string;
  data: Expense[];
  onDelete: (
    expense: Expense
  ) => void;
}) {
  const [
    showAll,
    setShowAll,
  ] = useState(false);

  const visibleExpenses =
    showAll
      ? data
      : data.slice(0, 5);

  return (
    <div
      className="
        w-full
        min-w-0
        overflow-hidden
        rounded-[26px]
        border
        border-slate-100
        bg-white
        p-4
        shadow-sm
        sm:p-6
      "
    >
      <div
        className="
          mb-5
          flex
          min-w-0
          items-center
          justify-between
          gap-2
        "
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div
            className="
              flex
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-indigo-50
              p-2
            "
          >
            <CalendarDays
              size={19}
              className="text-indigo-600"
            />
          </div>

          <h2
            className="
              break-words
              text-base
              font-black
              text-slate-900
              sm:text-xl
            "
          >
            {title}
          </h2>
        </div>

        <span
          className="
            shrink-0
            rounded-xl
            bg-indigo-50
            px-2.5
            py-1.5
            text-xs
            font-black
            text-indigo-600
            sm:px-3
          "
        >
          {data.length}
        </span>
      </div>

      {data.length ===
      0 ? (
        <div
          className="
            rounded-2xl
            border
            border-slate-100
            bg-slate-50
            p-5
            text-center
            sm:p-6
          "
        >
          <div
            className="
              mx-auto
              mb-3
              flex
              w-fit
              items-center
              justify-center
              rounded-2xl
              bg-white
              p-3
              shadow-sm
            "
          >
            <Wallet
              size={30}
              className="text-slate-400"
            />
          </div>

          <p
            className="
              text-xs
              font-bold
              text-slate-600
              sm:text-sm
            "
          >
            Aucune dépense.
          </p>
        </div>
      ) : (
        <>
          <div className="min-w-0">
            {visibleExpenses.map(
              (expense) => (
                <ExpenseRow
                  key={
                    expense.local_id
                  }
                  expense={
                    expense
                  }
                  onDelete={
                    onDelete
                  }
                  compact
                />
              )
            )}
          </div>

          {data.length >
            5 && (
            <button
              type="button"
              onClick={() =>
                setShowAll(
                  !showAll
                )
              }
              className="
                mt-4
                w-full
                rounded-xl
                border
                border-indigo-100
                bg-indigo-50
                py-3
                text-xs
                font-black
                text-indigo-600
                transition
                hover:bg-indigo-100
                sm:text-sm
              "
            >
              {showAll
                ? "Afficher moins"
                : `Voir toutes les ${data.length} dépenses`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ============================================================
   LIGNE DÉPENSE
============================================================ */

function ExpenseRow({
  expense,
  onDelete,
  compact = false,
}: {
  expense: Expense;
  onDelete: (
    expense: Expense
  ) => void;
  compact?: boolean;
}) {
  const formattedAmount =
    formatMoney(
      expense.amount
    );

  return (
    <div
      className={`
        flex
        min-w-0
        max-w-full
        items-center
        justify-between
        gap-2
        overflow-hidden
        border-b
        border-slate-100
        ${
          compact
            ? "py-3"
            : "py-4"
        }
        last:border-0
      `}
    >
      <div className="min-w-0 flex-1">

        <div className="flex min-w-0 items-center gap-2">

          <p
            className="
              break-words
              text-sm
              font-bold
              text-slate-900
              sm:text-base
            "
          >
            {expense.title}
          </p>

          {!expense.synced && (
            <span
              className="
                shrink-0
                rounded-full
                bg-amber-50
                px-2
                py-0.5
                text-[8px]
                font-black
                text-amber-700
              "
            >
              En attente
            </span>
          )}

        </div>

        <p
          className="
            mt-1
            break-words
            text-[10px]
            text-slate-500
            sm:text-xs
          "
        >
          {new Date(
            expense.created_at
          ).toLocaleString(
            "fr-FR",
            {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }
          )}
        </p>

      </div>

      <div
        className="
          flex
          min-w-0
          shrink-0
          items-center
          gap-1.5
          sm:gap-3
        "
      >

        <p
          className="
            max-w-[90px]
            break-words
            text-right
            text-xs
            font-black
            text-slate-900
            sm:max-w-none
            sm:text-base
          "
        >
          {formattedAmount}{" "}
          {expense.currency}
        </p>

        <button
          type="button"
          onClick={() =>
            onDelete(
              expense
            )
          }
          className="
            flex
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-red-50
            p-2
            text-red-600
            transition
            hover:bg-red-100
            active:scale-95
            sm:p-2.5
          "
          title="Supprimer cette dépense"
          aria-label="Supprimer cette dépense"
        >
          <Trash2
            size={17}
            className="text-red-600"
          />
        </button>

      </div>
    </div>
  );
}