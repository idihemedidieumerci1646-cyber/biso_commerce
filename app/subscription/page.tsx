"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Crown,
  LockKeyhole,
  MessageCircle,
  Phone,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  User,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";

/* ================================================================
   TYPES
================================================================ */

type SubscriptionStatus = "active" | "expired" | "pending";

type CachedSubscription = {
  id: string | null;
  user_id: string;
  full_name: string;
  phone: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  status: string;
  created_at: string | null;
  saved_at: string;
};

type CachedUser = {
  id: string;
  full_name: string;
  phone: string;
  saved_at: string;
};

type UserRecord = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
};

/* ================================================================
   CONSTANTES
================================================================ */

const SUBSCRIPTION_CACHE_PREFIX = "biso-subscription-cache-";
const USER_CACHE_PREFIX = "biso-subscription-user-";

const WHATSAPP_NUMBER = "243994864173";

const PLAN_PRICE = 5;
const PLAN_DAYS = 30;

/* ================================================================
   CACHE KEYS
================================================================ */

function getSubscriptionCacheKey(userId: string) {
  return `${SUBSCRIPTION_CACHE_PREFIX}${userId}`;
}

function getUserCacheKey(userId: string) {
  return `${USER_CACHE_PREFIX}${userId}`;
}

/* ================================================================
   CACHE ABONNEMENT
================================================================ */

function saveSubscriptionCache(
  userId: string,
  subscription: CachedSubscription
) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      getSubscriptionCacheKey(userId),
      JSON.stringify(subscription)
    );
  } catch (error) {
    console.error(
      "Erreur sauvegarde abonnement local :",
      error
    );
  }
}

function getSubscriptionCache(
  userId: string
): CachedSubscription | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(
      getSubscriptionCacheKey(userId)
    );

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed as CachedSubscription;
  } catch (error) {
    console.error(
      "Erreur lecture abonnement local :",
      error
    );

    return null;
  }
}

/* ================================================================
   CACHE UTILISATEUR
================================================================ */

function saveUserCache(
  userId: string,
  fullName: string,
  phone: string
) {
  if (typeof window === "undefined") return;

  try {
    const user: CachedUser = {
      id: userId,
      full_name: fullName,
      phone,
      saved_at: new Date().toISOString(),
    };

    localStorage.setItem(
      getUserCacheKey(userId),
      JSON.stringify(user)
    );
  } catch (error) {
    console.error(
      "Erreur cache utilisateur :",
      error
    );
  }
}

function getUserCache(
  userId: string
): CachedUser | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(
      getUserCacheKey(userId)
    );

    if (!raw) return null;

    return JSON.parse(raw) as CachedUser;
  } catch {
    return null;
  }
}

/* ================================================================
   CALCUL DES 30 JOURS
================================================================ */

function calculateUsage(
  startDate: string | null,
  endDate: string | null
) {
  if (!startDate) {
    return {
      daysUsed: 0,
      daysLeft: PLAN_DAYS,
      expired: false,
    };
  }

  const start = new Date(startDate);

  if (Number.isNaN(start.getTime())) {
    return {
      daysUsed: 0,
      daysLeft: PLAN_DAYS,
      expired: false,
    };
  }

  const now = new Date();

  const end = endDate
    ? new Date(endDate)
    : new Date(
        start.getTime() +
          PLAN_DAYS *
            24 *
            60 *
            60 *
            1000
      );

  const difference =
    now.getTime() - start.getTime();

  let daysUsed = Math.floor(
    difference /
      (1000 * 60 * 60 * 24)
  );

  daysUsed = Math.max(
    0,
    Math.min(PLAN_DAYS, daysUsed)
  );

  const daysLeft = Math.max(
    0,
    PLAN_DAYS - daysUsed
  );

  const expired =
    end.getTime() <= now.getTime() ||
    daysLeft <= 0;

  return {
    daysUsed,
    daysLeft,
    expired,
  };
}

/* ================================================================
   PAGE
================================================================ */

