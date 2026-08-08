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
    return Number(value || 0).toLocaleString("fr-FR");
  };

  // ======================================================
  // CHARGER LES DEPENSES
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
            fc += Number(expense.amount);
          } else if (expense.currency === "$") {
            usd += Number(expense.amount);
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
  // AJOUTER DEPENSE
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
  // SUPPRIMER DEPENSE
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
  // DEPENSES AUJOURD'HUI
  // ======================================================

  const todayExpenses = expenses.filter(
    (expense) =>
      expense.created_at.split("T")[0] ===
      todayStr
  );

  // ======================================================
  // DEPENSES HIER
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
  // DEPENSES A AFFICHER
  // ======================================================

  const displayedExpenses = searchDate
    ? searchedExpenses
    : expenses;

  // ======================================================
  // AFFICHAGE
  // ======================================================

  return (
    <main className="min-h-screen w-full">
      <div className="w-full space-y-5">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div
          className="
            rounded-3xl
            bg-white/5
            border
            border-white/10
            p-5
            sm:p-6
          "
        >
          <div className="flex items-center gap-4">

            <div
              className="
                shrink-0
                bg-orange-500/20
                p-3
                rounded-2xl
              "
            >
              <Wallet
                className="text-orange-400"
                size={30}
              />
            </div>

            <div className="min-w-0">

              <h1
                className="
                  text-2xl
                  sm:text-3xl
                  font-black
                  text-white
                  break-words
                "
              >
                Gestion des dépenses
              </h1>

              <p
                className="
                  mt-1
                  text-sm
                  text-slate-300
                  leading-6
                "
              >
                Suivi des sorties d'argent du
                commerce
              </p>

            </div>

          </div>
        </div>

        {/* ======================================================
            TOTAUX
        ====================================================== */}

        <div
          className="
            grid
            grid-cols-1
            sm:grid-cols-2
            gap-5
          "
        >

          <MoneyCard
            title="Dépenses du jour FC"
            value={formatMoney(totalFc) + " FC"}
            icon={
              <Banknote
                size={24}
                className="text-orange-400"
              />
            }
          />

          <MoneyCard
            title="Dépenses du jour USD"
            value={formatMoney(totalUsd) + " $"}
            icon={
              <Banknote
                size={24}
                className="text-orange-400"
              />
            }
          />

        </div>

        {/* ======================================================
            AJOUT DEPENSE — UNE SEULE SECTION
        ====================================================== */}

        <div
          className="
            rounded-3xl
            bg-white/5
            border
            border-white/10
            p-5
            sm:p-6
          "
        >

          <div
            className="
              flex
              items-center
              gap-2
              mb-5
            "
          >

            <PlusCircle
              size={22}
              className="text-orange-400"
            />

            <h2
              className="
                font-black
                text-xl
                text-white
              "
            >
              Nouvelle dépense
            </h2>

          </div>

          <div className="space-y-4">

            {/* NOM */}

            <div>
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
                placeholder="Nom de la dépense"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                className="
                  w-full
                  rounded-xl
                  bg-black/40
                  border
                  border-white/10
                  p-4
                  text-white
                  outline-none
                  placeholder:text-slate-400
                  focus:border-orange-400
                "
              />
            </div>

            {/* MONTANT */}

            <div>
              <label
                className="
                  mb-2
                  block
                  text-xs
                  font-bold
                  text-slate-400
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
                  w-full
                  rounded-xl
                  bg-black/40
                  border
                  border-white/10
                  p-4
                  text-white
                  outline-none
                  placeholder:text-slate-400
                  focus:border-orange-400
                "
              />
            </div>

            {/* MONNAIE */}

            <div>
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
                  setCurrency(e.target.value)
                }
                className="
                  w-full
                  rounded-xl
                  bg-[#111827]
                  border
                  border-white/10
                  p-4
                  text-white
                  outline-none
                  focus:border-orange-400
                "
              >

                <option
                  value="FC"
                  className="bg-[#111827] text-white"
                >
                  🇨🇩 Franc Congolais (FC)
                </option>

                <option
                  value="$"
                  className="bg-[#111827] text-white"
                >
                  🇺🇸 Dollar ($)
                </option>

              </select>
            </div>

            {/* RESUME */}

            {amount &&
              Number(amount) > 0 && (
                <div
                  className="
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
                      text-2xl
                      font-black
                      text-orange-400
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
              onClick={addExpense}
              disabled={loading}
              className="
                w-full
                rounded-xl
                py-4
                bg-gradient-to-r
                from-orange-500
                to-yellow-400
                text-black
                font-black
                flex
                justify-center
                items-center
                gap-2
                transition
                hover:scale-[1.01]
                active:scale-[0.99]
                disabled:opacity-50
                disabled:cursor-not-allowed
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
            rounded-3xl
            bg-white/5
            border
            border-white/10
            p-5
          "
        >

          <div
            className="
              flex
              items-center
              gap-2
              mb-4
            "
          >

            <History
              size={21}
              className="text-orange-400"
            />

            <div>

              <h2
                className="
                  font-black
                  text-white
                "
              >
                Historique
              </h2>

              <p
                className="
                  text-xs
                  text-slate-400
                "
              >
                Consultez les dépenses du commerce
              </p>

            </div>

          </div>

          <div
            className="
              flex
              flex-col
              md:flex-row
              gap-3
            "
          >

            {/* DATE */}

            <div className="relative flex-1">

              <CalendarDays
                size={18}
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-orange-400
                  pointer-events-none
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
                  w-full
                  rounded-xl
                  bg-black/40
                  border
                  border-white/10
                  p-3
                  pl-10
                  text-white
                  outline-none
                  focus:border-orange-400
                "
              />

            </div>

            {/* EFFACER DATE */}

            {searchDate && (
              <button
                onClick={() =>
                  setSearchDate("")
                }
                className="
                  rounded-xl
                  border
                  border-white/10
                  bg-black/30
                  px-5
                  py-3
                  text-sm
                  font-bold
                  text-slate-300
                  hover:text-white
                  transition
                "
              >
                Effacer
              </button>
            )}

            {/* TOUTES */}

            <button
              onClick={() =>
                setShowAll(!showAll)
              }
              className="
                bg-orange-500
                hover:bg-orange-400
                text-black
                font-black
                rounded-xl
                px-5
                py-3
                flex
                items-center
                justify-center
                gap-2
                transition
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
            5 DEPENSES MAXIMUM
        ====================================================== */}

        {!showAll && !searchDate && (
          <div
            className="
              grid
              grid-cols-1
              md:grid-cols-2
              gap-5
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
              rounded-3xl
              bg-white/5
              border
              border-white/10
              p-5
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
                gap-3
                mb-4
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >

                <CalendarDays
                  size={21}
                  className="text-orange-400"
                />

                <div>

                  <h2
                    className="
                      font-black
                      text-white
                    "
                  >
                    Dépenses du
                    {` ${searchDate}`}
                  </h2>

                  <p
                    className="
                      text-xs
                      text-slate-400
                    "
                  >
                    Dépenses enregistrées à cette date
                  </p>

                </div>

              </div>

              <span
                className="
                  rounded-xl
                  bg-orange-500/10
                  px-3
                  py-2
                  text-xs
                  font-black
                  text-orange-400
                "
              >
                {searchedExpenses.length}
              </span>

            </div>

            {searchedExpenses.length === 0 ? (
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

                <History
                  size={32}
                  className="
                    mx-auto
                    mb-3
                    text-slate-500
                  "
                />

                <p
                  className="
                    font-bold
                    text-slate-300
                  "
                >
                  Aucune dépense trouvée.
                </p>

              </div>
            ) : (
              <div>
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
              rounded-3xl
              bg-white/5
              border
              border-white/10
              p-5
            "
          >

            <div
              className="
                flex
                items-center
                justify-between
                gap-3
                mb-5
              "
            >

              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >

                <History
                  size={22}
                  className="text-orange-400"
                />

                <div>

                  <h2
                    className="
                      text-xl
                      font-black
                      text-white
                    "
                  >
                    Historique complet
                  </h2>

                  <p
                    className="
                      text-xs
                      text-slate-400
                    "
                  >
                    Toutes les dépenses enregistrées
                  </p>

                </div>

              </div>

              <div
                className="
                  rounded-xl
                  bg-orange-500/10
                  px-3
                  py-2
                  text-xs
                  font-bold
                  text-orange-400
                "
              >
                {displayedExpenses.length}{" "}
                dépense
                {displayedExpenses.length > 1
                  ? "s"
                  : ""}
              </div>

            </div>

            {displayedExpenses.length === 0 ? (
              <div
                className="
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/20
                  p-8
                  text-center
                "
              >

                <History
                  size={35}
                  className="
                    mx-auto
                    mb-3
                    text-slate-500
                  "
                />

                <p
                  className="
                    font-bold
                    text-slate-300
                  "
                >
                  Aucune dépense trouvée.
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                >
                  Les dépenses enregistrées
                  apparaîtront ici.
                </p>

              </div>
            ) : (
              <div>
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
        rounded-3xl
        bg-white/5
        border
        border-white/10
        p-5
      "
    >

      <div
        className="
          flex
          items-center
          justify-between
          gap-3
        "
      >

        <div className="min-w-0">

          <p
            className="
              font-black
              text-white
              break-words
            "
          >
            {title}
          </p>

          <p
            className="
              mt-1
              text-xs
              text-slate-500
            "
          >
            Total enregistré aujourd'hui
          </p>

        </div>

        <div
          className="
            rounded-2xl
            bg-orange-500/10
            p-3
          "
        >
          {icon}
        </div>

      </div>

      <p
        className="
          mt-4
          text-3xl
          font-black
          text-white
          break-words
        "
      >
        {value}
      </p>

    </div>
  );
}

// ======================================================
// LISTE DES DEPENSES
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
        rounded-3xl
        bg-white/5
        border
        border-white/10
        p-5
      "
    >

      <div
        className="
          flex
          items-center
          justify-between
          gap-3
          mb-4
        "
      >

        <h2
          className="
            text-xl
            font-black
            text-orange-400
          "
        >
          {title}
        </h2>

        <span
          className="
            rounded-xl
            bg-orange-500/10
            px-3
            py-1
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
            p-6
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
          <div>
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
              onClick={() =>
                setShowAll(!showAll)
              }
              className="
                mt-3
                w-full
                rounded-xl
                bg-orange-500/10
                border
                border-orange-400/20
                py-3
                text-sm
                font-black
                text-orange-400
                hover:bg-orange-500/20
                transition
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
// LIGNE DEPENSE
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
  return (
    <div
      className={`
        flex
        items-center
        justify-between
        gap-3
        border-b
        border-white/10
        ${compact ? "py-3" : "py-4"}
        last:border-0
      `}
    >

      <div className="min-w-0">

        <p
          className="
            font-bold
            text-white
            break-words
          "
        >
          {expense.title}
        </p>

        <p
          className="
            mt-1
            text-xs
            text-slate-300
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
          items-center
          gap-3
          shrink-0
        "
      >

        <p
          className="
            font-black
            text-orange-400
            text-right
          "
        >
          {Number(
            expense.amount
          ).toLocaleString("fr-FR")}{" "}
          {expense.currency}
        </p>

        <button
          onClick={() =>
            onDelete(expense.id)
          }
          className="
            bg-red-600
            hover:bg-red-500
            p-2
            rounded-xl
            transition
          "
          title="Supprimer cette dépense"
        >
          <Trash2
            size={17}
            className="text-white"
          />
        </button>

      </div>

    </div>
  );
}