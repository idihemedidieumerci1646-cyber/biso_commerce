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
  // CHARGEMENT INITIAL
  // ======================================================

  useEffect(() => {
    loadExpenses();
  }, []);

  // ======================================================
  // UTILISATEUR
  // ======================================================

  const getUser = async () => {
    const phone = localStorage.getItem("phone");

    if (!phone) {
      return null;
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();

    if (error || !user) {
      console.log("Erreur utilisateur :", error);
      return null;
    }

    return user;
  };

  // ======================================================
  // FORMAT ARGENT
  // ======================================================

  const formatMoney = (value: number) => {
    const number = Math.round(Number(value || 0));

    return number
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
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

      const { data, error } = await supabase
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

        alert(
          "Impossible de charger les dépenses."
        );

        setLoadingExpenses(false);
        return;
      }

      const list = (data || []) as Expense[];

      setExpenses(list);

      let fc = 0;
      let usd = 0;

      list.forEach((expense) => {
        const expenseDate =
          expense.created_at.split("T")[0];

        if (expenseDate === todayStr) {
          if (expense.currency === "FC") {
            fc += Number(expense.amount || 0);
          } else if (
            expense.currency === "$" ||
            expense.currency === "USD"
          ) {
            usd += Number(expense.amount || 0);
          }
        }
      });

      setTotalFc(fc);
      setTotalUsd(usd);
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingExpenses(false);
    }
  };

  // ======================================================
  // AJOUTER DÉPENSE
  // ======================================================

  const addExpense = async () => {
    if (!title.trim() || !amount) {
      alert("Remplissez tous les champs.");
      return;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount)) {
      alert("Montant invalide.");
      return;
    }

    if (numericAmount <= 0) {
      alert(
        "Le montant doit être supérieur à zéro."
      );
      return;
    }

    const user = await getUser();

    if (!user) {
      alert("Utilisateur non connecté.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("expenses")
        .insert([
          {
            title: title.trim(),
            amount: numericAmount,
            currency: currency,
            user_id: user.id,
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) {
        console.log(error);
        alert(error.message);
        return;
      }

      setTitle("");
      setAmount("");

      await loadExpenses();

      alert(
        "Dépense ajoutée avec succès ✅"
      );
    } catch (error) {
      console.log(error);

      alert(
        "Une erreur est survenue lors de l'ajout."
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // SUPPRIMER DÉPENSE
  // ======================================================

  const deleteExpense = async (id: number) => {
    const confirmDelete = confirm(
      "Voulez-vous vraiment supprimer cette dépense ?"
    );

    if (!confirmDelete) {
      return;
    }

    const user = await getUser();

    if (!user) {
      alert("Utilisateur non connecté.");
      return;
    }

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.log(error);

        alert(
          "Impossible de supprimer cette dépense."
        );

        return;
      }

      await loadExpenses();
    } catch (error) {
      console.log(error);

      alert(
        "Une erreur est survenue lors de la suppression."
      );
    }
  };

  // ======================================================
  // DÉPENSES AUJOURD'HUI
  // ======================================================

  const todayExpenses = expenses.filter(
    (expense) =>
      expense.created_at.split("T")[0] ===
      todayStr
  );

  // ======================================================
  // DÉPENSES HIER
  // ======================================================

  const yesterdayExpenses = expenses.filter(
    (expense) =>
      expense.created_at.split("T")[0] ===
      yesterdayStr
  );

  // ======================================================
  // RECHERCHE PAR DATE
  // ======================================================

  const searchedExpenses = searchDate
    ? expenses.filter(
        (expense) =>
          expense.created_at.split("T")[0] ===
          searchDate
      )
    : expenses;

  // ======================================================
  // DÉPENSES À AFFICHER
  // ======================================================

  const displayedExpenses = searchDate
    ? searchedExpenses
    : expenses;

  // ======================================================
  // AFFICHAGE
  // ======================================================

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#f5f7fb]">
      <div className="mx-auto w-full max-w-7xl space-y-5 overflow-x-hidden p-4 sm:p-6 lg:p-8">

        {/* ======================================================
            HEADER
        ====================================================== */}

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
        </div>

        {/* ======================================================
            STATISTIQUES
        ====================================================== */}

        <div
          className="
            grid
            w-full
            grid-cols-1
            gap-5
            sm:grid-cols-2
          "
        >

          <StatCard
            title="Dépenses du jour FC"
            value={formatMoney(totalFc) + " FC"}
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
            value={formatMoney(totalUsd) + " $"}
            description="Total enregistré aujourd'hui"
            icon={
              <Banknote
                size={23}
                className="text-indigo-600"
              />
            }
          />

        </div>

        {/* ======================================================
            AJOUT DÉPENSE
        ====================================================== */}

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

              <label
                className="
                  mb-2
                  block
                  text-xs
                  font-bold
                  text-slate-600
                "
              >
                Nom de la dépense
              </label>

              <input
                placeholder="Nom de la dépense"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
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

              <label
                className="
                  mb-2
                  block
                  text-xs
                  font-bold
                  text-slate-600
                "
              >
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
                  setAmount(e.target.value)
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

              <label
                className="
                  mb-2
                  block
                  text-xs
                  font-bold
                  text-slate-600
                "
              >
                Devise
              </label>

              <select
                value={currency}
                onChange={(e) =>
                  setCurrency(e.target.value)
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

            {/* RESUME */}

            {amount &&
              Number(amount) > 0 && (
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

                  <p
                    className="
                      text-xs
                      font-bold
                      text-slate-500
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
                      text-indigo-600
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
                  <RefreshCw
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

        {/* ======================================================
            CONTROLES HISTORIQUE
        ====================================================== */}

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

              <h2
                className="
                  break-words
                  font-black
                  text-slate-900
                "
              >
                Historique
              </h2>

              <p
                className="
                  break-words
                  text-xs
                  text-slate-500
                "
              >
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

            {/* DATE */}

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
                value={searchDate}
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

            {/* EFFACER DATE */}

            {searchDate && (
              <button
                type="button"
                onClick={() =>
                  setSearchDate("")
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
                  hover:text-slate-900
                "
              >
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

        {/* ======================================================
            AUJOURD'HUI / HIER
        ====================================================== */}

        {!showAll && !searchDate && (
          <div
            className="
              grid
              w-full
              grid-cols-1
              gap-5
              md:grid-cols-2
            "
          >

            <ExpenseList
              title="Aujourd'hui"
              data={todayExpenses}
              onDelete={deleteExpense}
            />

            <ExpenseList
              title="Hier"
              data={yesterdayExpenses}
              onDelete={deleteExpense}
            />

          </div>
        )}

        {/* ======================================================
            DATE RECHERCHEE
        ====================================================== */}

        {searchDate && !showAll && (
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

                  <h2
                    className="
                      break-words
                      font-black
                      text-slate-900
                    "
                  >
                    Dépenses du {searchDate}
                  </h2>

                  <p
                    className="
                      break-words
                      text-xs
                      text-slate-500
                    "
                  >
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
                {searchedExpenses.length}
              </span>

            </div>

            {searchedExpenses.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="min-w-0">
                {searchedExpenses.map(
                  (expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      onDelete={deleteExpense}
                    />
                  )
                )}
              </div>
            )}

          </div>
        )}

        {/* ======================================================
            HISTORIQUE COMPLET
        ====================================================== */}

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

                  <p
                    className="
                      break-words
                      text-xs
                      text-slate-500
                    "
                  >
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
                {displayedExpenses.length} dépense
                {displayedExpenses.length > 1
                  ? "s"
                  : ""}
              </div>

            </div>

            {displayedExpenses.length === 0 ? (
              <EmptyState showDescription />
            ) : (
              <div className="min-w-0">
                {displayedExpenses.map(
                  (expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      onDelete={deleteExpense}
                    />
                  )
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </main>
  );
}

// ======================================================
// STAT CARD
// ======================================================

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
        overflow-hidden
        rounded-[26px]
        border
        border-slate-100
        bg-white
        p-5
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
          gap-4
        "
      >

        <div className="min-w-0">

          <p
            className="
              break-words
              text-sm
              font-bold
              text-slate-500
            "
          >
            {title}
          </p>

          <p
            className="
              mt-1
              break-words
              text-xs
              text-slate-400
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
            p-3
          "
        >
          {icon}
        </div>

      </div>

      <p
        className="
          mt-5
          break-words
          text-3xl
          font-black
          tracking-tight
          text-slate-900
        "
      >
        {value}
      </p>

    </div>
  );
}

// ======================================================
// EMPTY STATE
// ======================================================

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

      <p
        className="
          font-bold
          text-slate-700
        "
      >
        Aucune dépense trouvée.
      </p>

      {showDescription && (
        <p
          className="
            mt-1
            text-xs
            text-slate-400
          "
        >
          Les dépenses enregistrées
          apparaîtront ici.
        </p>
      )}

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
  const [showAll, setShowAll] = useState(false);

  const visibleExpenses = showAll
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

        <div className="flex min-w-0 items-center gap-3">

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
              text-xl
              font-black
              text-slate-900
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
            px-3
            py-1.5
            text-xs
            font-black
            text-indigo-600
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
            border-slate-100
            bg-slate-50
            p-6
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
            <Wallet
              size={30}
              className="text-slate-400"
            />
          </div>

          <p
            className="
              text-sm
              font-bold
              text-slate-600
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
                w-full
                rounded-xl
                border
                border-indigo-100
                bg-indigo-50
                py-3
                text-sm
                font-black
                text-indigo-600
                transition
                hover:bg-indigo-100
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
  const formattedAmount = Math.round(
    Number(expense.amount || 0)
  )
    .toString()
    .replace(
      /\B(?=(\d{3})+(?!\d))/g,
      " "
    );

  return (
    <div
      className={`
        flex
        min-w-0
        max-w-full
        items-center
        justify-between
        gap-3
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

        <p
          className="
            break-words
            font-bold
            text-slate-900
          "
        >
          {expense.title}
        </p>

        <p
          className="
            mt-1
            break-words
            text-xs
            text-slate-500
          "
        >
          {new Date(
            expense.created_at
          ).toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

      </div>

      <div
        className="
          flex
          min-w-0
          shrink-0
          items-center
          gap-2
          sm:gap-3
        "
      >

        <p
          className="
            max-w-[130px]
            break-words
            text-right
            text-sm
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
            onDelete(expense.id)
          }
          className="
            flex
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-red-50
            p-2.5
            text-red-600
            transition
            hover:bg-red-100
            active:scale-95
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