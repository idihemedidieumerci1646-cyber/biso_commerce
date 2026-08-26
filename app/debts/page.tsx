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
  Phone,
  Banknote,
  CalendarDays,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Debt = {
  id: string;
  client_name: string;
  phone: string;
  total_amount: number;
  paid_amount: number;
  currency: "FC" | "USD";
  created_at: string;
};

// ======================================================
// FORMATAGE
// ======================================================

const formatMoney = (value: number) => {
  const number = Math.round(Number(value || 0));

  return number
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const getDate = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .split("T")[0];
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ======================================================
// PAGE DETTES
// ======================================================

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

  const [showAll, setShowAll] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingDebts, setLoadingDebts] = useState(false);
  const [paying, setPaying] = useState(false);

  // ======================================================
  // POPUPS SUPPRESSION
  // ======================================================

  const [deleteTarget, setDeleteTarget] =
    useState<Debt | null>(null);

  const [showOfflineDeletePopup, setShowOfflineDeletePopup] =
    useState(false);

  const todayStr = getDate(new Date());

  const yesterdayStr = getDate(
    new Date(Date.now() - 86400000)
  );

  // ======================================================
  // CHARGEMENT INITIAL
  // ======================================================

  useEffect(() => {
    loadDebts();
  }, []);

  // ======================================================
  // UTILISATEUR
  // ======================================================

  const getUser = async () => {
    const storedPhone =
      localStorage.getItem("phone");

    if (!storedPhone) {
      return null;
    }

    const { data: user, error } =
      await supabase
        .from("users")
        .select("id")
        .eq("phone", storedPhone)
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
  // CHARGER LES DETTES
  // ======================================================

  const loadDebts = async () => {
    setLoadingDebts(true);

    try {
      const user = await getUser();

      if (!user) {
        setDebts([]);
        return;
      }

      const { data, error } =
        await supabase
          .from("debts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        console.log(
          "Erreur chargement dettes :",
          error
        );

        alert(
          "Impossible de charger les dettes."
        );

        return;
      }

      setDebts((data || []) as Debt[]);
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingDebts(false);
    }
  };

  // ======================================================
  // AJOUTER UNE DETTE
  // ======================================================

  const addDebt = async () => {
    if (
      !name.trim() ||
      !phone.trim() ||
      !amount.trim()
    ) {
      alert(
        "Veuillez remplir toutes les informations."
      );

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
      const { error } =
        await supabase
          .from("debts")
          .insert({
            user_id: user.id,
            client_name: name.trim(),
            phone: phone.trim(),
            total_amount: numericAmount,
            paid_amount: 0,
            currency,
            created_at:
              new Date().toISOString(),
          });

      if (error) {
        console.log(error);

        alert(error.message);

        return;
      }

      setName("");
      setPhone("");
      setAmount("");
      setCurrency("FC");
      setShowAddForm(false);

      await loadDebts();

      alert(
        "Dette ajoutée avec succès ✅"
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
  // PAYER UNE DETTE
  // ======================================================

  const payDebt = async () => {
    if (
      !selectedDebt ||
      !paymentAmount.trim()
    ) {
      alert(
        "Sélectionnez une dette et indiquez le montant reçu."
      );

      return;
    }

    const debt = debts.find(
      (d) => d.id === selectedDebt
    );

    if (!debt) {
      alert("Dette introuvable.");
      return;
    }

    const value =
      Number(paymentAmount);

    if (!Number.isFinite(value) || value <= 0) {
      alert("Montant de paiement invalide.");
      return;
    }

    const remaining =
      debt.total_amount -
      debt.paid_amount;

    if (value > remaining) {
      alert(
        "Le montant dépasse le reste à payer."
      );

      return;
    }

    const newPaid =
      debt.paid_amount + value;

    setPaying(true);

    try {
      if (
        newPaid >= debt.total_amount
      ) {
        const { error } =
          await supabase
            .from("debts")
            .delete()
            .eq("id", selectedDebt);

        if (error) {
          console.log(error);

          alert(
            "Impossible de terminer cette dette."
          );

          return;
        }

        alert(
          "Dette entièrement récupérée ✅"
        );
      } else {
        const { error } =
          await supabase
            .from("debts")
            .update({
              paid_amount: newPaid,
            })
            .eq("id", selectedDebt);

        if (error) {
          console.log(error);

          alert(
            "Impossible d'enregistrer le paiement."
          );

          return;
        }

        alert(
          "Paiement enregistré avec succès ✅"
        );
      }

      setPaymentAmount("");
      setSelectedDebt("");
      setSearch("");

      await loadDebts();
    } catch (error) {
      console.log(error);

      alert(
        "Une erreur est survenue lors du paiement."
      );
    } finally {
      setPaying(false);
    }
  };

  // ======================================================
  // DEMANDER LA SUPPRESSION
  // ======================================================

  const deleteDebt = async (id: string) => {
    // Suppression interdite hors connexion
    if (!navigator.onLine) {
      setShowOfflineDeletePopup(true);
      return;
    }

    const debt = debts.find(
      (d) => d.id === id
    );

    if (!debt) {
      alert("Dette introuvable.");
      return;
    }

    // On ouvre le joli popup de confirmation
    setDeleteTarget(debt);
  };

  // ======================================================
  // CONFIRMER LA SUPPRESSION
  // ======================================================

  const confirmDeleteDebt = async () => {
    if (!deleteTarget) {
      return;
    }

    // Nouvelle vérification juste avant
    // la suppression réelle
    if (!navigator.onLine) {
      setDeleteTarget(null);
      setShowOfflineDeletePopup(true);
      return;
    }

    const id = deleteTarget.id;

    setDeleteTarget(null);

    const user = await getUser();

    if (!user) {
      alert("Utilisateur non connecté.");
      return;
    }

    try {
      const { error } =
        await supabase
          .from("debts")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);

      if (error) {
        console.log(error);

        alert(
          "Impossible de supprimer cette dette."
        );

        return;
      }

      if (selectedDebt === id) {
        setSelectedDebt("");
        setSearch("");
        setPaymentAmount("");
      }

      await loadDebts();
    } catch (error) {
      console.log(error);

      alert(
        "Une erreur est survenue lors de la suppression."
      );
    }
  };

  // ======================================================
  // RECHERCHE
  // ======================================================

  const filteredDebts = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    if (!value) {
      return [];
    }

    return debts.filter((debt) => {
      return (
        debt.client_name
          .toLowerCase()
          .includes(value) ||
        (debt.phone || "")
          .toLowerCase()
          .includes(value)
      );
    });
  }, [debts, search]);

  // ======================================================
  // STATISTIQUES
  // ======================================================

  const totalFc = debts
    .filter(
      (d) => d.currency === "FC"
    )
    .reduce(
      (sum, d) =>
        sum +
        (d.total_amount -
          d.paid_amount),
      0
    );

  const totalUsd = debts
    .filter(
      (d) => d.currency === "USD"
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

  const totalPaidFc = debts
    .filter(
      (d) => d.currency === "FC"
    )
    .reduce(
      (sum, d) =>
        sum + d.paid_amount,
      0
    );

  const totalPaidUsd = debts
    .filter(
      (d) => d.currency === "USD"
    )
    .reduce(
      (sum, d) =>
        sum + d.paid_amount,
      0
    );

  // ======================================================
  // DETTES DU JOUR
  // ======================================================

  const todayDebts = debts.filter(
    (debt) =>
      debt.created_at.split("T")[0] ===
      todayStr
  );

  // ======================================================
  // DETTES D'HIER
  // ======================================================

  const yesterdayDebts = debts.filter(
    (debt) =>
      debt.created_at.split("T")[0] ===
      yesterdayStr
  );

  // ======================================================
  // DETTES AFFICHÉES
  // ======================================================

  const visibleDebts = showAll
    ? debts
    : debts.slice(0, 5);

  // ======================================================
  // DETTE SÉLECTIONNÉE
  // ======================================================

  const selectedDebtData =
    selectedDebt
      ? debts.find(
          (d) =>
            d.id === selectedDebt
        )
      : null;

  const selectedRemaining =
    selectedDebtData
      ? selectedDebtData.total_amount -
        selectedDebtData.paid_amount
      : 0;

  // ======================================================
  // AFFICHAGE
  // ======================================================

  return (
    <main className="w-full max-w-full overflow-x-hidden pb-24">
      <div className="mx-auto w-full max-w-6xl space-y-5 px-0 sm:space-y-6">

        {/* ==================================================
            HEADER
        ================================================== */}

        <section
          className="
            w-full
            overflow-hidden
            rounded-3xl
            border
            border-white/10
            bg-white/5
            p-5
            sm:p-6
          "
        >
          <div className="flex min-w-0 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div
                className="
                  shrink-0
                  rounded-2xl
                  bg-orange-500/15
                  p-3
                  sm:p-4
                "
              >
                <Wallet
                  size={30}
                  className="text-orange-400"
                />
              </div>

              <div className="min-w-0">
                <h1
                  className="
                    break-words
                    text-2xl
                    font-black
                    text-white
                    sm:text-3xl
                  "
                >
                  Dettes clients
                </h1>

                <p
                  className="
                    mt-1
                    break-words
                    text-sm
                    leading-6
                    text-slate-400
                  "
                >
                  Gestion des crédits et récupération d'argent
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowGuide(!showGuide)
              }
              className="
                flex
                min-h-[48px]
                shrink-0
                items-center
                justify-center
                gap-2
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
              "
            >
              <Sparkles size={18} />

              <span className="hidden sm:inline">
                Guide
              </span>
            </button>
          </div>
        </section>

        {/* ==================================================
            GUIDE
        ================================================== */}

        {showGuide && (
          <section
            className="
              w-full
              overflow-hidden
              rounded-3xl
              border
              border-white/10
              bg-white/5
              p-5
              sm:p-6
            "
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles
                  size={20}
                  className="text-orange-400"
                />

                <h2 className="font-black text-white">
                  Comment utiliser les dettes ?
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowGuide(false)
                }
                className="
                  rounded-xl
                  bg-black/30
                  p-2
                  text-slate-400
                  transition
                  hover:text-white
                "
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <GuideItem>
                👤 Ajoutez le nom et le numéro du client.
              </GuideItem>

              <GuideItem>
                💰 Indiquez le montant et choisissez FC ou USD.
              </GuideItem>

              <GuideItem>
                💳 Utilisez « Récupérer » lorsque le client paie.
              </GuideItem>

              <GuideItem>
                📊 La barre indique la progression du remboursement.
              </GuideItem>
            </div>
          </section>
        )}

        {/* ==================================================
            STATISTIQUES
        ================================================== */}

        <div
          className="
            grid
            w-full
            grid-cols-2
            gap-3
            sm:gap-4
          "
        >
          <StatCard
            title="Dette FC"
            value={`${formatMoney(totalFc)} FC`}
            icon={
              <Banknote
                size={23}
                className="text-orange-400"
              />
            }
          />

          <StatCard
            title="Dette USD"
            value={`${formatMoney(totalUsd)} $`}
            icon={
              <Banknote
                size={23}
                className="text-orange-400"
              />
            }
          />

          <StatCard
            title="Clients"
            value={String(totalClients)}
            icon={
              <UserPlus
                size={23}
                className="text-orange-400"
              />
            }
          />

          <StatCard
            title="Récupéré"
            value={`${formatMoney(totalPaidFc)} FC`}
            subtitle={`${formatMoney(totalPaidUsd)} $`}
            icon={
              <CheckCircle
                size={23}
                className="text-green-400"
              />
            }
          />
        </div>

        {/* ==================================================
            BOUTON AJOUT MOBILE / TOUS
        ================================================== */}

        {!showAddForm && (
          <button
            type="button"
            onClick={() =>
              setShowAddForm(true)
            }
            className="
              flex
              min-h-[54px]
              w-full
              items-center
              justify-center
              gap-2
              rounded-2xl
              bg-gradient-to-r
              from-orange-500
              to-yellow-400
              px-5
              py-4
              font-black
              text-black
              shadow-lg
              transition
              hover:scale-[1.01]
              active:scale-[0.99]
            "
          >
            <Plus size={21} />
            Ajouter une dette
          </button>
        )}

        {/* ==================================================
            NOUVELLE DETTE
        ================================================== */}

        {showAddForm && (
          <section
            className="
              w-full
              overflow-hidden
              rounded-3xl
              border
              border-white/10
              bg-white/5
              p-5
              sm:p-6
            "
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <div className="rounded-xl bg-orange-500/10 p-2">
                  <Plus
                    size={20}
                    className="text-orange-400"
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="text-xl font-black text-white">
                    Nouvelle dette
                  </h2>

                  <p className="text-xs text-slate-400">
                    Enregistrer une nouvelle dette client
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAddForm(false)
                }
                className="
                  shrink-0
                  rounded-xl
                  bg-black/30
                  p-2
                  text-slate-400
                  transition
                  hover:text-white
                "
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-4">

              {/* NOM */}

              <div>
                <label className={labelStyle}>
                  Nom du client
                </label>

                <input
                  type="text"
                  placeholder="Ex. Jean Kabeya"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  className={inputStyle}
                />
              </div>

              {/* TELEPHONE */}

              <div>
                <label className={labelStyle}>
                  Numéro de téléphone
                </label>

                <div className="relative">
                  <Phone
                    size={18}
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
                    inputMode="tel"
                    placeholder="Ex. 081 000 0000"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value)
                    }
                    className={`
                      ${inputStyle}
                      pl-11
                    `}
                  />
                </div>
              </div>

              {/* MONTANT */}

              <div>
                <label className={labelStyle}>
                  Montant de la dette
                </label>

                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="Ex. 50 000"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value)
                  }
                  className={inputStyle}
                />
              </div>

              {/* DEVISE */}

              <div>
                <label className={labelStyle}>
                  Choisir la monnaie
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrency("FC")
                    }
                    className={`
                      min-h-[52px]
                      rounded-xl
                      border
                      px-4
                      py-3
                      font-black
                      transition
                      ${
                        currency === "FC"
                          ? "border-orange-400 bg-orange-500 text-black"
                          : "border-white/10 bg-black/30 text-white hover:bg-white/10"
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
                      rounded-xl
                      border
                      px-4
                      py-3
                      font-black
                      transition
                      ${
                        currency === "USD"
                          ? "border-orange-400 bg-orange-500 text-black"
                          : "border-white/10 bg-black/30 text-white hover:bg-white/10"
                      }
                    `}
                  >
                    🇺🇸 USD
                  </button>
                </div>
              </div>

              {/* RESUME */}

              {amount &&
                Number(amount) > 0 && (
                  <div
                    className="
                      overflow-hidden
                      rounded-2xl
                      border
                      border-orange-400/20
                      bg-orange-500/10
                      p-4
                    "
                  >
                    <p className="text-xs font-bold text-slate-400">
                      Nouvelle dette
                    </p>

                    <p className="mt-1 break-words text-2xl font-black text-orange-400">
                      {formatMoney(
                        Number(amount)
                      )}{" "}
                      {currency === "USD"
                        ? "$"
                        : "FC"}
                    </p>
                  </div>
                )}

              {/* AJOUTER */}

              <button
                type="button"
                onClick={addDebt}
                disabled={loading}
                className="
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
                  px-5
                  py-4
                  font-black
                  text-black
                  transition
                  hover:scale-[1.01]
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
                    <Plus size={20} />

                    Ajouter la dette
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* ==================================================
            RECUPERATION
        ================================================== */}

        <section
          className="
            w-full
            overflow-hidden
            rounded-3xl
            border
            border-white/10
            bg-white/5
            p-5
            sm:p-6
          "
        >
          <div className="mb-5 flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-xl bg-green-500/10 p-2">
              <CreditCard
                size={21}
                className="text-green-400"
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-xl font-black text-white">
                Récupérer une dette
              </h2>

              <p className="text-xs text-slate-400">
                Enregistrer un paiement client
              </p>
            </div>
          </div>

          {/* RECHERCHE */}

          <div className="relative">
            <Search
              size={19}
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
              type="text"
              placeholder="Nom ou numéro de téléphone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedDebt("");
              }}
              className="
                block
                min-h-[52px]
                w-full
                rounded-xl
                border
                border-white/10
                bg-black/30
                py-4
                pl-11
                pr-11
                text-white
                outline-none
                placeholder:text-slate-500
                focus:border-orange-400
              "
            />

            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedDebt("");
                  setPaymentAmount("");
                }}
                className="
                  absolute
                  right-3
                  top-1/2
                  -translate-y-1/2
                  rounded-lg
                  p-1.5
                  text-slate-500
                  hover:text-white
                "
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* RESULTATS */}

          {search &&
            !selectedDebt && (
              <div
                className="
                  mt-3
                  max-h-72
                  overflow-y-auto
                  rounded-2xl
                  border
                  border-white/10
                  bg-[#111827]
                "
              >
                {filteredDebts.length === 0 ? (
                  <div className="p-5 text-center">
                    <Search
                      size={28}
                      className="mx-auto mb-2 text-slate-500"
                    />

                    <p className="text-sm font-bold text-slate-400">
                      Aucun client trouvé.
                    </p>
                  </div>
                ) : (
                  filteredDebts.map(
                    (debt) => {
                      const remaining =
                        debt.total_amount -
                        debt.paid_amount;

                      return (
                        <button
                          type="button"
                          key={debt.id}
                          onClick={() => {
                            setSelectedDebt(
                              debt.id
                            );

                            setSearch(
                              debt.client_name
                            );
                          }}
                          className="
                            flex
                            w-full
                            min-w-0
                            items-center
                            justify-between
                            gap-3
                            border-b
                            border-white/10
                            p-4
                            text-left
                            transition
                            last:border-0
                            hover:bg-white/5
                          "
                        >
                          <div className="min-w-0">
                            <p className="truncate font-bold text-white">
                              {debt.client_name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {debt.phone}
                            </p>
                          </div>

                          <p className="shrink-0 text-sm font-black text-orange-400">
                            {formatMoney(
                              remaining
                            )}{" "}
                            {debt.currency ===
                            "USD"
                              ? "$"
                              : "FC"}
                          </p>
                        </button>
                      );
                    }
                  )
                )}
              </div>
            )}

          {/* DETTE SELECTIONNEE */}

          {selectedDebtData && (
            <div
              className="
                mt-4
                overflow-hidden
                rounded-2xl
                border
                border-orange-400/20
                bg-orange-500/10
                p-4
              "
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Client sélectionné
                  </p>

                  <p className="mt-1 break-words text-lg font-black text-white">
                    {selectedDebtData.client_name}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    📞 {selectedDebtData.phone}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedDebt("");
                    setSearch("");
                    setPaymentAmount("");
                  }}
                  className="
                    shrink-0
                    rounded-xl
                    bg-black/30
                    p-2
                    text-slate-400
                    hover:text-white
                  "
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-xs text-slate-500">
                    Dette totale
                  </p>

                  <p className="mt-1 font-black text-white">
                    {formatMoney(
                      selectedDebtData.total_amount
                    )}{" "}
                    {selectedDebtData.currency ===
                    "USD"
                      ? "$"
                      : "FC"}
                  </p>
                </div>

                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-xs text-slate-500">
                    Reste à payer
                  </p>

                  <p className="mt-1 font-black text-orange-400">
                    {formatMoney(
                      selectedRemaining
                    )}{" "}
                    {selectedDebtData.currency ===
                    "USD"
                      ? "$"
                      : "FC"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* MONTANT PAIEMENT */}

          <div className="mt-4">
            <label className={labelStyle}>
              Montant reçu
            </label>

            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder={
                selectedDebtData
                  ? `Maximum ${formatMoney(
                      selectedRemaining
                    )}`
                  : "Montant reçu"
              }
              value={paymentAmount}
              onChange={(e) =>
                setPaymentAmount(
                  e.target.value
                )
              }
              className={inputStyle}
            />
          </div>

          {/* PAYER */}

          <button
            type="button"
            onClick={payDebt}
            disabled={
              paying ||
              !selectedDebt ||
              !paymentAmount
            }
            className="
              mt-4
              flex
              min-h-[52px]
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-green-500
              px-5
              py-4
              font-black
              text-black
              transition
              hover:bg-green-400
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {paying ? (
              <>
                <RefreshCw
                  size={19}
                  className="animate-spin"
                />

                Enregistrement...
              </>
            ) : (
              <>
                <CheckCircle size={19} />

                Valider le paiement
              </>
            )}
          </button>
        </section>

        {/* ==================================================
            HISTORIQUE
        ================================================== */}

        <section
          className="
            w-full
            overflow-hidden
            rounded-3xl
            border
            border-white/10
            bg-white/5
            p-5
            sm:p-6
          "
        >
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 rounded-xl bg-orange-500/10 p-2">
                <Wallet
                  size={21}
                  className="text-orange-400"
                />
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-black text-white">
                  Historique des dettes
                </h2>

                <p className="text-xs text-slate-400">
                  Dettes enregistrées dans votre commerce
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
              {debts.length}
            </span>
          </div>

          {loadingDebts ? (
            <div className="flex items-center justify-center py-10">
              <RefreshCw
                size={27}
                className="animate-spin text-orange-400"
              />
            </div>
          ) : (
            <>
              {/* AUJOURD'HUI / HIER */}

              {!showAll && (
                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <DebtList
                    title="Aujourd'hui"
                    data={todayDebts}
                    onDelete={deleteDebt}
                  />

                  <DebtList
                    title="Hier"
                    data={yesterdayDebts}
                    onDelete={deleteDebt}
                  />
                </div>
              )}

              {/* HISTORIQUE COMPLET */}

              {showAll && (
                <div className="mt-5">
                  {visibleDebts.length === 0 ? (
                    <EmptyDebts />
                  ) : (
                    <div className="space-y-3">
                      {visibleDebts.map(
                        (debt) => (
                          <DebtRow
                            key={debt.id}
                            debt={debt}
                            onDelete={
                              deleteDebt
                            }
                          />
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* BOUTON VOIR TOUT */}

              {debts.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setShowAll(!showAll)
                  }
                  className="
                    mt-5
                    flex
                    min-h-[48px]
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-orange-400/20
                    bg-orange-500/10
                    py-3
                    text-sm
                    font-black
                    text-orange-400
                    transition
                    hover:bg-orange-500/20
                  "
                >
                  {showAll ? (
                    <>
                      <ChevronUp size={18} />
                      Réduire l'historique
                    </>
                  ) : (
                    <>
                      <ChevronDown size={18} />
                      Voir toutes les dettes
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </section>
      </div>

      {/* ==================================================
          POPUP CONFIRMATION SUPPRESSION
      ================================================== */}

      {deleteTarget && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-black/70
            p-4
            backdrop-blur-sm
          "
          onClick={() =>
            setDeleteTarget(null)
          }
        >
          <div
            className="
              w-full
              max-w-md
              overflow-hidden
              rounded-3xl
              border
              border-white/10
              bg-[#111827]
              p-6
              shadow-2xl
            "
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="flex justify-center">
              <div
                className="
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  bg-red-500/10
                "
              >
                <Trash2
                  size={30}
                  className="text-red-400"
                />
              </div>
            </div>

            <div className="mt-5 text-center">
              <h3 className="text-xl font-black text-white">
                Supprimer cette dette ?
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Voulez-vous vraiment supprimer la dette de{" "}
                <span className="font-black text-white">
                  {deleteTarget.client_name}
                </span>{" "}
                ?
              </p>

              <div
                className="
                  mt-4
                  rounded-2xl
                  border
                  border-red-400/10
                  bg-red-500/5
                  p-4
                "
              >
                <p className="text-sm font-black text-red-400">
                  Cette action est irréversible.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(null)
                }
                className="
                  min-h-[52px]
                  rounded-xl
                  border
                  border-white/10
                  bg-white/5
                  px-4
                  py-3
                  text-sm
                  font-black
                  text-white
                  transition
                  hover:bg-white/10
                "
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={confirmDeleteDebt}
                className="
                  flex
                  min-h-[52px]
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-red-600
                  px-4
                  py-3
                  text-sm
                  font-black
                  text-white
                  transition
                  hover:bg-red-500
                  active:scale-[0.98]
                "
              >
                <Trash2 size={18} />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          POPUP CONNEXION REQUISE
      ================================================== */}

      {showOfflineDeletePopup && (
        <div
          className="
            fixed
            inset-0
            z-[110]
            flex
            items-center
            justify-center
            bg-black/70
            p-4
            backdrop-blur-sm
          "
          onClick={() =>
            setShowOfflineDeletePopup(false)
          }
        >
          <div
            className="
              w-full
              max-w-md
              overflow-hidden
              rounded-3xl
              border
              border-white/10
              bg-[#111827]
              p-6
              shadow-2xl
            "
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="flex justify-center">
              <div
                className="
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  bg-orange-500/10
                "
              >
                <RefreshCw
                  size={30}
                  className="text-orange-400"
                />
              </div>
            </div>

            <div className="mt-5 text-center">
              <h3 className="text-xl font-black text-white">
                Connexion requise
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Vous devez être connecté à Internet
                pour supprimer une dette.
              </p>

              <div
                className="
                  mt-4
                  rounded-2xl
                  border
                  border-orange-400/10
                  bg-orange-500/5
                  p-4
                "
              >
                <p className="text-sm font-bold text-orange-400">
                  La dette n'a pas été supprimée.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowOfflineDeletePopup(false)
              }
              className="
                mt-6
                min-h-[52px]
                w-full
                rounded-xl
                bg-orange-500
                px-5
                py-3
                font-black
                text-black
                transition
                hover:bg-orange-400
                active:scale-[0.98]
              "
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// ======================================================
// STYLES
// ======================================================

const inputStyle = `
  block
  min-h-[52px]
  w-full
  max-w-full
  rounded-xl
  border
  border-white/10
  bg-black/30
  p-4
  text-white
  outline-none
  placeholder:text-slate-500
  focus:border-orange-400
  transition
`;

const labelStyle = `
  mb-2
  block
  text-xs
  font-bold
  text-slate-400
`;

// ======================================================
// GUIDE ITEM
// ======================================================

function GuideItem({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-white/10
        bg-black/20
        p-4
        text-sm
        leading-6
        text-slate-300
      "
    >
      {children}
    </div>
  );
}

// ======================================================
// CARTE STATISTIQUE
// ======================================================

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle?: string;
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
        bg-white/5
        p-4
        sm:p-5
      "
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-sm font-bold text-slate-400">
            {title}
          </p>

          <p className="mt-2 break-words text-lg font-black text-white sm:text-2xl">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1 break-words text-xs font-bold text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        <div
          className="
            shrink-0
            rounded-2xl
            bg-orange-500/10
            p-2.5
            sm:p-3
          "
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

// ======================================================
// LISTE DETTES
// ======================================================

function DebtList({
  title,
  data,
  onDelete,
}: {
  title: string;
  data: Debt[];
  onDelete: (id: string) => void;
}) {
  const [showAll, setShowAll] =
    useState(false);

  const visible =
    showAll
      ? data
      : data.slice(0, 5);

  return (
    <div
      className="
        min-w-0
        overflow-hidden
        rounded-3xl
        border
        border-white/10
        bg-black/10
        p-5
      "
    >
      <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
        <h3 className="text-lg font-black text-orange-400">
          {title}
        </h3>

        <span
          className="
            shrink-0
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
            size={28}
            className="mx-auto mb-3 text-slate-500"
          />

          <p className="text-sm font-bold text-slate-400">
            Aucune dette.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            {visible.map((debt) => (
              <DebtRow
                key={debt.id}
                debt={debt}
                onDelete={onDelete}
                compact
              />
            ))}
          </div>

          {data.length > 5 && (
            <button
              type="button"
              onClick={() =>
                setShowAll(!showAll)
              }
              className="
                mt-3
                flex
                min-h-[46px]
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-orange-400/20
                bg-orange-500/10
                py-3
                text-xs
                font-black
                text-orange-400
                transition
                hover:bg-orange-500/20
              "
            >
              {showAll ? (
                <>
                  <ChevronUp size={16} />
                  Afficher moins
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  Voir les {data.length} dettes
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ======================================================
// LIGNE DETTE
// ======================================================

function DebtRow({
  debt,
  onDelete,
  compact = false,
}: {
  debt: Debt;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  const remaining =
    debt.total_amount -
    debt.paid_amount;

  const percent =
    debt.total_amount > 0
      ? Math.min(
          100,
          Math.round(
            (debt.paid_amount /
              debt.total_amount) *
              100
          )
        )
      : 0;

  return (
    <div
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
            : "rounded-2xl border border-white/10 bg-black/20 p-4"
        }
      `}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words font-black text-white">
            {debt.client_name}
          </p>

          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
            <Phone
              size={13}
              className="shrink-0"
            />

            <span className="truncate">
              {debt.phone}
            </span>
          </div>

          {!compact && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarDays
                size={13}
                className="shrink-0"
              />

              <span>
                {formatDate(
                  debt.created_at
                )}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            onDelete(debt.id)
          }
          className="
            shrink-0
            rounded-xl
            bg-red-600
            p-2.5
            text-white
            transition
            hover:bg-red-500
            active:scale-95
          "
          title="Supprimer cette dette"
          aria-label="Supprimer cette dette"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div
        className="
          mt-3
          grid
          grid-cols-2
          gap-2
        "
      >
        <div className="min-w-0 rounded-xl bg-white/5 p-3">
          <p className="text-[11px] text-slate-500">
            Dette totale
          </p>

          <p className="mt-1 break-words text-sm font-black text-white">
            {formatMoney(
              debt.total_amount
            )}{" "}
            {debt.currency ===
            "USD"
              ? "$"
              : "FC"}
          </p>
        </div>

        <div className="min-w-0 rounded-xl bg-orange-500/5 p-3">
          <p className="text-[11px] text-slate-500">
            Reste
          </p>

          <p className="mt-1 break-words text-sm font-black text-orange-400">
            {formatMoney(
              remaining
            )}{" "}
            {debt.currency ===
            "USD"
              ? "$"
              : "FC"}
          </p>
        </div>
      </div>

      {/* PROGRESSION */}

      <div className="mt-3">
        <div
          className="
            h-2.5
            w-full
            overflow-hidden
            rounded-full
            bg-black/50
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

        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-green-400">
            Récupéré : {percent}%
          </p>

          <p className="text-xs text-slate-500">
            {formatMoney(
              debt.paid_amount
            )}{" "}
            récupéré
          </p>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// AUCUNE DETTE
// ======================================================

function EmptyDebts() {
  return (
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
      <Wallet
        size={35}
        className="mx-auto mb-3 text-slate-500"
      />

      <p className="font-bold text-slate-300">
        Aucune dette enregistrée.
      </p>

      <p className="mt-1 text-xs text-slate-500">
        Les dettes ajoutées apparaîtront ici.
      </p>
    </div>
  );
}