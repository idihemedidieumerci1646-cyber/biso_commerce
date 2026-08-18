"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  Search,
  Plus,
  CheckCircle,
  CreditCard,
  Sparkles,
  UserPlus,
  Trash2,
  Wallet,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  Phone,
  Banknote,
  Users,
  CircleDollarSign,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type Debt = {
  id: string;
  client_name: string;
  phone: string;
  total_amount: number;
  paid_amount: number;
  currency: "FC" | "USD";
  created_at: string;
};

type Notice = {
  type: "success" | "error" | "info";
  message: string;
} | null;

/* =========================================================
   STYLES
========================================================= */

const inputStyle = `
  w-full
  min-h-[52px]
  rounded-2xl
  border
  border-white/10
  bg-[#0b1628]
  px-4
  py-3
  outline-none
  text-white
  placeholder:text-slate-500
  focus:border-orange-400
  focus:ring-2
  focus:ring-orange-400/10
  transition
`;

/* =========================================================
   OUTILS
========================================================= */

const formatMoney = (value: number) => {
  return Math.round(Number(value || 0)).toLocaleString("fr-FR");
};

/* =========================================================
   PAGE
========================================================= */

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");

  const [currency, setCurrency] =
    useState<"FC" | "USD">("FC");

  const [search, setSearch] = useState("");

  const [selectedDebt, setSelectedDebt] =
    useState("");

  const [paymentAmount, setPaymentAmount] =
    useState("");

  const [showAll, setShowAll] =
    useState(false);

  const [showGuide, setShowGuide] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [savingDebt, setSavingDebt] =
    useState(false);

  const [payingDebt, setPayingDebt] =
    useState(false);

  const [notice, setNotice] =
    useState<Notice>(null);

  /* =========================================================
     CHARGEMENT INITIAL
  ========================================================= */

  useEffect(() => {
    loadDebts();
  }, []);

  /* =========================================================
     NOTIFICATION AUTOMATIQUE
  ========================================================= */

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => {
      setNotice(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notice]);

  /* =========================================================
     UTILISATEUR
  ========================================================= */

  const getUser = async () => {
    try {
      const savedPhone =
        localStorage.getItem("phone");

      if (!savedPhone) {
        setNotice({
          type: "error",
          message:
            "Utilisateur non connecté. Veuillez vous reconnecter.",
        });

        return null;
      }

      const { data: user, error } =
        await supabase
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
        setLoading(false);
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
        "Erreur générale :",
        error
      );

      setNotice({
        type: "error",
        message:
          "Une erreur est survenue lors du chargement.",
      });
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     AJOUTER UNE DETTE
  ========================================================= */

  const addDebt = async () => {
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const numericAmount = Number(amount);

    if (
      !cleanName ||
      !cleanPhone ||
      !amount
    ) {
      setNotice({
        type: "info",
        message:
          "Veuillez remplir toutes les informations.",
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
          "Veuillez saisir un montant valide.",
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
            `Impossible d'enregistrer la dette : ${error.message}`,
        });

        return;
      }

      /* -----------------------------------------
         NETTOYAGE DU FORMULAIRE
      ----------------------------------------- */

      setName("");
      setPhone("");
      setAmount("");
      setCurrency("FC");

      /* -----------------------------------------
         RECHARGEMENT
      ----------------------------------------- */

      await loadDebts();

      /* -----------------------------------------
         SIGNAL DE SUCCÈS
      ----------------------------------------- */

      setNotice({
        type: "success",
        message:
          `Dette de ${formatMoney(
            numericAmount
          )} ${currency} enregistrée avec succès pour ${cleanName}.`,
      });
    } catch (error) {
      console.error(
        "Erreur générale ajout dette :",
        error
      );

      setNotice({
        type: "error",
        message:
          "Une erreur est survenue pendant l'enregistrement.",
      });
    } finally {
      setSavingDebt(false);
    }
  };

  /* =========================================================
     RÉCUPÉRER UNE DETTE
  ========================================================= */

  const payDebt = async () => {
    if (
      !selectedDebt ||
      !paymentAmount
    ) {
      setNotice({
        type: "info",
        message:
          "Sélectionnez une dette et indiquez le montant reçu.",
      });

      return;
    }

    const debt =
      debts.find(
        (d) => d.id === selectedDebt
      );

    if (!debt) {
      setNotice({
        type: "error",
        message:
          "Dette introuvable.",
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
          "Veuillez saisir un montant valide.",
      });

      return;
    }

    const remaining =
      debt.total_amount -
      debt.paid_amount;

    if (value > remaining) {
      setNotice({
        type: "error",
        message:
          "Le montant reçu dépasse le reste à payer.",
      });

      return;
    }

    setPayingDebt(true);

    try {
      const newPaid =
        debt.paid_amount + value;

      if (
        newPaid >=
        debt.total_amount
      ) {
        const {
          error,
        } = await supabase
          .from("debts")
          .delete()
          .eq(
            "id",
            selectedDebt
          );

        if (error) {
          throw error;
        }

        setNotice({
          type: "success",
          message:
            `Dette de ${debt.client_name} entièrement récupérée. Dette clôturée avec succès.`,
        });
      } else {
        const {
          error,
        } = await supabase
          .from("debts")
          .update({
            paid_amount: newPaid,
          })
          .eq(
            "id",
            selectedDebt
          );

        if (error) {
          throw error;
        }

        const newRemaining =
          debt.total_amount -
          newPaid;

        setNotice({
          type: "success",
          message:
            `Paiement de ${formatMoney(
              value
            )} ${debt.currency} enregistré. Reste : ${formatMoney(
              newRemaining
            )} ${debt.currency}.`,
        });
      }

      setPaymentAmount("");
      setSelectedDebt("");
      setSearch("");

      await loadDebts();
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
    id: string
  ) => {
    const debt =
      debts.find(
        (d) => d.id === id
      );

    if (!debt) return;

    const confirmed =
      window.confirm(
        `Voulez-vous vraiment supprimer la dette de ${debt.client_name} ? Cette action est irréversible.`
      );

    if (!confirmed) return;

    try {
      const {
        error,
      } = await supabase
        .from("debts")
        .delete()
        .eq("id", id);

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

      setDebts(
        (current) =>
          current.filter(
            (d) => d.id !== id
          )
      );

      if (
        selectedDebt === id
      ) {
        setSelectedDebt("");
        setSearch("");
      }

      setNotice({
        type: "success",
        message:
          `La dette de ${debt.client_name} a été supprimée.`,
      });
    } catch (error) {
      console.error(
        "Erreur suppression :",
        error
      );

      setNotice({
        type: "error",
        message:
          "Une erreur est survenue lors de la suppression.",
      });
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
        return [];
      }

      return debts.filter(
        (d) =>
          d.client_name
            .toLowerCase()
            .includes(query) ||
          (d.phone || "")
            .toLowerCase()
            .includes(query)
      );
    }, [debts, search]);

  /* =========================================================
     STATISTIQUES
  ========================================================= */

  const totalFc =
    debts
      .filter(
        (d) =>
          d.currency === "FC"
      )
      .reduce(
        (sum, d) =>
          sum +
          (d.total_amount -
            d.paid_amount),
        0
      );

  const totalUsd =
    debts
      .filter(
        (d) =>
          d.currency === "USD"
      )
      .reduce(
        (sum, d) =>
          sum +
          (d.total_amount -
            d.paid_amount),
        0
      );

  const totalClients =
    debts.length;

  const totalPaidFc =
    debts
      .filter(
        (d) =>
          d.currency === "FC"
      )
      .reduce(
        (sum, d) =>
          sum + d.paid_amount,
        0
      );

  const totalPaidUsd =
    debts
      .filter(
        (d) =>
          d.currency === "USD"
      )
      .reduce(
        (sum, d) =>
          sum + d.paid_amount,
        0
      );

  /* =========================================================
     DETTES VISIBLES
  ========================================================= */

  const visibleDebts =
    showAll
      ? debts
      : debts.slice(0, 5);

  /* =========================================================
     RENDU
  ========================================================= */

  return (
    <main
      className="
        min-h-screen
        bg-[#06101f]
        text-white
        px-3
        py-5
        pb-24
        sm:px-5
        sm:py-7
      "
    >
      <div
        className="
          mx-auto
          w-full
          max-w-6xl
          space-y-6
        "
      >
        {/* =================================================
            NOTIFICATION
        ================================================= */}

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
              p-4
              shadow-2xl
              backdrop-blur-xl
              ${
                notice.type ===
                "success"
                  ? "border-green-400/30 bg-green-500/15 text-green-300"
                  : notice.type ===
                    "error"
                  ? "border-red-400/30 bg-red-500/15 text-red-300"
                  : "border-orange-400/30 bg-orange-500/15 text-orange-300"
              }
            `}
            role="alert"
          >
            {notice.type ===
            "success" ? (
              <CheckCircle
                size={21}
                className="mt-0.5 shrink-0"
              />
            ) : (
              <AlertCircle
                size={21}
                className="mt-0.5 shrink-0"
              />
            )}

            <p className="flex-1 text-sm font-black leading-5">
              {notice.message}
            </p>

            <button
              type="button"
              onClick={() =>
                setNotice(null)
              }
              className="shrink-0 rounded-lg p-1 transition hover:bg-white/10"
              aria-label="Fermer"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* =================================================
            HEADER
        ================================================= */}

        <section
          className="
            relative
            overflow-hidden
            rounded-[28px]
            border
            border-white/10
            bg-white/[0.045]
            p-5
            shadow-2xl
            backdrop-blur-xl
            sm:p-7
          "
        >
          <div
            className="
              absolute
              -right-20
              -top-20
              h-48
              w-48
              rounded-full
              bg-orange-500/10
              blur-3xl
            "
          />

          <div
            className="
              relative
              flex
              flex-col
              gap-5
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div className="flex items-center gap-4">
              <div
                className="
                  flex
                  h-14
                  w-14
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-gradient-to-br
                  from-orange-500/20
                  to-yellow-400/10
                  text-orange-400
                  shadow-lg
                  shadow-orange-500/10
                "
              >
                <Wallet size={27} />
              </div>

              <div>
                <h1
                  className="
                    text-2xl
                    font-black
                    tracking-tight
                    text-white
                    sm:text-3xl
                  "
                >
                  Dettes clients
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  Gérez les crédits et récupérez votre argent.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadDebts}
                disabled={loading}
                className="
                  inline-flex
                  min-h-[46px]
                  flex-1
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-white/10
                  bg-black/30
                  px-4
                  font-bold
                  text-slate-300
                  transition
                  hover:bg-white/5
                  disabled:opacity-50
                  sm:flex-none
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
                  setShowGuide(
                    !showGuide
                  )
                }
                className="
                  inline-flex
                  min-h-[46px]
                  flex-1
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-orange-400/20
                  bg-orange-500/10
                  px-4
                  font-black
                  text-orange-300
                  transition
                  hover:bg-orange-500/20
                  sm:flex-none
                "
              >
                <Sparkles size={17} />
                Guide
              </button>
            </div>
          </div>

          {/* GUIDE */}

          {showGuide && (
            <div
              className="
                relative
                mt-5
                rounded-2xl
                border
                border-white/10
                bg-black/20
                p-5
              "
            >
              <div className="space-y-3 text-sm leading-6 text-slate-300">
                <p>
                  👤 Ajoutez le nom et le numéro du client.
                </p>

                <p>
                  💰 Choisissez la monnaie réelle de la dette : FC ou USD.
                </p>

                <p>
                  💳 Lorsqu'un client paie, utilisez la section « Récupérer une dette ».
                </p>

                <p>
                  📊 La barre de progression indique le montant déjà récupéré.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* =================================================
            STATISTIQUES
        ================================================= */}

        <section
          className="
            grid
            grid-cols-2
            gap-3
            md:grid-cols-4
          "
        >
          <StatCard
            icon={
              <Banknote size={19} />
            }
            title="Dette FC"
            value={`${formatMoney(
              totalFc
            )} FC`}
            tone="orange"
          />

          <StatCard
            icon={
              <CircleDollarSign
                size={19}
              />
            }
            title="Dette USD"
            value={`${formatMoney(
              totalUsd
            )} $`}
            tone="green"
          />

          <StatCard
            icon={
              <Users size={19} />
            }
            title="Clients"
            value={String(
              totalClients
            )}
            tone="blue"
          />

          <StatCard
            icon={
              <CheckCircle
                size={19}
              />
            }
            title="Récupéré"
            value={`${formatMoney(
              totalPaidFc
            )} FC`}
            subtitle={`${formatMoney(
              totalPaidUsd
            )} $`}
            tone="purple"
          />
        </section>

        {/* =================================================
            FORMULAIRES
        ================================================= */}

        <section
          className="
            grid
            gap-5
            md:grid-cols-2
          "
        >
          {/* =================================================
              NOUVELLE DETTE
          ================================================= */}

          <div
            className="
              overflow-hidden
              rounded-[28px]
              border
              border-white/10
              bg-white/[0.045]
              p-5
              shadow-xl
              sm:p-6
            "
          >
            <div className="mb-5 flex items-center gap-3">
              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-orange-500/10
                  text-orange-400
                "
              >
                <UserPlus size={20} />
              </div>

              <div>
                <h2 className="text-xl font-black">
                  Nouvelle dette
                </h2>

                <p className="text-xs text-slate-500">
                  Enregistrer un crédit client
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-slate-400">
                  Nom du client
                </label>

                <input
                  type="text"
                  placeholder="Ex : Jean Mukendi"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  className={inputStyle}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-400">
                  Numéro de téléphone
                </label>

                <div className="relative">
                  <Phone
                    size={17}
                    className="
                      pointer-events-none
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      text-slate-500
                    "
                  />

                  <input
                    type="tel"
                    placeholder="Ex : 0812345678"
                    value={phone}
                    onChange={(e) =>
                      setPhone(
                        e.target.value
                      )
                    }
                    className={`${inputStyle} pl-11`}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-slate-400">
                  Montant de la dette
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="Ex : 50000"
                  value={amount}
                  onChange={(e) =>
                    setAmount(
                      e.target.value
                    )
                  }
                  className={inputStyle}
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-bold text-slate-400">
                  Choisir la monnaie
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrency("FC")
                    }
                    className={`
                      min-h-[50px]
                      rounded-xl
                      border
                      font-black
                      transition
                      ${
                        currency ===
                        "FC"
                          ? "border-orange-400 bg-orange-500 text-black shadow-lg shadow-orange-500/10"
                          : "border-white/10 bg-black/30 text-slate-300 hover:bg-white/5"
                      }
                    `}
                  >
                    🇨🇩 FC
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrency(
                        "USD"
                      )
                    }
                    className={`
                      min-h-[50px]
                      rounded-xl
                      border
                      font-black
                      transition
                      ${
                        currency ===
                        "USD"
                          ? "border-green-400 bg-green-500 text-black shadow-lg shadow-green-500/10"
                          : "border-white/10 bg-black/30 text-slate-300 hover:bg-white/5"
                      }
                    `}
                  >
                    💵 USD
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={addDebt}
                disabled={savingDebt}
                className="
                  mt-2
                  flex
                  min-h-[54px]
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-gradient-to-r
                  from-orange-500
                  to-yellow-400
                  font-black
                  text-black
                  shadow-lg
                  shadow-orange-500/10
                  transition
                  hover:brightness-110
                  active:scale-[0.99]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {savingDebt ? (
                  <>
                    <Loader2
                      size={19}
                      className="animate-spin"
                    />

                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Plus size={19} />

                    Enregistrer la dette
                  </>
                )}
              </button>
            </div>
          </div>

          {/* =================================================
              RÉCUPÉRATION
          ================================================= */}

          <div
            className="
              overflow-hidden
              rounded-[28px]
              border
              border-white/10
              bg-white/[0.045]
              p-5
              shadow-xl
              sm:p-6
            "
          >
            <div className="mb-5 flex items-center gap-3">
              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-green-500/10
                  text-green-400
                "
              >
                <CreditCard size={20} />
              </div>

              <div>
                <h2 className="text-xl font-black">
                  Récupérer une dette
                </h2>

                <p className="text-xs text-slate-500">
                  Enregistrer un paiement client
                </p>
              </div>
            </div>

            <div className="relative">
              <Search
                size={19}
                className="
                  pointer-events-none
                  absolute
                  left-4
                  top-1/2
                  z-10
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <input
                type="text"
                placeholder="Chercher nom ou téléphone"
                value={search}
                onChange={(e) => {
                  setSearch(
                    e.target.value
                  );
                  setSelectedDebt("");
                }}
                className="
                  min-h-[52px]
                  w-full
                  rounded-2xl
                  border
                  border-orange-400/40
                  bg-[#111c2e]
                  pl-11
                  pr-4
                  text-[16px]
                  text-white
                  outline-none
                  placeholder:text-slate-500
                  focus:border-orange-400
                  focus:ring-2
                  focus:ring-orange-400/10
                "
              />
            </div>

            {/* RÉSULTATS */}

            {search &&
              !selectedDebt && (
                <div
                  className="
                    mt-3
                    max-h-60
                    overflow-y-auto
                    rounded-2xl
                    border
                    border-white/10
                    bg-[#0a1424]
                    shadow-2xl
                  "
                >
                  {filteredDebts.length ===
                  0 ? (
                    <div className="p-5 text-center text-sm text-slate-500">
                      Aucun client trouvé.
                    </div>
                  ) : (
                    filteredDebts.map(
                      (d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setSelectedDebt(
                              d.id
                            );
                            setSearch(
                              d.client_name
                            );
                          }}
                          className="
                            flex
                            w-full
                            items-center
                            justify-between
                            gap-3
                            border-b
                            border-white/5
                            p-4
                            text-left
                            transition
                            last:border-0
                            hover:bg-white/5
                          "
                        >
                          <div className="min-w-0">
                            <p className="truncate font-black text-white">
                              {d.client_name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {d.phone}
                            </p>
                          </div>

                          <span className="shrink-0 rounded-lg bg-orange-500/10 px-2 py-1 text-xs font-black text-orange-400">
                            {formatMoney(
                              d.total_amount -
                                d.paid_amount
                            )}{" "}
                            {d.currency}
                          </span>
                        </button>
                      )
                    )
                  )}
                </div>
              )}

            {/* DETTE SÉLECTIONNÉE */}

            {selectedDebt && (
              <div
                className="
                  mt-4
                  rounded-2xl
                  border
                  border-orange-400/20
                  bg-orange-500/10
                  p-4
                "
              >
                {(() => {
                  const d =
                    debts.find(
                      (x) =>
                        x.id ===
                        selectedDebt
                    );

                  if (!d)
                    return null;

                  const reste =
                    d.total_amount -
                    d.paid_amount;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-400">
                          Client
                        </span>

                        <span className="font-black text-white">
                          {d.client_name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-400">
                          Téléphone
                        </span>

                        <span className="text-sm font-bold text-white">
                          {d.phone}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                        <span className="text-sm text-slate-400">
                          Reste à payer
                        </span>

                        <span className="text-lg font-black text-orange-400">
                          {formatMoney(
                            reste
                          )}{" "}
                          {d.currency}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="mt-4">
              <label className="mb-2 block text-xs font-bold text-slate-400">
                Montant reçu
              </label>

              <input
                type="number"
                min="0"
                placeholder="Montant payé par le client"
                value={paymentAmount}
                onChange={(e) =>
                  setPaymentAmount(
                    e.target.value
                  )
                }
                className={inputStyle}
              />
            </div>

            <button
              type="button"
              onClick={payDebt}
              disabled={payingDebt}
              className="
                mt-4
                flex
                min-h-[54px]
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-green-500
                font-black
                text-black
                shadow-lg
                shadow-green-500/10
                transition
                hover:bg-green-400
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {payingDebt ? (
                <>
                  <Loader2
                    size={19}
                    className="animate-spin"
                  />

                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle
                    size={19}
                  />

                  Valider le paiement
                </>
              )}
            </button>
          </div>
        </section>

        {/* =================================================
            LISTE DES DETTES
        ================================================= */}

        <section
          className="
            overflow-hidden
            rounded-[28px]
            border
            border-white/10
            bg-white/[0.045]
            p-5
            shadow-xl
            sm:p-6
          "
        >
          <div
            className="
              mb-5
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-orange-500/10
                  text-orange-400
                "
              >
                <Wallet size={20} />
              </div>

              <div>
                <h2 className="text-xl font-black">
                  Toutes les dettes
                </h2>

                <p className="text-xs text-slate-500">
                  {debts.length} dette
                  {debts.length >
                  1
                    ? "s"
                    : ""}{" "}
                  enregistrée
                  {debts.length >
                  1
                    ? "s"
                    : ""}
                </p>
              </div>
            </div>

            {debts.length > 5 && (
              <button
                type="button"
                onClick={() =>
                  setShowAll(
                    !showAll
                  )
                }
                className="
                  rounded-xl
                  border
                  border-orange-400/20
                  bg-orange-500/10
                  px-4
                  py-2.5
                  text-sm
                  font-black
                  text-orange-300
                  transition
                  hover:bg-orange-500/20
                "
              >
                {showAll
                  ? "Réduire"
                  : `Voir tout (${debts.length})`}
              </button>
            )}
          </div>

          {/* CHARGEMENT */}

          {loading ? (
            <div
              className="
                flex
                flex-col
                items-center
                justify-center
                rounded-2xl
                border
                border-white/10
                bg-black/20
                p-12
              "
            >
              <Loader2
                size={28}
                className="animate-spin text-orange-400"
              />

              <p className="mt-4 text-sm font-bold text-slate-500">
                Chargement des dettes...
              </p>
            </div>
          ) : visibleDebts.length ===
            0 ? (
            <div
              className="
                rounded-2xl
                border
                border-white/10
                bg-black/20
                p-10
                text-center
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
                <Wallet size={25} />
              </div>

              <p className="mt-4 font-black text-white">
                Aucune dette enregistrée
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Les nouvelles dettes apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleDebts.map(
                (d) => {
                  const reste =
                    d.total_amount -
                    d.paid_amount;

                  const percent =
                    d.total_amount >
                    0
                      ? Math.min(
                          100,
                          Math.round(
                            (d.paid_amount /
                              d.total_amount) *
                              100
                          )
                        )
                      : 0;

                  return (
                    <article
                      key={d.id}
                      className="
                        overflow-hidden
                        rounded-2xl
                        border
                        border-white/10
                        bg-black/20
                        p-4
                        transition
                        hover:border-white/20
                        hover:bg-black/30
                        sm:p-5
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
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="
                              flex
                              h-11
                              w-11
                              shrink-0
                              items-center
                              justify-center
                              rounded-xl
                              bg-orange-500/10
                              text-orange-400
                            "
                          >
                            <Users
                              size={19}
                            />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate font-black text-white">
                              {
                                d.client_name
                              }
                            </h3>

                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <Phone
                                size={
                                  12
                                }
                              />

                              {d.phone}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            deleteDebt(
                              d.id
                            )
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
                          "
                          title="Supprimer cette dette"
                          aria-label="Supprimer cette dette"
                        >
                          <Trash2
                            size={16}
                          />
                        </button>
                      </div>

                      {/* MONTANTS */}

                      <div
                        className="
                          mt-4
                          grid
                          grid-cols-2
                          gap-3
                        "
                      >
                        <div
                          className="
                            rounded-xl
                            border
                            border-white/5
                            bg-white/[0.03]
                            p-3
                          "
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Dette totale
                          </p>

                          <p className="mt-1 font-black text-white">
                            {formatMoney(
                              d.total_amount
                            )}{" "}
                            {d.currency}
                          </p>
                        </div>

                        <div
                          className="
                            rounded-xl
                            border
                            border-orange-400/10
                            bg-orange-500/[0.04]
                            p-3
                          "
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Reste
                          </p>

                          <p className="mt-1 font-black text-orange-400">
                            {formatMoney(
                              reste
                            )}{" "}
                            {d.currency}
                          </p>
                        </div>
                      </div>

                      {/* PROGRESSION */}

                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-slate-500">
                            Progression
                          </span>

                          <span className="text-xs font-black text-green-400">
                            {percent}%
                          </span>
                        </div>

                        <div
                          className="
                            h-3
                            overflow-hidden
                            rounded-full
                            bg-black/60
                          "
                        >
                          <div
                            className="
                              h-full
                              rounded-full
                              bg-gradient-to-r
                              from-green-400
                              to-orange-400
                              transition-all
                            "
                            style={{
                              width: `${percent}%`,
                            }}
                          />
                        </div>

                        <div className="mt-2 flex justify-between text-[11px]">
                          <span className="text-slate-500">
                            Récupéré :{" "}
                            {formatMoney(
                              d.paid_amount
                            )}{" "}
                            {d.currency}
                          </span>

                          <span className="font-bold text-green-400">
                            {percent}% récupéré
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
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
    | "orange"
    | "green"
    | "blue"
    | "purple";
}) {
  const toneClass =
    tone === "orange"
      ? "bg-orange-500/10 text-orange-400"
      : tone === "green"
      ? "bg-green-500/10 text-green-400"
      : tone === "blue"
      ? "bg-blue-500/10 text-blue-400"
      : "bg-purple-500/10 text-purple-400";

  return (
    <div
      className="
        overflow-hidden
        rounded-2xl
        border
        border-white/10
        bg-white/[0.045]
        p-4
        shadow-lg
        transition
        hover:border-white/15
        hover:bg-white/[0.06]
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

      <p className="text-xs font-bold text-slate-500">
        {title}
      </p>

      <p className="mt-1 break-words text-lg font-black text-white sm:text-xl">
        {value}
      </p>

      {subtitle && (
        <p className="mt-1 text-[11px] font-bold text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}