"use client";

import { useEffect, useMemo, useState } from "react";
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

type DebtPayment = {
  id: string;
  debt_id: string;
  user_id: string;
  amount: number;
  currency: Currency;
  paid_at: string;
  created_at: string;
};

type Notice = {
  type: "success" | "error" | "info";
  message: string;
} | null;

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
   PAGE
========================================================= */

export default function DebtsPage() {
  /* ---------------------------------------------------------
     DETTES
  --------------------------------------------------------- */

  const [debts, setDebts] = useState<Debt[]>([]);

  /* ---------------------------------------------------------
     FORMULAIRE NOUVELLE DETTE
  --------------------------------------------------------- */

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] =
    useState<Currency>("FC");

  /* ---------------------------------------------------------
     RECHERCHE / PAIEMENT
  --------------------------------------------------------- */

  const [search, setSearch] = useState("");
  const [selectedDebt, setSelectedDebt] =
    useState<Debt | null>(null);

  const [paymentAmount, setPaymentAmount] =
    useState("");

  /* ---------------------------------------------------------
     HISTORIQUE
  --------------------------------------------------------- */

  const [payments, setPayments] =
    useState<DebtPayment[]>([]);

  /* ---------------------------------------------------------
     AFFICHAGE
  --------------------------------------------------------- */

  const [showAll, setShowAll] =
    useState(false);

  const [showNewDebt, setShowNewDebt] =
    useState(false);

  /* ---------------------------------------------------------
     CHARGEMENT
  --------------------------------------------------------- */

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

  /* ---------------------------------------------------------
     NOTIFICATION
  --------------------------------------------------------- */

  const [notice, setNotice] =
    useState<Notice>(null);

  /* =========================================================
     NOTIFICATION AUTOMATIQUE
  ========================================================= */

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 4500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

  /* =========================================================
     UTILISATEUR
  ========================================================= */

  const getUser = async () => {
    try {
      const savedUserId =
        localStorage.getItem("user_id");

      if (savedUserId) {
        return {
          id: savedUserId,
        };
      }

      const savedPhone =
        localStorage.getItem("phone");

      if (!savedPhone) {
        setNotice({
          type: "error",
          message:
            "Utilisateur non connecté.",
        });

        return null;
      }

      const {
        data: user,
        error,
      } = await supabase
        .from("users")
        .select("id")
        .eq("phone", savedPhone)
        .single();

      if (error || !user) {
        console.error(
          "Utilisateur introuvable :",
          error
        );

        setNotice({
          type: "error",
          message:
            "Impossible de retrouver votre compte.",
        });

        return null;
      }

      localStorage.setItem(
        "user_id",
        user.id
      );

      return user;
    } catch (error) {
      console.error(
        "Erreur utilisateur :",
        error
      );

      setNotice({
        type: "error",
        message:
          "Une erreur est survenue.",
      });

      return null;
    }
  };

  /* =========================================================
     CHARGER LES DETTES
  ========================================================= */

  const loadDebts = async () => {
    setLoading(true);

    try {
      const user = await getUser();

      if (!user) {
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("debts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Erreur chargement dettes :",
          error
        );

        setNotice({
          type: "error",
          message:
            "Impossible de charger les dettes.",
        });

        return;
      }

      setDebts(
        (data || []) as Debt[]
      );
    } catch (error) {
      console.error(
        "Erreur générale chargement :",
        error
      );

      setNotice({
        type: "error",
        message:
          "Une erreur est survenue pendant le chargement.",
      });
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     CHARGEMENT INITIAL
  ========================================================= */

  useEffect(() => {
    loadDebts();
  }, []);

  /* =========================================================
     AJOUTER UNE DETTE
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
      !Number.isFinite(numericAmount) ||
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
      const user = await getUser();

      if (!user) {
        return;
      }

      const {
        error,
      } = await supabase
        .from("debts")
        .insert({
          user_id: user.id,
          client_name: cleanName,
          phone: cleanPhone,
          total_amount: numericAmount,
          paid_amount: 0,
          currency,
          created_at:
            new Date().toISOString(),
        });

      if (error) {
        console.error(
          "Erreur ajout dette :",
          error
        );

        setNotice({
          type: "error",
          message:
            `Impossible d'enregistrer : ${error.message}`,
        });

        return;
      }

      setName("");
      setPhone("");
      setAmount("");
      setCurrency("FC");
      setShowNewDebt(false);

      await loadDebts();

      setNotice({
        type: "success",
        message:
          `Dette de ${formatMoney(
            numericAmount
          )} ${currency} enregistrée.`,
      });
    } catch (error) {
      console.error(
        "Erreur ajout dette :",
        error
      );

      setNotice({
        type: "error",
        message:
          "Impossible d'enregistrer la dette.",
      });
    } finally {
      setSavingDebt(false);
    }
  };

  /* =========================================================
     CHARGER L'HISTORIQUE DES PAIEMENTS
  ========================================================= */

  const loadPayments = async (
    debtId: string
  ) => {
    setLoadingPayments(true);

    try {
      const user = await getUser();

      if (!user) {
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from("debt_payments")
        .select("*")
        .eq("debt_id", debtId)
        .eq("user_id", user.id)
        .order("paid_at", {
          ascending: false,
        });

      if (error) {
        console.error(
          "Erreur historique paiements :",
          error
        );

        setNotice({
          type: "error",
          message:
            "Impossible de charger l'historique.",
        });

        return;
      }

      setPayments(
        (data || []) as DebtPayment[]
      );
    } catch (error) {
      console.error(
        "Erreur historique :",
        error
      );

      setNotice({
        type: "error",
        message:
          "Impossible de charger l'historique.",
      });
    } finally {
      setLoadingPayments(false);
    }
  };

  /* =========================================================
     OUVRIR UNE DETTE
  ========================================================= */

  const openDebt = async (
    debt: Debt
  ) => {
    setSelectedDebt(debt);
    setPaymentAmount("");
    setPayments([]);

    await loadPayments(debt.id);
  };

  /* =========================================================
     FERMER DÉTAILS
  ========================================================= */

  const closeDebt = () => {
    if (payingDebt) return;

    setSelectedDebt(null);
    setPaymentAmount("");
    setPayments([]);
  };

  /* =========================================================
     ENREGISTRER UN PAIEMENT
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
      getRemaining(selectedDebt);

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
      const user = await getUser();

      if (!user) {
        return;
      }

      const {
        data: payment,
        error: paymentError,
      } = await supabase
        .from("debt_payments")
        .insert({
          debt_id: selectedDebt.id,
          user_id: user.id,
          amount: value,
          currency:
            selectedDebt.currency,
        })
        .select()
        .single();

      if (paymentError || !payment) {
        console.error(
          "Erreur enregistrement paiement :",
          paymentError
        );

        setNotice({
          type: "error",
          message:
            `Paiement non enregistré : ${
              paymentError?.message ||
              "erreur inconnue"
            }`,
        });

        return;
      }

      const newPaid =
        Number(selectedDebt.paid_amount || 0) +
        value;

      const total =
        Number(selectedDebt.total_amount || 0);

      const finalPaid =
        Math.min(newPaid, total);

      const {
        data: updatedDebt,
        error: updateError,
      } = await supabase
        .from("debts")
        .update({
          paid_amount: finalPaid,
        })
        .eq(
          "id",
          selectedDebt.id
        )
        .eq(
          "user_id",
          user.id
        )
        .select("*")
        .single();

      if (updateError || !updatedDebt) {
        await supabase
          .from("debt_payments")
          .delete()
          .eq(
            "id",
            payment.id
          )
          .eq(
            "user_id",
            user.id
          );

        console.error(
          "Erreur mise à jour dette :",
          updateError
        );

        setNotice({
          type: "error",
          message:
            "Le paiement n'a pas pu être finalisé.",
        });

        return;
      }

      const newRemaining =
        Math.max(
          0,
          total - finalPaid
        );

      const updated =
        updatedDebt as Debt;

      setDebts((current) =>
        current.map((item) =>
          item.id === updated.id
            ? updated
            : item
        )
      );

      setSelectedDebt(updated);
      setPaymentAmount("");

      await loadPayments(
        updated.id
      );

      if (newRemaining === 0) {
        setNotice({
          type: "success",
          message:
            `Dette de ${updated.client_name} entièrement payée.`,
        });
      } else {
        setNotice({
          type: "success",
          message:
            `Paiement enregistré. Reste : ${formatMoney(
              newRemaining
            )} ${updated.currency}.`,
        });
      }
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
     SUPPRIMER UNE DETTE
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
      const user = await getUser();

      if (!user) {
        return;
      }

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
          user.id
        );

      if (error) {
        console.error(
          "Erreur suppression :",
          error
        );

        setNotice({
          type: "error",
          message:
            "Impossible de supprimer cette dette.",
        });

        return;
      }

      setDebts((current) =>
        current.filter(
          (item) =>
            item.id !== debt.id
        )
      );

      if (
        selectedDebt?.id ===
        debt.id
      ) {
        closeDebt();
      }

      setNotice({
        type: "success",
        message:
          `Dette de ${debt.client_name} supprimée.`,
      });
    } catch (error) {
      console.error(
        "Erreur suppression :",
        error
      );

      setNotice({
        type: "error",
        message:
          "Une erreur est survenue.",
      });
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
    }, [debts, search]);

  /* =========================================================
     DETTES VISIBLES
  ========================================================= */

  const visibleDebts =
    showAll
      ? filteredDebts
      : filteredDebts.slice(0, 5);

  /* =========================================================
     STATISTIQUES
  ========================================================= */

  const totalRemainingFc =
    debts
      .filter(
        (debt) =>
          debt.currency === "FC"
      )
      .reduce(
        (sum, debt) =>
          sum + getRemaining(debt),
        0
      );

  const totalRemainingUsd =
    debts
      .filter(
        (debt) =>
          debt.currency === "USD"
      )
      .reduce(
        (sum, debt) =>
          sum + getRemaining(debt),
        0
      );

  const totalPaidFc =
    debts
      .filter(
        (debt) =>
          debt.currency === "FC"
      )
      .reduce(
        (sum, debt) =>
          sum +
          Number(
            debt.paid_amount || 0
          ),
        0
      );

  const totalPaidUsd =
    debts
      .filter(
        (debt) =>
          debt.currency === "USD"
      )
      .reduce(
        (sum, debt) =>
          sum +
          Number(
            debt.paid_amount || 0
          ),
        0
      );

  const unpaidCount =
    debts.filter(
      (debt) =>
        getRemaining(debt) > 0
    ).length;

  /* =========================================================
     RENDER
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
                notice.type === "success"
                  ? "border-emerald-200 text-emerald-700"
                  : notice.type === "error"
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
                  notice.type === "success"
                    ? "bg-emerald-50"
                    : notice.type === "error"
                    ? "bg-red-50"
                    : "bg-indigo-50"
                }
              `}
            >
              {notice.type === "success" ? (
                <CheckCircle size={19} />
              ) : (
                <AlertCircle size={19} />
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

            <div className="grid grid-cols-2 gap-2">

              <button
                type="button"
                onClick={loadDebts}
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
                        currency === "FC"
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
                        currency === "USD"
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
              onClick={addDebt}
              disabled={savingDebt}
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
                {filteredDebts.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>

            {filteredDebts.length > 5 && (
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
                    <ChevronUp size={15} />
                    Réduire
                  </>
                ) : (
                  <>
                    <ChevronDown size={15} />
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
          ) : visibleDebts.length === 0 ? (
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
                    getRemaining(debt);

                  const progress =
                    getProgress(debt);

                  const paid =
                    remaining <= 0;

                  return (
                    <article
                      key={debt.id}
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

                      {/* CLIENT */}

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex min-w-0 items-center gap-3">

                          <div className={`
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
                          `}>
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
                              <Phone size={11} />
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

                      {/* MONTANTS */}

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

                        <div className={`
                          rounded-2xl
                          border
                          p-3
                          ${
                            paid
                              ? "border-emerald-100 bg-emerald-50/60"
                              : "border-amber-100 bg-amber-50/60"
                          }
                        `}>

                          <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                            {paid
                              ? "Reste"
                              : "À payer"}
                          </p>

                          <p className={`
                            mt-1
                            text-sm
                            font-black
                            ${
                              paid
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }
                          `}>
                            {formatMoney(
                              remaining
                            )}{" "}
                            {debt.currency}
                          </p>

                        </div>

                      </div>

                      {/* PROGRESSION */}

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

                      {/* DATE */}

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-medium text-slate-400">

                        <span className="flex items-center gap-1">
                          <CalendarDays size={11} />
                          {formatDate(
                            debt.created_at
                          )}
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {formatTime(
                            debt.created_at
                          )}
                        </span>

                      </div>

                      {/* ACTIONS */}

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
                          disabled={paid}
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

                <div className={`
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
                `}>
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
                disabled={payingDebt}
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

            {/* =================================================
                RÉSUMÉ
            ================================================= */}

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

              <div className={`
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
              `}>

                <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                  Reste
                </p>

                <p className={`
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
                `}>
                  {formatMoney(
                    getRemaining(
                      selectedDebt
                    )
                  )}{" "}
                  {selectedDebt.currency}
                </p>

              </div>

            </div>

            {/* =================================================
                DATE CRÉATION
            ================================================= */}

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

            {/* =================================================
                PAIEMENT
            ================================================= */}

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
                    value={paymentAmount}
                    onChange={(e) =>
                      setPaymentAmount(
                        e.target.value
                      )
                    }
                    placeholder={`Reste : ${formatMoney(
                      getRemaining(
                        selectedDebt
                      )
                    )}`}
                    className={inputClass}
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                    {selectedDebt.currency}
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
                    onClick={payDebt}
                    disabled={payingDebt}
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
                  <CheckCircle size={19} />
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

            {/* =================================================
                HISTORIQUE
            ================================================= */}

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
              ) : payments.length === 0 ? (
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
                                {payment.currency}
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

            {/* =================================================
                SUPPRIMER
            ================================================= */}

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
                  <Trash2 size={15} />
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