export default function SubscriptionPage() {
  /* ==============================================================
     STATES
  ============================================================== */

  const [subscription, setSubscription] =
    useState<CachedSubscription | null>(null);

  const [daysUsed, setDaysUsed] =
    useState(0);

  const [daysLeft, setDaysLeft] =
    useState(PLAN_DAYS);

  const [status, setStatus] =
    useState<SubscriptionStatus>("active");

  const [fullName, setFullName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [loadingSubscription, setLoadingSubscription] =
    useState(true);

  const [isOnline, setIsOnline] =
    useState(true);

  /* ==============================================================
     APPLIQUER UN ABONNEMENT
  ============================================================== */

  const applySubscriptionLocally = useCallback(
    (data: CachedSubscription) => {
      setSubscription(data);

      if (data.full_name) {
        setFullName(data.full_name);
      }

      if (data.phone) {
        setPhone(data.phone);
      }

      const usage = calculateUsage(
        data.start_date,
        data.end_date
      );

      setDaysUsed(usage.daysUsed);
      setDaysLeft(usage.daysLeft);

      if (data.status === "pending") {
        setStatus("pending");
        return;
      }

      const isActive =
        data.is_active === true &&
        !usage.expired;

      setStatus(
        isActive ? "active" : "expired"
      );
    },
    []
  );

  /* ==============================================================
     CHARGER L'ABONNEMENT
  ============================================================== */

  const loadSubscription = useCallback(
    async () => {
      if (typeof window === "undefined") {
        return;
      }

      setLoadingSubscription(true);

      try {
        const phoneStorage =
          localStorage.getItem("phone");

        let userId =
          localStorage.getItem("user_id");

        /* ========================================================
           HORS CONNEXION
        ======================================================== */

        if (!navigator.onLine) {
          setIsOnline(false);

          if (userId) {
            const cachedSubscription =
              getSubscriptionCache(userId);

            if (cachedSubscription) {
              applySubscriptionLocally(
                cachedSubscription
              );

              setLoadingSubscription(false);
              return;
            }

            const cachedUser =
              getUserCache(userId);

            if (cachedUser) {
              setFullName(
                cachedUser.full_name
              );

              setPhone(
                cachedUser.phone
              );
            }
          }

          setLoadingSubscription(false);
          return;
        }

        /* ========================================================
           EN LIGNE
        ======================================================== */

        setIsOnline(true);

        if (!phoneStorage && !userId) {
          setStatus("expired");
          setLoadingSubscription(false);
          return;
        }

        let user: UserRecord | null =
          null;

        /* ========================================================
           RECHERCHE PAR USER ID
        ======================================================== */

        if (userId) {
          const {
            data,
            error,
          } = await supabase
            .from("users")
            .select(
              "id, full_name, phone"
            )
            .eq("id", userId)
            .maybeSingle();

          if (error) {
            console.error(
              "Erreur recherche utilisateur par ID :",
              error
            );
          }

          if (data) {
            user = data;
          }
        }

        /* ========================================================
           RECHERCHE PAR TELEPHONE
        ======================================================== */

        if (!user && phoneStorage) {
          const {
            data,
            error,
          } = await supabase
            .from("users")
            .select(
              "id, full_name, phone"
            )
            .eq("phone", phoneStorage)
            .maybeSingle();

          if (error) {
            console.error(
              "Erreur recherche utilisateur par téléphone :",
              error
            );
          }

          if (data) {
            user = data;
          }
        }

        /* ========================================================
           UTILISATEUR INTROUVABLE
        ======================================================== */

        if (!user) {
          if (userId) {
            const cached =
              getSubscriptionCache(userId);

            if (cached) {
              applySubscriptionLocally(
                cached
              );

              setLoadingSubscription(false);
              return;
            }
          }

          setStatus("expired");
          setLoadingSubscription(false);
          return;
        }

        /* ========================================================
           IDENTITE UTILISATEUR
        ======================================================== */

        userId = String(user.id);

        localStorage.setItem(
          "user_id",
          userId
        );

        const resolvedName =
          user.full_name ||
          fullName ||
          "";

        const resolvedPhone =
          user.phone ||
          phoneStorage ||
          phone ||
          "";

        setFullName(resolvedName);
        setPhone(resolvedPhone);

        saveUserCache(
          userId,
          resolvedName,
          resolvedPhone
        );

        /* ========================================================
           CHERCHER L'ABONNEMENT
        ======================================================== */

        const {
          data,
          error,
        } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        /* ========================================================
           ERREUR SUPABASE
        ======================================================== */

        if (error) {
          console.error(
            "Erreur chargement abonnement :",
            error
          );

          const cached =
            getSubscriptionCache(userId);

          if (cached) {
            applySubscriptionLocally(
              cached
            );

            setLoadingSubscription(false);
            return;
          }

          setStatus("expired");
          setLoadingSubscription(false);
          return;
        }

        /* ========================================================
           AUCUN ABONNEMENT
        ======================================================== */

        if (!data) {
          setSubscription(null);
          setStatus("expired");
          setDaysUsed(PLAN_DAYS);
          setDaysLeft(0);
          setLoadingSubscription(false);
          return;
        }

        /* ========================================================
           NORMALISATION
        ======================================================== */

        const normalized: CachedSubscription = {
          id: data.id
            ? String(data.id)
            : null,

          user_id: userId,

          full_name:
            data.full_name ||
            resolvedName,

          phone:
            data.phone ||
            resolvedPhone,

          start_date:
            data.start_date ||
            null,

          end_date:
            data.end_date ||
            null,

          is_active:
            data.is_active === true,

          status:
            data.status || "",

          created_at:
            data.created_at ||
            null,

          saved_at:
            new Date().toISOString(),
        };

        /* ========================================================
           SAUVEGARDER LE CACHE
        ======================================================== */

        saveSubscriptionCache(
          userId,
          normalized
        );

        /* ========================================================
           AFFICHER
        ======================================================== */

        applySubscriptionLocally(
          normalized
        );
      } catch (error) {
        console.error(
          "Erreur générale abonnement :",
          error
        );

        const userId =
          localStorage.getItem("user_id");

        if (userId) {
          const cached =
            getSubscriptionCache(userId);

          if (cached) {
            applySubscriptionLocally(
              cached
            );

            setLoadingSubscription(false);
            return;
          }
        }

        setStatus("expired");
      } finally {
        setLoadingSubscription(false);
      }
    },
    [
      applySubscriptionLocally,
      fullName,
      phone,
    ]
  );

  /* ==============================================================
     INITIALISATION
  ============================================================== */

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  /* ==============================================================
     INTERNET
  ============================================================== */

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateOnlineStatus = () => {
      const online = navigator.onLine;

      setIsOnline(online);

      if (online) {
        window.setTimeout(() => {
          void loadSubscription();
        }, 300);
      } else {
        const userId =
          localStorage.getItem("user_id");

        if (userId) {
          const cached =
            getSubscriptionCache(userId);

          if (cached) {
            applySubscriptionLocally(
              cached
            );
          }
        }
      }
    };

    setIsOnline(navigator.onLine);

    window.addEventListener(
      "online",
      updateOnlineStatus
    );

    window.addEventListener(
      "offline",
      updateOnlineStatus
    );

    return () => {
      window.removeEventListener(
        "online",
        updateOnlineStatus
      );

      window.removeEventListener(
        "offline",
        updateOnlineStatus
      );
    };
  }, [
    applySubscriptionLocally,
    loadSubscription,
  ]);

  /* ==============================================================
     MISE À JOUR DU COMPTEUR
  ============================================================== */

  useEffect(() => {
    if (!subscription) {
      return;
    }

    const updateCounter = () => {
      const usage = calculateUsage(
        subscription.start_date,
        subscription.end_date
      );

      setDaysUsed(usage.daysUsed);
      setDaysLeft(usage.daysLeft);

      if (
        subscription.status ===
        "pending"
      ) {
        setStatus("pending");
        return;
      }

      setStatus(
        subscription.is_active &&
          !usage.expired
          ? "active"
          : "expired"
      );
    };

    updateCounter();

    const timer =
      window.setInterval(
        updateCounter,
        60 * 1000
      );

    return () => {
      window.clearInterval(timer);
    };
  }, [subscription]);

  /* ==============================================================
     WHATSAPP
  ============================================================== */

  const openWhatsApp = useCallback(
    (message: string) => {
      const url =
        `https://wa.me/${WHATSAPP_NUMBER}?text=` +
        encodeURIComponent(message);

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    },
    []
  );

  /* ==============================================================
     RENOUVELLEMENT
  ============================================================== */

  const handleRenew = async () => {
    if (!fullName.trim()) {
      alert(
        "Veuillez remplir votre nom."
      );
      return;
    }

    if (!phone.trim()) {
      alert(
        "Veuillez remplir votre numéro de téléphone."
      );
      return;
    }

    if (!navigator.onLine) {
      alert(
        "Vous êtes hors connexion. Connectez-vous à Internet pour envoyer la demande."
      );
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const phoneStorage =
        localStorage.getItem("phone");

      let userId =
        localStorage.getItem("user_id");

      if (!phoneStorage && !userId) {
        alert(
          "Votre session utilisateur est introuvable."
        );
        return;
      }

      /* ========================================================
         RECUPERER USER ID
      ======================================================== */

      if (!userId && phoneStorage) {
        const {
          data: user,
          error,
        } = await supabase
          .from("users")
          .select("id")
          .eq("phone", phoneStorage)
          .maybeSingle();

        if (error) {
          console.error(
            "Erreur récupération utilisateur :",
            error
          );

          alert(
            "Impossible de récupérer votre compte."
          );

          return;
        }

        if (!user) {
          alert(
            "Utilisateur introuvable."
          );

          return;
        }

        userId = String(user.id);

        localStorage.setItem(
          "user_id",
          userId
        );
      }

      if (!userId) {
        alert(
          "Utilisateur non identifié."
        );
        return;
      }

      /* ========================================================
         RECUPERER ID ABONNEMENT
      ======================================================== */

      let subscriptionId =
        subscription?.id || null;

      if (!subscriptionId) {
        const {
          data,
          error,
        } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error(
            "Erreur recherche abonnement :",
            error
          );

          alert(
            "Impossible de retrouver votre abonnement."
          );

          return;
        }

        if (data?.id) {
          subscriptionId =
            String(data.id);
        }
      }

      if (!subscriptionId) {
        alert(
          "Aucun abonnement trouvé pour votre compte."
        );

        return;
      }

      /* ========================================================
         METTRE EN PENDING
      ======================================================== */

      const {
        data: updatedSubscription,
        error: updateError,
      } = await supabase
        .from("subscriptions")
        .update({
          full_name:
            fullName.trim(),

          phone:
            phone.trim(),

          status:
            "pending",

          user_id:
            userId,
        })
        .eq("id", subscriptionId)
        .eq("user_id", userId)
        .select("*")
        .maybeSingle();

      if (updateError) {
        console.error(
          "Erreur mise à jour abonnement :",
          updateError
        );

        alert(
          "Une erreur est survenue lors de l'envoi de la demande."
        );

        return;
      }

      /* ========================================================
         CACHE IMMEDIAT
      ======================================================== */

      const updatedLocal: CachedSubscription = {
        id: subscriptionId,

        user_id: userId,

        full_name:
          fullName.trim(),

        phone:
          phone.trim(),

        start_date:
          updatedSubscription?.start_date ||
          subscription?.start_date ||
          null,

        end_date:
          updatedSubscription?.end_date ||
          subscription?.end_date ||
          null,

        is_active:
          updatedSubscription?.is_active ??
          subscription?.is_active ??
          false,

        status: "pending",

        created_at:
          updatedSubscription?.created_at ||
          subscription?.created_at ||
          null,

        saved_at:
          new Date().toISOString(),
      };

      saveSubscriptionCache(
        userId,
        updatedLocal
      );

      setSubscription(
        updatedLocal
      );

      setStatus("pending");

      setShowConfirmation(true);
    } catch (error) {
      console.error(
        "Erreur renouvellement :",
        error
      );

      alert(
        "Une erreur inattendue est survenue."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ==============================================================
     POURCENTAGE
  ============================================================== */

  const usagePercentage = useMemo(() => {
    return Math.min(
      100,
      Math.max(
        0,
        (daysUsed / PLAN_DAYS) * 100
      )
    );
  }, [daysUsed]);

  /* ==============================================================
     CONFIGURATION STATUT
  ============================================================== */

  const statusConfig = useMemo(() => {
    if (status === "active") {
      return {
        label: "Actif",
        description:
          "Votre abonnement est actuellement actif.",
        icon: CheckCircle2,
        iconClass:
          "text-emerald-600",
        boxClass:
          "border-emerald-100 bg-emerald-50",
        badgeClass:
          "border-emerald-100 bg-emerald-50 text-emerald-700",
        dotClass:
          "bg-emerald-500",
      };
    }

    if (status === "pending") {
      return {
        label: "En vérification",
        description:
          "Votre paiement est en cours de vérification.",
        icon: Clock3,
        iconClass:
          "text-amber-600",
        boxClass:
          "border-amber-100 bg-amber-50",
        badgeClass:
          "border-amber-100 bg-amber-50 text-amber-700",
        dotClass:
          "bg-amber-500",
      };
    }

    return {
      label: "Expiré",
      description:
        "Votre abonnement doit être renouvelé.",
      icon: ShieldCheck,
      iconClass:
        "text-slate-500",
      boxClass:
        "border-slate-200 bg-slate-50",
      badgeClass:
        "border-slate-200 bg-slate-100 text-slate-600",
      dotClass:
        "bg-slate-400",
    };
  }, [status]);

  const StatusIcon =
    statusConfig.icon;

  /* ==============================================================
     CHARGEMENT
  ============================================================== */

  if (loadingSubscription) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
        <div className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50">
              <RefreshCw
                size={21}
                className="animate-spin text-indigo-600"
              />
            </div>

            <div>
              <p className="font-black text-slate-900">
                Biso-Commerce
              </p>

              <p className="mt-1 text-xs font-medium text-slate-500">
                Chargement de votre espace...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ==============================================================
     JSX
  ============================================================== */

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-3 py-4 text-slate-900 sm:px-5 sm:py-7">
      <div className="mx-auto w-full max-w-2xl space-y-4">

        {/* ========================================================
            HEADER
        ======================================================== */}

        <section className="overflow-hidden rounded-[28px] bg-white shadow-[0_15px_50px_rgba(15,23,42,0.07)]">
          <div className="relative overflow-hidden bg-indigo-600 px-5 py-6 sm:px-7 sm:py-7">

            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/10" />

            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-white/5" />

            <div className="relative flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3.5">
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
                  <Crown
                    size={26}
                    className="text-white"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-100">
                    Espace abonnement
                  </p>

                  <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-white">
                    Biso-Commerce
                  </h1>

                  <p className="mt-1 text-xs font-medium text-indigo-100">
                    Votre abonnement en toute simplicité.
                  </p>
                </div>
              </div>

              <div className="hidden shrink-0 rounded-2xl bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/15 sm:block">
                <p className="text-[9px] font-black uppercase tracking-wider text-indigo-100">
                  Plan
                </p>

                <p className="mt-0.5 text-sm font-black text-white">
                  Mensuel
                </p>
              </div>
            </div>

            <div className="relative mt-5">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-black ${
                  isOnline
                    ? "border-emerald-200/20 bg-emerald-400/15 text-emerald-50"
                    : "border-amber-200/20 bg-amber-400/15 text-amber-50"
                }`}
              >
                {isOnline ? (
                  <>
                    <Wifi size={13} />
                    Connexion active
                  </>
                ) : (
                  <>
                    <WifiOff size={13} />
                    Mode hors connexion
                  </>
                )}
              </span>
            </div>
          </div>

          {/* PLAN */}

          <div className="p-4 sm:p-5">
            <div className="rounded-[22px] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-white p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-indigo-100">
                    <Zap
                      size={19}
                      className="text-indigo-600"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                      Abonnement mensuel
                    </p>

                    <p className="mt-1 truncate text-sm font-black text-slate-900 sm:text-base">
                      Gestion complète du commerce
                    </p>

                    <p className="mt-1 text-[11px] font-medium text-slate-500">
                      Stock • ventes • dettes • bénéfices
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-3xl font-black tracking-tight text-indigo-600 sm:text-4xl">
                    {PLAN_PRICE}$
                  </span>

                  <span className="block text-[10px] font-bold text-slate-500">
                    / mois
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            STATUT
        ======================================================== */}

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.05)] sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Statut de l'abonnement
              </p>

              <h2 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900">
                {statusConfig.label}
              </h2>

              <p className="mt-1 max-w-md text-xs font-medium leading-5 text-slate-500">
                {statusConfig.description}
              </p>

              <span
                className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black ${statusConfig.badgeClass}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotClass}`}
                />

                {status === "active"
                  ? "Abonnement actif"
                  : status === "pending"
                  ? "Paiement en vérification"
                  : "Abonnement expiré"}
              </span>
            </div>

            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${statusConfig.boxClass}`}
            >
              <StatusIcon
                size={24}
                className={
                  statusConfig.iconClass
                }
              />
            </div>
          </div>

          {/* PROGRESSION */}

          <div className="mt-5 rounded-[20px] border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays
                  size={16}
                  className="text-indigo-600"
                />

                <span className="text-[11px] font-black text-slate-700">
                  Période d'utilisation
                </span>
              </div>

              <span className="text-[11px] font-black text-indigo-600">
                {daysLeft} jour
                {daysLeft > 1 ? "s" : ""} restant
                {daysLeft > 1 ? "s" : ""}
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  status === "active"
                    ? "bg-indigo-600"
                    : status === "pending"
                    ? "bg-amber-500"
                    : "bg-slate-400"
                }`}
                style={{
                  width: `${usagePercentage}%`,
                }}
              />
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span>
                {daysUsed} jour
                {daysUsed > 1 ? "s" : ""} utilisé
                {daysUsed > 1 ? "s" : ""}
              </span>

              <span>
                {PLAN_DAYS} jours
              </span>
            </div>
          </div>

          {/* OFFLINE */}

          {!isOnline && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <WifiOff
                  size={16}
                  className="text-amber-600"
                />
              </div>

              <div>
                <p className="text-[11px] font-black text-amber-900">
                  Vous êtes hors connexion
                </p>

                <p className="mt-1 text-[10px] font-medium leading-5 text-amber-700">
                  Les informations déjà enregistrées
                  restent disponibles. Le renouvellement
                  nécessite une connexion Internet.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================
            COMMENT PAYER
        ======================================================== */}

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.05)] sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50">
              <CreditCard
                size={19}
                className="text-indigo-600"
              />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                Comment payer ?
              </h3>

              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                Suivez les étapes ci-dessous.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2.5">
            {[
              "Envoyez 5$ par Mobile Money.",
              "Gardez votre preuve de paiement.",
              "Remplissez votre nom et votre numéro.",
              "Envoyez la capture sur WhatsApp.",
              "Attendez la validation de l'administration.",
            ].map((text, index) => (
              <div
                key={text}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 transition hover:border-indigo-100 hover:bg-indigo-50/40"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-[11px] font-black text-white">
                  {index + 1}
                </div>

                <p className="text-xs font-semibold leading-5 text-slate-700">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ========================================================
            MOYENS DE PAIEMENT
        ======================================================== */}

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.05)] sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50">
              <Smartphone
                size={19}
                className="text-indigo-600"
              />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                Moyens de paiement
              </h3>

              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                Choisissez votre Mobile Money.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">

            {/* AIRTEL */}

            <PaymentMethod
              letter="A"
              name="Airtel Money"
              owner="DIEUMERCI IDI"
              number="+243 994 864 173"
              network="Airtel"
              letterClass="text-red-500"
            />

            {/* ORANGE */}

            <PaymentMethod
              letter="O"
              name="Orange Money"
              owner="DIEUMERCI IDI"
              number="+243 891 618 812"
              network="Orange"
              letterClass="text-orange-500"
            />

            {/* MPESA */}

            <PaymentMethod
              letter="M"
              name="M-Pesa"
              owner="DIEUMERCI IDI"
              number="+243 810 168 651"
              network="Vodacom"
              letterClass="text-emerald-600"
            />
          </div>
        </section>

        {/* ========================================================
            DEMANDE D'ACTIVATION
        ======================================================== */}

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.05)] sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50">
              <Sparkles
                size={19}
                className="text-indigo-600"
              />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">
                Demande d'activation
              </h3>

              <p className="mt-0.5 text-[11px] font-medium leading-5 text-slate-500">
                Après votre paiement, envoyez vos informations.
              </p>
            </div>
          </div>

          {!isOnline && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-3.5">
              <WifiOff
                size={17}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div>
                <p className="text-[11px] font-black text-amber-800">
                  Connexion requise
                </p>

                <p className="mt-1 text-[10px] font-medium leading-5 text-amber-700">
                  Reconnectez-vous à Internet pour
                  envoyer votre demande.
                </p>
              </div>
            </div>
          )}

          <div className="mt-5 space-y-4">

            {/* NOM */}

            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-600">
                Nom complet
              </label>

              <div className="relative">
                <User
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  placeholder="Votre nom complet"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(
                      event.target.value
                    )
                  }
                  className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </div>

            {/* TELEPHONE */}

            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-600">
                Numéro de téléphone
              </label>

              <div className="relative">
                <Phone
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="tel"
                  placeholder="Votre numéro de téléphone"
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value
                    )
                  }
                  className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </div>

            {/* BOUTON */}

            <button
              type="button"
              onClick={handleRenew}
              disabled={
                loading || !isOnline
              }
              className="group flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-sm font-black text-white shadow-[0_10px_25px_rgba(79,70,229,0.20)] transition hover:bg-indigo-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Enregistrement...
                </>
              ) : !isOnline ? (
                <>
                  <WifiOff size={18} />
                  Connexion requise
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Envoyer pour vérification
                  <ArrowRight
                    size={17}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </>
              )}
            </button>
          </div>
        </section>

        {/* ========================================================
            PENDING
        ======================================================== */}

        {status === "pending" && (
          <section className="rounded-[28px] border border-amber-200 bg-amber-50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100">
                <Clock3
                  size={19}
                  className="text-amber-600"
                />
              </div>

              <div>
                <h3 className="text-base font-black text-amber-900">
                  Paiement en vérification
                </h3>

                <p className="mt-1 text-xs font-medium leading-5 text-amber-800/80">
                  Votre demande a bien été envoyée.
                  L'administration va vérifier votre
                  paiement avant l'activation.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================
            WHATSAPP
        ======================================================== */}

        {showConfirmation && (
          <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100">
                <MessageCircle
                  size={19}
                  className="text-emerald-600"
                />
              </div>

              <div className="flex-1">
                <h3 className="text-base font-black text-emerald-900">
                  Preuve de paiement
                </h3>

                <p className="mt-1 text-xs font-medium leading-5 text-emerald-800/80">
                  Envoyez votre capture de paiement sur
                  WhatsApp afin que l'administration puisse
                  vérifier votre demande.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    openWhatsApp(
                      `Bonjour DIEUMERCI IDI (PDG),

Je viens de payer mon abonnement Biso-Commerce.

Nom : ${fullName}

Numéro : ${phone}

Je vous envoie la preuve du paiement.`
                    )
                  }
                  className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99]"
                >
                  <MessageCircle
                    size={19}
                  />

                  Envoyer sur WhatsApp

                  <ArrowRight
                    size={17}
                  />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================
            SECURITE
        ======================================================== */}

        <section className="rounded-[28px] border border-indigo-100 bg-indigo-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
              <LockKeyhole
                size={19}
                className="text-indigo-600"
              />
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-900">
                Paiement sécurisé
              </h3>

              <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
                Conservez toujours votre preuve de paiement.
                Votre abonnement sera activé après vérification
                par l'administration.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================
            FOOTER
        ======================================================== */}

        <footer className="px-3 py-7 text-center">
          <div className="inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
              <Crown
                size={16}
                className="text-white"
              />
            </div>

            <span className="text-sm font-black text-slate-900">
              Biso-Commerce
            </span>
          </div>

          <p className="mt-3 text-xs font-black text-indigo-600">
            IDI HEMEDI DIEUMERCI (PDG)
          </p>

          <p className="mt-1 text-[10px] font-semibold text-slate-400">
            KINSHASA, RDC
          </p>

          <div className="mx-auto mt-3 h-px w-12 bg-slate-200" />

          <p className="mt-3 text-[10px] font-medium text-slate-400">
            Gestion simple • Rapide • Professionnelle 😊
          </p>
        </footer>
      </div>
    </main>
  );
}

/* ================================================================
   COMPOSANT MOYEN DE PAIEMENT
================================================================ */

function PaymentMethod({
  letter,
  name,
  owner,
  number,
  network,
  letterClass,
}: {
  letter: string;
  name: string;
  owner: string;
  number: string;
  network: string;
  letterClass: string;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3.5 transition hover:bg-white hover:shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black shadow-sm ${letterClass}`}
          >
            {letter}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900">
              {name}
            </p>

            <p className="mt-0.5 text-[10px] font-medium text-slate-500">
              {owner}
            </p>
          </div>
        </div>

        <span className="shrink-0 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-black text-slate-600">
          {network}
        </span>
      </div>

      <div className="mt-3 rounded-xl bg-white px-3.5 py-3 shadow-sm">
        <p className="text-sm font-black tracking-wide text-indigo-600 sm:text-base">
          {number}
        </p>
      </div>
    </div>
  );
}