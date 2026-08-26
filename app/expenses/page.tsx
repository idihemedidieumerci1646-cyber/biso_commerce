"use client";

import { useEffect, useState } from "react";
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
  X,
  AlertCircle,
  WifiOff,
  CheckCircle2,
} from "lucide-react";

type Expense = {
  id: number;
  title: string;
  amount: number;
  currency: string;
  created_at: string;
};

// ======================================================
// PAGE DÉPENSES
// ======================================================

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("FC");

  const [totalFc, setTotalFc] = useState(0);
  const [totalUsd, setTotalUsd] = useState(0);

  const [showAll, setShowAll] = useState(false);
  const [searchDate, setSearchDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // ======================================================
  // NOTIFICATION
  // ======================================================

  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // ======================================================
  // POPUP SUPPRESSION
  // ======================================================

  const [deletePopup, setDeletePopup] = useState(false);
  const [expenseToDelete, setExpenseToDelete] =
    useState<number | null>(null);

  // ======================================================
  // CONNEXION
  // ======================================================

  const [isOnline, setIsOnline] = useState(true);

  // ======================================================
  // DATE LOCALE
  // ======================================================

  const getDate = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;

    return new Date(date.getTime() - offset)
      .toISOString()
      .split("T")[0];
  };

  const todayStr = getDate(new Date());

  const yesterdayStr = getDate(
    new Date(Date.now() - 86400000)
  );

  // ======================================================
  // SURVEILLANCE CONNEXION
  // ======================================================

  useEffect(() => {
    const updateConnection = () => {
      setIsOnline(navigator.onLine);
    };

    updateConnection();

    window.addEventListener(
      "online",
      updateConnection
    );

    window.addEventListener(
      "offline",
      updateConnection
    );

    return () => {
      window.removeEventListener(
        "online",
        updateConnection
      );

      window.removeEventListener(
        "offline",
        updateConnection
      );
    };
  }, []);

  // ======================================================
  // CHARGEMENT INITIAL
  // ======================================================

  useEffect(() => {
    loadExpenses();
  }, []);

  // ======================================================
  // MESSAGE AUTOMATIQUE HORS CONNEXION
  // ======================================================

  useEffect(() => {
    if (!isOnline) {
      setNotice({
        type: "info",
        message:
          "Vous êtes hors connexion. Les données déjà chargées restent visibles.",
      });
    } else {
      setNotice((current) => {
        if (
          current?.message ===
          "Vous êtes hors connexion. Les données déjà chargées restent visibles."
        ) {
          return null;
        }

        return current;
      });
    }
  }, [isOnline]);

  // ======================================================
  // UTILISATEUR
  // ======================================================

  const getUser = async () => {
    const phone =
      typeof window !== "undefined"
        ? localStorage.getItem("phone")
        : null;

    if (!phone) {
      return null;
    }

    const { data: user, error } =
      await supabase
        .from("users")
        .select("id")
        .eq("phone", phone)
        .single();

    if (error || !user) {
      console.log(
        "Erreur utilisateur :",
        error
      );

      return null;
    }

    return user;
  };

  // ======================================================
  // FORMAT ARGENT
  // ======================================================

  const formatMoney = (value: number) => {
    const number = Math.round(
      Number(value || 0)
    );

    return number
      .toString()
      .replace(
        /\B(?=(\d{3})+(?!\d))/g,
        " "
      );
  };

  // ======================================================
  // CHARGER LES DÉPENSES
  // ======================================================

  const loadExpenses = async () => {
    setLoadingExpenses(true);

    try {
      const user = await getUser();

      if (!user) {
        setLoadingExpenses(false);
        return;
      }

      const { data, error } =
        await supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        console.log(
          "Erreur chargement dépenses :",
          error
        );

        if (!navigator.onLine) {
          setNotice({
            type: "info",
            message:
              "Connexion Internet nécessaire pour actualiser les dépenses.",
          });
        } else {
          setNotice({
            type: "error",
            message:
              "Impossible de charger les dépenses.",
          });
        }

        setLoadingExpenses(false);
        return;
      }

      const list =
        (data || []) as Expense[];

      setExpenses(list);

      let fc = 0;
      let usd = 0;

      list.forEach((expense) => {
        const expenseDate =
          expense.created_at.split("T")[0];

        if (expenseDate === todayStr) {
          if (
            String(
              expense.currency
            ).toUpperCase() === "FC"
          ) {
            fc += Number(
              expense.amount || 0
            );
          } else if (
            expense.currency === "$" ||
            String(
              expense.currency
            ).toUpperCase() === "USD"
          ) {
            usd += Number(
              expense.amount || 0
            );
          }
        }
      });

      setTotalFc(fc);
      setTotalUsd(usd);

      setNotice(null);
    } catch (error) {
      console.log(error);

      if (!navigator.onLine) {
        setNotice({
          type: "info",
          message:
            "Connexion Internet nécessaire pour actualiser les données.",
        });
      }
    } finally {
      setLoadingExpenses(false);
    }
  };

  // ======================================================
  // AJOUTER DÉPENSE
  // ======================================================

  const addExpense = async () => {
    if (!navigator.onLine) {
      setNotice({
        type: "info",
        message:
          "Une connexion Internet est nécessaire pour ajouter une dépense.",
      });

      return;
    }

    if (!title.trim() || !amount) {
      setNotice({
        type: "info",
        message:
          "Remplissez tous les champs.",
      });

      return;
    }

    const numericAmount =
      Number(amount);

    if (!Number.isFinite(numericAmount)) {
      setNotice({
        type: "error",
        message:
          "Montant invalide.",
      });

      return;
    }

    if (numericAmount <= 0) {
      setNotice({
        type: "error",
        message:
          "Le montant doit être supérieur à zéro.",
      });

      return;
    }

    const user = await getUser();

    if (!user) {
      setNotice({
        type: "error",
        message:
          "Utilisateur non connecté.",
      });

      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase
          .from("expenses")
          .insert([
            {
              title: title.trim(),
              amount: numericAmount,
              currency: currency,
              user_id: user.id,
              created_at:
                new Date().toISOString(),
            },
          ]);

      if (error) {
        console.log(error);

        setNotice({
          type: "error",
          message: error.message,
        });

        return;
      }

      setTitle("");
      setAmount("");

      await loadExpenses();

      setNotice({
        type: "success",
        message:
          "Dépense ajoutée avec succès.",
      });
    } catch (error) {
      console.log(error);

      setNotice({
        type: "error",
        message:
          "Une erreur est survenue lors de l'ajout.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // OUVRIR POPUP SUPPRESSION
  // ======================================================

  const requestDeleteExpense = (
    id: number
  ) => {
    setExpenseToDelete(id);
    setDeletePopup(true);
  };

  // ======================================================
  // SUPPRIMER DÉPENSE
  // ======================================================

  const deleteExpense = async () => {
    if (expenseToDelete === null) {
      return;
    }

    if (!navigator.onLine) {
      setDeletePopup(false);

      setNotice({
        type: "info",
        message:
          "Une connexion Internet est nécessaire pour supprimer une dépense.",
      });

      return;
    }

    const user = await getUser();

    if (!user) {
      setDeletePopup(false);

      setNotice({
        type: "error",
        message:
          "Utilisateur non connecté.",
      });

      return;
    }

    const id = expenseToDelete;

    setDeletePopup(false);

    try {
      const { error } =
        await supabase
          .from("expenses")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);

      if (error) {
        console.log(error);

        setNotice({
          type: "error",
          message:
            "Impossible de supprimer cette dépense.",
        });

        return;
      }

      setExpenses((current) =>
        current.filter(
          (expense) =>
            expense.id !== id
        )
      );

      setExpenseToDelete(null);

      await loadExpenses();

      setNotice({
        type: "success",
        message:
          "Dépense supprimée avec succès.",
      });
    } catch (error) {
      console.log(error);

      setNotice({
        type: "error",
        message:
          "Une erreur est survenue lors de la suppression.",
      });
    }
  };

  // ======================================================
  // DÉPENSES AUJOURD'HUI
  // ======================================================

  const todayExpenses =
    expenses.filter(
      (expense) =>
        expense.created_at.split(
          "T"
        )[0] === todayStr
    );

  // ======================================================
  // DÉPENSES HIER
  // ======================================================

  const yesterdayExpenses =
    expenses.filter(
      (expense) =>
        expense.created_at.split(
          "T"
        )[0] === yesterdayStr
    );

  // ======================================================
  // RECHERCHE PAR DATE
  // ======================================================

  const searchedExpenses =
    searchDate
      ? expenses.filter(
          (expense) =>
            expense.created_at.split(
              "T"
            )[0] === searchDate
        )
      : expenses;

  // ======================================================
  // DÉPENSES À AFFICHER
  // ======================================================

  const displayedExpenses =
    searchDate
      ? searchedExpenses
      : expenses;

  // ======================================================
  // AFFICHAGE
  // ======================================================

  return (
    <>
      <main
        className="
          mx-auto
          w-full
          min-w-0
          max-w-7xl
          overflow-x-hidden
          px-3
          py-4
          sm:px-5
          sm:py-6
          lg:px-6
        "
      >
        <div
          className="
            w-full
            min-w-0
            space-y-5
            sm:space-y-6
          "
        >

          {/* ======================================================
              HEADER
          ====================================================== */}

          <section
            className="
              w-full
              min-w-0
              overflow-hidden
              rounded-3xl
              border
              border-white/10
              bg-white/[0.04]
              p-4
              shadow-xl
              backdrop-blur-xl
              sm:p-6
            "
          >
            <div
              className="
                flex
                min-w-0
                flex-col
                gap-4
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >

              <div
                className="
                  flex
                  min-w-0
                  items-center
                  gap-3
                  sm:gap-4
                "
              >
                <div
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-2xl
                    bg-orange-500/10
                    text-orange-400
                    sm:h-14
                    sm:w-14
                  "
                >
                  <Wallet
                    size={24}
                    className="sm:hidden"
                  />

                  <Wallet
                    size={30}
                    className="hidden sm:block"
                  />
                </div>

                <div className="min-w-0">
                  <h1
                    className="
                      break-words
                      text-xl
                      font-black
                      leading-tight
                      text-white
                      sm:text-3xl
                    "
                  >
                    Gestion des dépenses
                  </h1>

                  <p
                    className="
                      mt-1
                      break-words
                      text-xs
                      leading-5
                      text-slate-400
                      sm:text-sm
                      sm:leading-6
                    "
                  >
                    Suivi des sorties d'argent
                    du commerce
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={loadExpenses}
                disabled={
                  loadingExpenses
                }
                className="
                  inline-flex
                  min-h-[48px]
                  w-full
                  shrink-0
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-white/10
                  bg-black/30
                  px-4
                  py-3
                  text-sm
                  font-black
                  text-slate-300
                  transition
                  hover:bg-white/5
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  sm:w-auto
                "
              >
                <RefreshCw
                  size={17}
                  className={
                    loadingExpenses
                      ? "animate-spin"
                      : ""
                  }
                />

                Actualiser
              </button>
            </div>
          </section>

          {/* ======================================================
              ÉTAT CONNEXION
          ====================================================== */}

          {!isOnline && (
            <div
              className="
                flex
                w-full
                min-w-0
                items-start
                gap-3
                overflow-hidden
                rounded-2xl
                border
                border-orange-400/20
                bg-orange-500/10
                p-4
              "
            >
              <WifiOff
                size={19}
                className="
                  mt-0.5
                  shrink-0
                  text-orange-400
                "
              />

              <div className="min-w-0">
                <p
                  className="
                    break-words
                    text-sm
                    font-black
                    text-orange-300
                  "
                >
                  Mode hors connexion
                </p>

                <p
                  className="
                    mt-1
                    break-words
                    text-xs
                    leading-5
                    text-slate-400
                  "
                >
                  Les données déjà chargées
                  restent visibles. Certaines
                  actions nécessitent Internet.
                </p>
              </div>
            </div>
          )}

          {/* ======================================================
              NOTIFICATION
          ====================================================== */}

          {notice && (
            <div
              className={`
                flex
                w-full
                min-w-0
                items-start
                gap-3
                overflow-hidden
                rounded-2xl
                border
                p-4
                ${
                  notice.type ===
                  "success"
                    ? "border-green-400/20 bg-green-500/10"
                    : notice.type ===
                      "error"
                    ? "border-red-400/20 bg-red-500/10"
                    : "border-orange-400/20 bg-orange-500/10"
                }
              `}
              role="status"
            >
              {notice.type ===
              "success" ? (
                <CheckCircle2
                  size={19}
                  className="
                    mt-0.5
                    shrink-0
                    text-green-400
                  "
                />
              ) : (
                <AlertCircle
                  size={19}
                  className={`
                    mt-0.5
                    shrink-0
                    ${
                      notice.type ===
                      "error"
                        ? "text-red-400"
                        : "text-orange-400"
                    }
                  `}
                />
              )}

              <p
                className={`
                  min-w-0
                  flex-1
                  break-words
                  text-sm
                  font-bold
                  ${
                    notice.type ===
                    "success"
                      ? "text-green-300"
                      : notice.type ===
                        "error"
                      ? "text-red-300"
                      : "text-orange-300"
                  }
                `}
              >
                {notice.message}
              </p>

              <button
                type="button"
                onClick={() =>
                  setNotice(null)
                }
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  text-slate-400
                  transition
                  hover:bg-white/5
                  hover:text-white
                "
                aria-label="Fermer"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* ======================================================
              TOTAUX
          ====================================================== */}

          <section
            className="
              grid
              w-full
              min-w-0
              grid-cols-1
              gap-4
              sm:grid-cols-2
              sm:gap-5
            "
          >
            <MoneyCard
              title="Dépenses du jour FC"
              value={
                formatMoney(totalFc) +
                " FC"
              }
              icon={
                <Banknote
                  size={23}
                  className="text-orange-400"
                />
              }
            />

            <MoneyCard
              title="Dépenses du jour USD"
              value={
                formatMoney(totalUsd) +
                " $"
              }
              icon={
                <Banknote
                  size={23}
                  className="text-orange-400"
                />
              }
            />
          </section>

          {/* ======================================================
              AJOUT DEPENSE
          ====================================================== */}

          <section
            className="
              w-full
              min-w-0
              overflow-hidden
              rounded-3xl
              border
              border-white/10
              bg-white/[0.04]
              p-4
              shadow-xl
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
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-orange-500/10
                  text-orange-400
                "
              >
                <PlusCircle size={20} />
              </div>

              <div className="min-w-0">
                <h2
                  className="
                    break-words
                    text-lg
                    font-black
                    text-white
                    sm:text-xl
                  "
                >
                  Nouvelle dépense
                </h2>

                <p
                  className="
                    mt-1
                    break-words
                    text-xs
                    text-slate-500
                  "
                >
                  Ajoutez une sortie d'argent
                  à votre commerce.
                </p>
              </div>
            </div>

            <div
              className="
                grid
                min-w-0
                grid-cols-1
                gap-4
                lg:grid-cols-3
              "
            >

              {/* NOM */}

              <div className="min-w-0">
                <label
                  className="
                    mb-2
                    block
                    text-xs
                    font-bold
                    text-slate-400
                  "
                >
                  Nom de la dépense
                </label>

                <input
                  type="text"
                  placeholder="Ex : Transport, loyer..."
                  value={title}
                  onChange={(e) =>
                    setTitle(
                      e.target.value
                    )
                  }
                  className="
                    block
                    min-h-[50px]
                    w-full
                    min-w-0
                    rounded-xl
                    border
                    border-white/10
                    bg-[#111827]
                    px-4
                    py-3
                    text-[16px]
                    text-white
                    outline-none
                    transition
                    placeholder:text-slate-600
                    focus:border-orange-400
                    focus:ring-1
                    focus:ring-orange-400
                  "
                />
              </div>

              {/* MONTANT */}

              <div className="min-w-0">
                <label
                  className="
                    mb-2
                    block
                    text-xs
                    font-bold
                    text-slate-400
                  "
                >
                  Montant
                </label>

                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="Ex : 5000"
                  value={amount}
                  onChange={(e) =>
                    setAmount(
                      e.target.value
                    )
                  }
                  className="
                    block
                    min-h-[50px]
                    w-full
                    min-w-0
                    rounded-xl
                    border
                    border-white/10
                    bg-[#111827]
                    px-4
                    py-3
                    text-[16px]
                    text-white
                    outline-none
                    transition
                    placeholder:text-slate-600
                    focus:border-orange-400
                    focus:ring-1
                    focus:ring-orange-400
                  "
                />
              </div>

              {/* MONNAIE */}

              <div className="min-w-0">
                <label
                  className="
                    mb-2
                    block
                    text-xs
                    font-bold
                    text-slate-400
                  "
                >
                  Devise
                </label>

                <select
                  value={currency}
                  onChange={(e) =>
                    setCurrency(
                      e.target.value
                    )
                  }
                  className="
                    block
                    min-h-[50px]
                    w-full
                    min-w-0
                    rounded-xl
                    border
                    border-white/10
                    bg-[#111827]
                    px-4
                    py-3
                    text-[16px]
                    text-white
                    outline-none
                    focus:border-orange-400
                    focus:ring-1
                    focus:ring-orange-400
                  "
                >
                  <option
                    value="FC"
                    className="bg-[#111827]"
                  >
                    🇨🇩 Franc Congolais
                    (FC)
                  </option>

                  <option
                    value="$"
                    className="bg-[#111827]"
                  >
                    🇺🇸 Dollar ($)
                  </option>
                </select>
              </div>
            </div>

            {/* RESUME */}

            {amount &&
              Number(amount) > 0 && (
                <div
                  className="
                    mt-4
                    w-full
                    min-w-0
                    overflow-hidden
                    rounded-2xl
                    border
                    border-orange-400/20
                    bg-orange-500/10
                    p-4
                  "
                >
                  <p
                    className="
                      text-xs
                      font-bold
                      text-slate-400
                    "
                  >
                    Montant
                  </p>

                  <p
                    className="
                      mt-1
                      break-words
                      text-2xl
                      font-black
                      text-orange-400
                      sm:text-3xl
                    "
                  >
                    {formatMoney(
                      Number(amount)
                    )}{" "}
                    {currency}
                  </p>
                </div>
              )}

            {/* BOUTON */}

            <button
              type="button"
              onClick={addExpense}
              disabled={loading}
              className="
                mt-4
                flex
                min-h-[52px]
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-gradient-to-r
                from-orange-500
                to-yellow-400
                px-4
                py-4
                text-sm
                font-black
                text-black
                shadow-lg
                shadow-orange-500/10
                transition
                hover:brightness-110
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {loading ? (
                <>
                  <RefreshCw
                    size={19}
                    className="animate-spin"
                  />
                  Enregistrement...
                </>
              ) : (
                <>
                  <PlusCircle size={19} />
                  Ajouter la dépense
                </>
              )}
            </button>
          </section>

          {/* ======================================================
              CONTROLES HISTORIQUE
          ====================================================== */}

          <section
            className="
              w-full
              min-w-0
              overflow-hidden
              rounded-3xl
              border
              border-white/10
              bg-white/[0.04]
              p-4
              shadow-xl
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
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-orange-500/10
                  text-orange-400
                "
              >
                <History size={19} />
              </div>

              <div className="min-w-0">
                <h2
                  className="
                    break-words
                    text-lg
                    font-black
                    text-white
                    sm:text-xl
                  "
                >
                  Historique
                </h2>

                <p
                  className="
                    mt-1
                    break-words
                    text-xs
                    text-slate-500
                  "
                >
                  Consultez les dépenses
                  enregistrées.
                </p>
              </div>
            </div>

            <div
              className="
                grid
                min-w-0
                grid-cols-1
                gap-3
                lg:grid-cols-[minmax(0,1fr)_auto_auto]
                lg:items-center
              "
            >
              {/* DATE */}

              <div
                className="
                  relative
                  min-w-0
                "
              >
                <CalendarDays
                  size={18}
                  className="
                    pointer-events-none
                    absolute
                    left-3
                    top-1/2
                    z-10
                    -translate-y-1/2
                    text-orange-400
                  "
                />

                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) =>
                    setSearchDate(
                      e.target.value
                    )
                  }
                  className="
                    block
                    min-h-[50px]
                    w-full
                    min-w-0
                    rounded-xl
                    border
                    border-white/10
                    bg-[#111827]
                    px-3
                    py-3
                    pl-10
                    text-[16px]
                    text-white
                    outline-none
                    focus:border-orange-400
                    focus:ring-1
                    focus:ring-orange-400
                    [color-scheme:dark]
                  "
                />
              </div>

              {/* EFFACER */}

              {searchDate && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchDate("")
                  }
                  className="
                    flex
                    min-h-[50px]
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-white/10
                    bg-black/30
                    px-5
                    py-3
                    text-sm
                    font-bold
                    text-slate-300
                    transition
                    hover:bg-white/5
                    hover:text-white
                    lg:w-auto
                  "
                >
                  <X size={17} />
                  Effacer
                </button>
              )}

              {/* TOUTES */}

              <button
                type="button"
                onClick={() =>
                  setShowAll(!showAll)
                }
                className="
                  flex
                  min-h-[50px]
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-orange-500
                  px-5
                  py-3
                  text-sm
                  font-black
                  text-black
                  transition
                  hover:bg-orange-400
                  active:scale-[0.99]
                  lg:w-auto
                "
              >
                <Search size={17} />

                {showAll
                  ? "Cacher historique"
                  : "Voir toutes les dépenses"}
              </button>
            </div>
          </section>

          {/* ======================================================
              AUJOURD'HUI / HIER
          ====================================================== */}

         
                

               

          {/* ======================================================
              DATE RECHERCHEE
          ====================================================== */}

          {searchDate &&
            !showAll && (
              <section
                className="
                  w-full
                  min-w-0
                  overflow-hidden
                  rounded-3xl
                  border
                  border-white/10
                  bg-white/[0.04]
                  p-4
                  shadow-xl
                  sm:p-6
                "
              >
                <div
                  className="
                    mb-5
                    flex
                    min-w-0
                    items-start
                    justify-between
                    gap-3
                  "
                >
                  <div
                    className="
                      flex
                      min-w-0
                      items-start
                      gap-3
                    "
                  >
                    <div
                      className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-orange-500/10
                        text-orange-400
                      "
                    >
                      <CalendarDays
                        size={19}
                      />
                    </div>

                    <div className="min-w-0">
                      <h2
                        className="
                          break-words
                          text-lg
                          font-black
                          text-white
                          sm:text-xl
                        "
                      >
                        Dépenses du{" "}
                        {searchDate}
                      </h2>

                      <p
                        className="
                          mt-1
                          break-words
                          text-xs
                          leading-5
                          text-slate-500
                        "
                      >
                        Dépenses enregistrées
                        à cette date
                      </p>
                    </div>
                  </div>

                  <span
                    className="
                      shrink-0
                      rounded-xl
                      bg-orange-500/10
                      px-3
                      py-2
                      text-xs
                      font-black
                      text-orange-400
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
                            expense.id
                          }
                          expense={
                            expense
                          }
                          onDelete={
                            requestDeleteExpense
                          }
                        />
                      )
                    )}
                  </div>
                )}
              </section>
            )}

          {/* ======================================================
              HISTORIQUE COMPLET
          ====================================================== */}

          {showAll && (
            <section
              className="
                w-full
                min-w-0
                overflow-hidden
                rounded-3xl
                border
                border-white/10
                bg-white/[0.04]
                p-4
                shadow-xl
                sm:p-6
              "
            >
              <div
                className="
                  mb-5
                  flex
                  min-w-0
                  items-start
                  justify-between
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    min-w-0
                    items-start
                    gap-3
                  "
                >
                  <div
                    className="
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-orange-500/10
                      text-orange-400
                    "
                  >
                    <History size={20} />
                  </div>

                  <div className="min-w-0">
                    <h2
                      className="
                        break-words
                        text-lg
                        font-black
                        text-white
                        sm:text-xl
                      "
                    >
                      Historique complet
                    </h2>

                    <p
                      className="
                        mt-1
                        break-words
                        text-xs
                        leading-5
                        text-slate-500
                      "
                    >
                      Toutes les dépenses
                      enregistrées
                    </p>
                  </div>
                </div>

                <div
                  className="
                    shrink-0
                    rounded-xl
                    bg-orange-500/10
                    px-3
                    py-2
                    text-xs
                    font-bold
                    text-orange-400
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
                <EmptyState />
              ) : (
                <div className="min-w-0">
                  {displayedExpenses.map(
                    (expense) => (
                      <ExpenseRow
                        key={expense.id}
                        expense={expense}
                        onDelete={
                          requestDeleteExpense
                        }
                      />
                    )
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* ======================================================
          POPUP SUPPRESSION
      ====================================================== */}

      {deletePopup && (
        <div
          className="
            fixed
            inset-0
            z-[10000]
            flex
            items-center
            justify-center
            bg-black/70
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
              rounded-3xl
              border
              border-white/10
              bg-[#0f172a]
              p-5
              shadow-2xl
              sm:p-6
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
                gap-4
              "
            >
              <div
                className="
                  flex
                  h-12
                  w-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-red-500/10
                  text-red-400
                "
              >
                <Trash2 size={23} />
              </div>

              <button
                type="button"
                onClick={() =>
                  setDeletePopup(false)
                }
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  text-slate-500
                  transition
                  hover:bg-white/5
                  hover:text-white
                "
                aria-label="Fermer"
              >
                <X size={19} />
              </button>
            </div>

            <h3
              id="delete-expense-title"
              className="
                mt-5
                text-xl
                font-black
                text-white
              "
            >
              Supprimer cette dépense ?
            </h3>

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-slate-400
              "
            >
              Cette action supprimera la
              dépense de votre historique.
              Vérifiez votre connexion
              Internet avant de continuer.
            </p>

            {!isOnline && (
              <div
                className="
                  mt-4
                  flex
                  items-start
                  gap-3
                  rounded-2xl
                  border
                  border-orange-400/20
                  bg-orange-500/10
                  p-4
                "
              >
                <WifiOff
                  size={18}
                  className="
                    mt-0.5
                    shrink-0
                    text-orange-400
                  "
                />

                <p
                  className="
                    text-xs
                    font-bold
                    leading-5
                    text-orange-300
                  "
                >
                  Connexion Internet requise
                  pour supprimer une dépense.
                </p>
              </div>
            )}

            <div
              className="
                mt-6
                grid
                grid-cols-1
                gap-3
                sm:grid-cols-2
              "
            >
              <button
                type="button"
                onClick={() =>
                  setDeletePopup(false)
                }
                className="
                  min-h-[50px]
                  w-full
                  rounded-xl
                  border
                  border-white/10
                  bg-white/5
                  px-4
                  py-3
                  text-sm
                  font-black
                  text-slate-300
                  transition
                  hover:bg-white/10
                  hover:text-white
                "
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={deleteExpense}
                disabled={!isOnline}
                className="
                  min-h-[50px]
                  w-full
                  rounded-xl
                  bg-red-600
                  px-4
                  py-3
                  text-sm
                  font-black
                  text-white
                  transition
                  hover:bg-red-500
                  active:scale-[0.99]
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ======================================================
// ÉTAT VIDE
// ======================================================

function EmptyState() {
  return (
    <div
      className="
        rounded-2xl
        border
        border-white/10
        bg-black/20
        p-8
        text-center
        sm:p-10
      "
    >
      <div
        className="
          mx-auto
          flex
          h-14
          w-14
          items-center
          justify-center
          rounded-2xl
          bg-white/5
          text-slate-500
        "
      >
        <History size={28} />
      </div>

      <p
        className="
          mt-4
          break-words
          text-sm
          font-bold
          text-slate-300
        "
      >
        Aucune dépense trouvée.
      </p>

      <p
        className="
          mt-1
          break-words
          text-xs
          leading-5
          text-slate-500
        "
      >
        Les dépenses enregistrées
        apparaîtront ici.
      </p>
    </div>
  );
}

// ======================================================
// CARTE TOTAL
// ======================================================

function MoneyCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="
        w-full
        min-w-0
        overflow-hidden
        rounded-3xl
        border
        border-white/10
        bg-white/[0.04]
        p-4
        shadow-xl
        sm:p-5
      "
    >
      <div
        className="
          flex
          min-w-0
          items-start
          justify-between
          gap-3
        "
      >
        <div className="min-w-0">
          <p
            className="
              break-words
              text-sm
              font-black
              leading-5
              text-white
              sm:text-base
            "
          >
            {title}
          </p>

          <p
            className="
              mt-1
              break-words
              text-xs
              leading-5
              text-slate-500
            "
          >
            Total enregistré aujourd'hui
          </p>
        </div>

        <div
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-orange-500/10
            sm:h-11
            sm:w-11
          "
        >
          {icon}
        </div>
      </div>

      <p
        className="
          mt-5
          break-words
          text-2xl
          font-black
          leading-tight
          text-white
          sm:text-3xl
        "
      >
        {value}
      </p>
    </div>
  );
}

// ======================================================
// LISTE DES DÉPENSES
// ======================================================

function ExpenseList({
  title,
  data,
  onDelete,
}: {
  title: string;
  data: Expense[];
  onDelete: (id: number) => void;
}) {
  const [showAll, setShowAll] =
    useState(false);

  const visibleExpenses = showAll
    ? data
    : data.slice(0, 5);

  return (
    <section
      className="
        w-full
        min-w-0
        overflow-hidden
        rounded-3xl
        border
        border-white/10
        bg-white/[0.04]
        p-4
        shadow-xl
        sm:p-5
      "
    >
      <div
        className="
          mb-4
          flex
          min-w-0
          items-center
          justify-between
          gap-3
        "
      >
        <h2
          className="
            min-w-0
            break-words
            text-lg
            font-black
            text-orange-400
            sm:text-xl
          "
        >
          {title}
        </h2>

        <span
          className="
            shrink-0
            rounded-xl
            bg-orange-500/10
            px-3
            py-1.5
            text-xs
            font-black
            text-orange-400
          "
        >
          {data.length}
        </span>
      </div>

      {data.length === 0 ? (
        <div
          className="
            rounded-2xl
            border
            border-white/10
            bg-black/20
            p-7
            text-center
          "
        >
          <Wallet
            size={30}
            className="
              mx-auto
              mb-3
              text-slate-500
            "
          />

          <p
            className="
              text-sm
              font-bold
              text-slate-300
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
                  key={expense.id}
                  expense={expense}
                  onDelete={onDelete}
                  compact
                />
              )
            )}
          </div>

          {data.length > 5 && (
            <button
              type="button"
              onClick={() =>
                setShowAll(!showAll)
              }
              className="
                mt-4
                min-h-[48px]
                w-full
                rounded-xl
                border
                border-orange-400/20
                bg-orange-500/10
                px-4
                py-3
                text-sm
                font-black
                text-orange-400
                transition
                hover:bg-orange-500/20
                active:scale-[0.99]
              "
            >
              {showAll
                ? "Afficher moins"
                : `Voir toutes les ${data.length} dépenses`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

// ======================================================
// LIGNE DÉPENSE
// ======================================================

function ExpenseRow({
  expense,
  onDelete,
  compact = false,
}: {
  expense: Expense;
  onDelete: (id: number) => void;
  compact?: boolean;
}) {
  const formattedAmount =
    Math.round(
      Number(
        expense.amount || 0
      )
    )
      .toString()
      .replace(
        /\B(?=(\d{3})+(?!\d))/g,
        " "
      );

  return (
    <article
      className={`
        w-full
        min-w-0
        overflow-hidden
        border-b
        border-white/10
        last:border-0
        ${
          compact
            ? "py-3"
            : "py-4"
        }
      `}
    >
      <div
        className="
          flex
          min-w-0
          items-start
          gap-3
        "
      >
        {/* ICÔNE */}

        <div
          className="
            mt-0.5
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-orange-500/10
            text-orange-400
            sm:h-10
            sm:w-10
          "
        >
          <Wallet size={17} />
        </div>

        {/* INFORMATIONS */}

        <div className="min-w-0 flex-1">
          <p
            className="
              break-words
              text-sm
              font-black
              leading-5
              text-white
              sm:text-base
            "
          >
            {expense.title}
          </p>

          <p
            className="
              mt-1
              break-words
              text-[11px]
              leading-5
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

        {/* ACTIONS */}

        <div
          className="
            flex
            shrink-0
            items-center
            gap-2
          "
        >
          <p
            className="
              max-w-[110px]
              break-words
              text-right
              text-sm
              font-black
              leading-5
              text-orange-400
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
              onDelete(expense.id)
            }
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-red-400/20
              bg-red-500/10
              text-red-400
              transition
              hover:bg-red-500/20
              hover:text-red-300
              active:scale-95
              sm:h-10
              sm:w-10
            "
            title="Supprimer cette dépense"
            aria-label="Supprimer cette dépense"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}