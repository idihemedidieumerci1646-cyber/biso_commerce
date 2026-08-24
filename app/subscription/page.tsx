"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  CheckCircle2,
  Clock3,
  Crown,
  MessageCircle,
  Smartphone,
  ShieldCheck,
  Sparkles,
  CreditCard,
  CalendarDays,
  User,
  Phone,
  ArrowRight,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";

/* ================================================================
   TYPES
================================================================ */

type SubscriptionStatus =
  | "active"
  | "expired"
  | "pending";

type CachedSubscription = {
  id: string | null;
  user_id: string;
  full_name: string;
  phone: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  status: string;
  created_at?: string | null;
  saved_at: string;
};

/* ================================================================
   CACHE LOCAL
================================================================ */

const SUBSCRIPTION_CACHE_PREFIX =
  "biso-subscription-cache-";

const USER_CACHE_PREFIX =
  "biso-subscription-user-";

function getSubscriptionCacheKey(
  userId: string
) {
  return `${SUBSCRIPTION_CACHE_PREFIX}${userId}`;
}

function getUserCacheKey(
  userId: string
) {
  return `${USER_CACHE_PREFIX}${userId}`;
}

/* ================================================================
   SAUVEGARDE CACHE ABONNEMENT
================================================================ */

function saveSubscriptionCache(
  userId: string,
  subscription: CachedSubscription
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    localStorage.setItem(
      getSubscriptionCacheKey(userId),
      JSON.stringify(
        subscription
      )
    );
  } catch (error) {
    console.error(
      "Erreur sauvegarde abonnement local :",
      error
    );
  }
}

/* ================================================================
   LECTURE CACHE ABONNEMENT
================================================================ */

function getSubscriptionCache(
  userId: string
): CachedSubscription | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  try {
    const raw =
      localStorage.getItem(
        getSubscriptionCacheKey(userId)
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw);

    if (!parsed) {
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
   SAUVEGARDE UTILISATEUR
================================================================ */

function saveUserCache(
  userId: string,
  fullName: string,
  phone: string
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    localStorage.setItem(
      getUserCacheKey(userId),
      JSON.stringify({
        id: userId,
        full_name: fullName,
        phone,
        saved_at:
          new Date().toISOString(),
      })
    );
  } catch (error) {
    console.error(
      "Erreur cache utilisateur :",
      error
    );
  }
}

/* ================================================================
   LECTURE UTILISATEUR
================================================================ */

function getUserCache(
  userId: string
) {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  try {
    const raw =
      localStorage.getItem(
        getUserCacheKey(userId)
      );

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as {
      id: string;
      full_name: string;
      phone: string;
      saved_at: string;
    };
  } catch {
    return null;
  }
}

/* ================================================================
   CALCUL DES JOURS
================================================================ */

function calculateUsage(
  startDate: string | null,
  endDate: string | null
) {
  const now =
    new Date();

  if (!startDate) {
    return {
      daysUsed: 0,
      daysLeft: 30,
      expired: false,
    };
  }

  const start =
    new Date(startDate);

  const end = endDate
    ? new Date(endDate)
    : new Date(
        start.getTime() +
          30 *
            24 *
            60 *
            60 *
            1000
      );

  if (
    Number.isNaN(
      start.getTime()
    )
  ) {
    return {
      daysUsed: 0,
      daysLeft: 30,
      expired: false,
    };
  }

  const diff =
    now.getTime() -
    start.getTime();

  let daysUsed =
    Math.floor(
      diff /
        (
          1000 *
          60 *
          60 *
          24
        )
    );

  if (daysUsed < 0) {
    daysUsed = 0;
  }

  daysUsed = Math.min(
    30,
    daysUsed
  );

  const daysLeft =
    Math.max(
      0,
      30 - daysUsed
    );

  const expired =
    end <= now ||
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
  /* ============================================================== */
  /* STATES                                                        */
  /* ============================================================== */

  const [
    subscription,
    setSubscription,
  ] = useState<CachedSubscription | null>(
    null
  );

  const [
    daysUsed,
    setDaysUsed,
  ] = useState(0);

  const [
    daysLeft,
    setDaysLeft,
  ] = useState(30);

  const [
    status,
    setStatus,
  ] = useState<SubscriptionStatus>(
    "active"
  );

  const [
    fullName,
    setFullName,
  ] = useState("");

  const [
    phone,
    setPhone,
  ] = useState("");

  const [
    showConfirmation,
    setShowConfirmation,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    loadingSubscription,
    setLoadingSubscription,
  ] = useState(true);

  const [
    isOnline,
    setIsOnline,
  ] = useState(true);

  /* ============================================================== */
  /* ÉTAT INTERNET                                                  */
  /* ============================================================== */

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    setIsOnline(
      navigator.onLine
    );

    const handleOnline =
      () => {
        setIsOnline(true);

        /*
          Dès que la connexion revient,
          on recharge les informations serveur.
        */

        window.setTimeout(() => {
          void loadSubscription();
        }, 300);
      };

    const handleOffline =
      () => {
        setIsOnline(false);

        /*
          Recalcul immédiat à partir du cache.
        */

        const userId =
          localStorage.getItem(
            "user_id"
          );

        if (userId) {
          const cached =
            getSubscriptionCache(
              userId
            );

          if (cached) {
            applySubscriptionLocally(
              cached
            );
          }
        }
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
  }, []);

  /* ============================================================== */
  /* COMPTEUR TEMPS RÉEL                                            */
  /* ============================================================== */

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        if (!subscription) {
          return;
        }

        const usage =
          calculateUsage(
            subscription.start_date,
            subscription.end_date
          );

        setDaysUsed(
          usage.daysUsed
        );

        setDaysLeft(
          usage.daysLeft
        );

        /*
          On ne change pas automatiquement
          pending en expired.
        */

        if (
          subscription.status ===
          "pending"
        ) {
          setStatus("pending");
          return;
        }

        const active =
          subscription.is_active ===
            true &&
          !usage.expired;

        setStatus(
          active
            ? "active"
            : "expired"
        );
      }, 60_000);

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    subscription,
  ]);

  /* ============================================================== */
  /* CHARGEMENT INITIAL                                             */
  /* ============================================================== */

  useEffect(() => {
    void loadSubscription();
  }, []);

  /* ============================================================== */
  /* APPLIQUER ABONNEMENT LOCAL                                    */
  /* ============================================================== */

  function applySubscriptionLocally(
    data: CachedSubscription
  ) {
    setSubscription(data);

    if (
      data.full_name
    ) {
      setFullName(
        data.full_name
      );
    }

    if (data.phone) {
      setPhone(
        data.phone
      );
    }

    const usage =
      calculateUsage(
        data.start_date,
        data.end_date
      );

    setDaysUsed(
      usage.daysUsed
    );

    setDaysLeft(
      usage.daysLeft
    );

    if (
      data.status ===
      "pending"
    ) {
      setStatus("pending");
      return;
    }

    const active =
      data.is_active ===
        true &&
      !usage.expired;

    setStatus(
      active
        ? "active"
        : "expired"
    );
  }

  /* ============================================================== */
  /* CHARGER ABONNEMENT                                             */
  /* ============================================================== */

  async function loadSubscription() {
    setLoadingSubscription(
      true
    );

    try {
      const phoneStorage =
        localStorage.getItem(
          "phone"
        );

      let userId =
        localStorage.getItem(
          "user_id"
        );

      /*
        ============================================================
        HORS CONNEXION
        ============================================================
      */

      if (
        !navigator.onLine
      ) {
        if (
          userId
        ) {
          const cached =
            getSubscriptionCache(
              userId
            );

          if (cached) {
            applySubscriptionLocally(
              cached
            );

            setLoadingSubscription(
              false
            );

            return;
          }

          const cachedUser =
            getUserCache(
              userId
            );

          if (cachedUser) {
            setFullName(
              cachedUser.full_name
            );

            setPhone(
              cachedUser.phone
            );
          }
        }

        /*
          Aucun cache :
          on garde la page accessible.
        */

        setStatus(
          "active"
        );

        setDaysUsed(0);
        setDaysLeft(30);

        setLoadingSubscription(
          false
        );

        return;
      }

      /*
        ============================================================
        EN LIGNE : RÉCUPÉRER USER
        ============================================================
      */

      if (
        !phoneStorage &&
        !userId
      ) {
        setStatus(
          "expired"
        );

        setLoadingSubscription(
          false
        );

        return;
      }

      let user: {
        id: string;
        full_name?: string | null;
        phone?: string | null;
      } | null = null;

      /*
        Priorité au user_id déjà connu.
      */

      if (
        userId
      ) {
        const {
          data,
        } =
          await supabase
            .from(
              "users"
            )
            .select(
              "id, full_name, phone"
            )
            .eq(
              "id",
              userId
            )
            .maybeSingle();

        if (data) {
          user = data;
        }
      }

      /*
        Sinon recherche par téléphone.
      */

      if (
        !user &&
        phoneStorage
      ) {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              "users"
            )
            .select(
              "id, full_name, phone"
            )
            .eq(
              "phone",
              phoneStorage
            )
            .maybeSingle();

        if (
          error
        ) {
          console.error(
            "Erreur utilisateur :",
            error
          );
        }

        if (data) {
          user = data;
        }
      }

      if (!user) {
        /*
          Si serveur inaccessible mais cache disponible.
        */

        if (
          userId
        ) {
          const cached =
            getSubscriptionCache(
              userId
            );

          if (cached) {
            applySubscriptionLocally(
              cached
            );

            setLoadingSubscription(
              false
            );

            return;
          }
        }

        setStatus(
          "expired"
        );

        setLoadingSubscription(
          false
        );

        return;
      }

      userId =
        String(
          user.id
        );

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

      setFullName(
        resolvedName
      );

      setPhone(
        resolvedPhone
      );

      saveUserCache(
        userId,
        resolvedName,
        resolvedPhone
      );

      /*
        ============================================================
        RÉCUPÉRER ABONNEMENT
        ============================================================
      */

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "subscriptions"
          )
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
          )
          .limit(1)
          .maybeSingle();

      if (
        error
      ) {
        console.error(
          "Erreur abonnement :",
          error
        );

        const cached =
          getSubscriptionCache(
            userId
          );

        if (cached) {
          applySubscriptionLocally(
            cached
          );

          setLoadingSubscription(
            false
          );

          return;
        }

        setStatus(
          "expired"
        );

        setLoadingSubscription(
          false
        );

        return;
      }

      if (!data) {
        setSubscription(
          null
        );

        setStatus(
          "expired"
        );

        setDaysUsed(
          30
        );

        setDaysLeft(0);

        setLoadingSubscription(
          false
        );

        return;
      }

      const normalized: CachedSubscription =
        {
          id:
            data.id
              ? String(
                  data.id
                )
              : null,

          user_id:
            userId,

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
            data.is_active ===
            true,

          status:
            data.status ||
            "",

          created_at:
            data.created_at ||
            null,

          saved_at:
            new Date().toISOString(),
        };

      /*
        Sauvegarder immédiatement
        pour le prochain hors connexion.
      */

      saveSubscriptionCache(
        userId,
        normalized
      );

      applySubscriptionLocally(
        normalized
      );
    } catch (error) {
      console.error(
        "Erreur chargement abonnement :",
        error
      );

      /*
        Dernier recours :
        utiliser le cache.
      */

      const userId =
        localStorage.getItem(
          "user_id"
        );

      if (
        userId
      ) {
        const cached =
          getSubscriptionCache(
            userId
          );

        if (cached) {
          applySubscriptionLocally(
            cached
          );

          setLoadingSubscription(
            false
          );

          return;
        }
      }

      /*
        Même en erreur réseau,
        ne pas bloquer l'ouverture
        inutilement.
      */

      setStatus(
        "active"
      );

      setLoadingSubscription(
        false
      );

      return;
    } finally {
      setLoadingSubscription(
        false
      );
    }
  }

  /* ============================================================== */
  /* WHATSAPP                                                       */
  /* ============================================================== */

  const openWhatsApp = (
    message: string
  ) => {
    const url =
      "https://wa.me/243994864173?text=" +
      encodeURIComponent(
        message
      );

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  /* ============================================================== */
  /* DEMANDE DE RENOUVELLEMENT                                     */
  /* ============================================================== */

  const handleRenew =
    async () => {
      if (
        !fullName.trim() ||
        !phone.trim()
      ) {
        alert(
          "Veuillez remplir votre nom et votre numéro."
        );

        return;
      }

      if (
        !navigator.onLine
      ) {
        alert(
          "Vous êtes hors connexion. Connectez-vous à Internet pour envoyer la demande de renouvellement."
        );

        return;
      }

      if (loading) {
        return;
      }

      setLoading(true);

      try {
        const phoneStorage =
          localStorage.getItem(
            "phone"
          );

        let userId =
          localStorage.getItem(
            "user_id"
          );

        if (
          !phoneStorage &&
          !userId
        ) {
          alert(
            "Votre session utilisateur est introuvable."
          );

          return;
        }

        /*
          ========================================================
          USER
          ========================================================
        */

        let userIdFinal =
          userId;

        if (
          !userIdFinal &&
          phoneStorage
        ) {
          const {
            data: user,
            error:
              userError,
          } =
            await supabase
              .from(
                "users"
              )
              .select(
                "id"
              )
              .eq(
                "phone",
                phoneStorage
              )
              .maybeSingle();

          if (
            userError
          ) {
            console.error(
              "Erreur utilisateur :",
              userError
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

          userIdFinal =
            String(
              user.id
            );

          localStorage.setItem(
            "user_id",
            userIdFinal
          );
        }

        if (
          !userIdFinal
        ) {
          alert(
            "Utilisateur non identifié."
          );

          return;
        }

        /*
          ========================================================
          ABONNEMENT
          ========================================================
        */

        let subscriptionId =
          subscription?.id;

        /*
          Si le cache n'a pas d'id,
          on récupère celui du serveur.
        */

        if (
          !subscriptionId
        ) {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                "subscriptions"
              )
              .select(
                "id"
              )
              .eq(
                "user_id",
                userIdFinal
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              )
              .limit(1)
              .maybeSingle();

          if (
            error
          ) {
            console.error(
              "Erreur recherche abonnement :",
              error
            );

            alert(
              "Impossible de retrouver votre abonnement."
            );

            return;
          }

          subscriptionId =
            data?.id
              ? String(
                  data.id
                )
              : null;
        }

        if (
          !subscriptionId
        ) {
          alert(
            "Aucun abonnement trouvé pour votre compte."
          );

          return;
        }

        /*
          ========================================================
          METTRE EN ATTENTE
          ========================================================
        */

        const {
          data:
            updatedSubscription,
          error:
            updateError,
        } =
          await supabase
            .from(
              "subscriptions"
            )
            .update({
              full_name:
                fullName.trim(),

              phone:
                phone.trim(),

              status:
                "pending",

              user_id:
                userIdFinal,
            })
            .eq(
              "id",
              subscriptionId
            )
            .eq(
              "user_id",
              userIdFinal
            )
            .select("*")
            .maybeSingle();

        if (
          updateError
        ) {
          console.error(
            "Erreur mise à jour abonnement :",
            updateError
          );

          alert(
            "Une erreur est survenue lors de l'envoi de la demande."
          );

          return;
        }

        /*
          ========================================================
          CACHE IMMÉDIAT
          ========================================================
        */

        const localUpdated: CachedSubscription =
          {
            id:
              subscriptionId,

            user_id:
              userIdFinal,

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
              updatedSubscription
                ?.is_active ??
              subscription?.is_active ??
              false,

            status:
              "pending",

            created_at:
              updatedSubscription
                ?.created_at ||
              subscription?.created_at ||
              null,

            saved_at:
              new Date().toISOString(),
          };

        saveSubscriptionCache(
          userIdFinal,
          localUpdated
        );

        setSubscription(
          localUpdated
        );

        setStatus(
          "pending"
        );

        setShowConfirmation(
          true
        );
      } catch (error) {
        console.error(
          "Erreur renouvellement :",
          error
        );

        alert(
          "Une erreur inattendue est survenue."
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  /* ============================================================== */
  /* POURCENTAGE                                                     */
  /* ============================================================== */

  const usagePercentage =
    Math.min(
      100,
      Math.max(
        0,
        (
          daysUsed /
          30
        ) *
          100
      )
    );

  /* ============================================================== */
  /* AFFICHAGE CHARGEMENT                                           */
  /* ============================================================== */

  if (
    loadingSubscription
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-sm">
          <RefreshCw
            size={19}
            className="animate-spin text-indigo-600"
          />

          Chargement de votre abonnement...
        </div>
      </main>
    );
  }

  /* ============================================================== */
  /* JSX                                                             */
  /* ============================================================== */

  return (
    <main
      className="
        min-h-screen
        bg-[#f5f7fb]
        text-slate-900
        px-4
        py-6
        sm:px-6
        sm:py-10
      "
    >
      <div
        className="
          mx-auto
          max-w-2xl
          space-y-5
        "
      >

        {/* ========================================================
            HEADER
        ======================================================== */}

        <section
          className="
            rounded-[26px]
            border
            border-slate-200/80
            bg-white
            p-6
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
          "
        >
          <div
            className="
              flex
              items-center
              gap-4
            "
          >
            <div
              className="
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                bg-indigo-600
                shadow-[0_8px_18px_rgba(79,70,229,0.18)]
              "
            >
              <Crown
                size={23}
                className="text-white"
              />
            </div>

            <div>
              <h1
                className="
                  text-2xl
                  font-black
                  tracking-tight
                  text-slate-900
                "
              >
                Biso-Commerce
              </h1>

              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                Votre espace abonnement
              </p>
            </div>
          </div>

          {/* INTERNET */}

          <div className="mt-5">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black ${
                isOnline
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi
                    size={14}
                  />
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
          </div>

          {/* PLAN */}

          <div
            className="
              mt-6
              rounded-2xl
              border
              border-indigo-100
              bg-indigo-50
              p-5
            "
          >
            <div
              className="
                flex
                flex-col
                gap-4
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >
              <div>
                <p
                  className="
                    text-xs
                    font-bold
                    uppercase
                    tracking-wide
                    text-indigo-600
                  "
                >
                  Abonnement mensuel
                </p>

                <p
                  className="
                    mt-1
                    text-base
                    font-black
                    text-slate-900
                  "
                >
                  Gérez votre commerce simplement
                </p>

                <p
                  className="
                    mt-1
                    text-sm
                    text-slate-500
                  "
                >
                  Stock, ventes, dettes et bénéfices.
                </p>
              </div>

              <div
                className="
                  shrink-0
                  text-left
                  sm:text-right
                "
              >
                <p
                  className="
                    text-3xl
                    font-black
                    text-indigo-600
                  "
                >
                  5$
                </p>

                <p
                  className="
                    text-xs
                    text-slate-500
                  "
                >
                  / mois
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            STATUT
        ======================================================== */}

        <section
          className="
            rounded-[26px]
            border
            border-slate-200/80
            bg-white
            p-6
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-4
            "
          >
            <div>
              <p
                className="
                  text-sm
                  font-semibold
                  text-slate-500
                "
              >
                Statut de l'abonnement
              </p>

              <h2
                className="
                  mt-2
                  text-2xl
                  font-black
                  text-slate-900
                "
              >
                {status ===
                "active"
                  ? "Actif"
                  : status ===
                    "pending"
                  ? "En vérification"
                  : "Expiré"}
              </h2>

              <div className="mt-2">

                {status ===
                  "active" && (
                  <span
                    className="
                      inline-flex
                      items-center
                      gap-2
                      rounded-full
                      bg-emerald-50
                      px-3
                      py-1.5
                      text-xs
                      font-bold
                      text-emerald-700
                    "
                  >
                    <span
                      className="
                        h-2
                        w-2
                        rounded-full
                        bg-emerald-500
                      "
                    />

                    Abonnement actif
                  </span>
                )}

                {status ===
                  "pending" && (
                  <span
                    className="
                      inline-flex
                      items-center
                      gap-2
                      rounded-full
                      bg-amber-50
                      px-3
                      py-1.5
                      text-xs
                      font-bold
                      text-amber-700
                    "
                  >
                    <Clock3
                      size={14}
                    />

                    Paiement en vérification
                  </span>
                )}

                {status ===
                  "expired" && (
                  <span
                    className="
                      inline-flex
                      items-center
                      gap-2
                      rounded-full
                      bg-slate-100
                      px-3
                      py-1.5
                      text-xs
                      font-bold
                      text-slate-600
                    "
                  >
                    <ShieldCheck
                      size={14}
                    />

                    Abonnement expiré
                  </span>
                )}

              </div>
            </div>

            <div
              className={`
                flex
                h-14
                w-14
                shrink-0
                items-center
                justify-center
                rounded-2xl
                ${
                  status ===
                  "active"
                    ? "bg-emerald-50"
                    : status ===
                      "pending"
                    ? "bg-amber-50"
                    : "bg-slate-100"
                }
              `}
            >
              {status ===
              "active" ? (
                <CheckCircle2
                  size={28}
                  className="text-emerald-600"
                />
              ) : status ===
                "pending" ? (
                <Clock3
                  size={28}
                  className="text-amber-600"
                />
              ) : (
                <ShieldCheck
                  size={28}
                  className="text-slate-500"
                />
              )}
            </div>
          </div>

          {!isOnline && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <WifiOff
                size={18}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <p className="text-xs leading-5 text-amber-800">
                Vous êtes hors connexion. Le statut et le compteur utilisent les dernières informations enregistrées sur cet appareil.
              </p>
            </div>
          )}
        </section>

        {/* ========================================================
            COMPTEUR
        ======================================================== */}

        <section
          className="
            rounded-[26px]
            border
            border-slate-200/80
            bg-white
            p-6
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-4
            "
          >
            <div
              className="
                flex
                items-center
                gap-3
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-indigo-50
                "
              >
                <CalendarDays
                  size={20}
                  className="text-indigo-600"
                />
              </div>

              <div>
                <h3
                  className="
                    font-black
                    text-slate-900
                  "
                >
                  Utilisation
                </h3>

                <p
                  className="
                    mt-0.5
                    text-xs
                    text-slate-500
                  "
                >
                  Période de 30 jours
                </p>
              </div>
            </div>

            <div
              className="
                text-right
              "
            >
              <p
                className="
                  text-xl
                  font-black
                  text-indigo-600
                "
              >
                {daysLeft}
              </p>

              <p
                className="
                  text-xs
                  font-semibold
                  text-slate-500
                "
              >
                jours restants
              </p>
            </div>
          </div>

          <div
            className="
              mt-6
              h-3
              overflow-hidden
              rounded-full
              bg-slate-100
            "
          >
            <div
              className="
                h-full
                rounded-full
                bg-indigo-600
                transition-all
                duration-500
              "
              style={{
                width:
                  `${usagePercentage}%`,
              }}
            />
          </div>

          <div
            className="
              mt-3
              flex
              items-center
              justify-between
              text-xs
              font-semibold
              text-slate-500
            "
          >
            <span>
              {daysUsed} jours utilisés
            </span>

            <span>
              30 jours
            </span>
          </div>

          {!isOnline && (
            <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
              <p className="text-xs font-black text-indigo-700">
                Mode hors connexion
              </p>

              <p className="mt-1 text-[11px] leading-5 text-indigo-700/80">
                Le compteur continue de fonctionner sans Internet en se basant sur la date de début enregistrée localement.
              </p>
            </div>
          )}
        </section>

        {/* ========================================================
            COMMENT PAYER
        ======================================================== */}

        <section
          className="
            rounded-[26px]
            border
            border-slate-200/80
            bg-white
            p-6
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-2xl
                bg-indigo-50
              "
            >
              <CreditCard
                size={21}
                className="text-indigo-600"
              />
            </div>

            <div>
              <h3
                className="
                  text-lg
                  font-black
                  text-slate-900
                "
              >
                Comment payer ?
              </h3>

              <p
                className="
                  text-sm
                  text-slate-500
                "
              >
                Suivez simplement ces étapes.
              </p>
            </div>
          </div>

          <div
            className="
              mt-6
              space-y-3
            "
          >
            {[
              "Envoyez 5$ par Mobile Money.",
              "Gardez votre preuve de paiement.",
              "Remplissez votre nom et votre numéro.",
              "Envoyez la capture sur WhatsApp.",
              "Attendez la validation de l'administration.",
            ].map(
              (
                text,
                index
              ) => (
                <div
                  key={index}
                  className="
                    flex
                    items-center
                    gap-3
                    rounded-2xl
                    border
                    border-slate-100
                    bg-slate-50
                    p-4
                  "
                >
                  <div
                    className="
                      flex
                      h-8
                      w-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      bg-indigo-600
                      text-xs
                      font-black
                      text-white
                    "
                  >
                    {index + 1}
                  </div>

                  <p
                    className="
                      text-sm
                      font-medium
                      text-slate-700
                    "
                  >
                    {text}
                  </p>
                </div>
              )
            )}
          </div>
        </section>

        {/* ========================================================
            MOYENS DE PAIEMENT
        ======================================================== */}

        <section
          className="
            rounded-[26px]
            border
            border-slate-200/80
            bg-white
            p-6
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-2xl
                bg-indigo-50
              "
            >
              <Smartphone
                size={21}
                className="text-indigo-600"
              />
            </div>

            <div>
              <h3
                className="
                  text-lg
                  font-black
                  text-slate-900
                "
              >
                Nos moyens de paiement
              </h3>

              <p
                className="
                  text-sm
                  text-slate-500
                "
              >
                Choisissez votre moyen Mobile Money.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-3">

            {/* AIRTEL */}

            <div
              className="
                rounded-2xl
                border
                border-slate-200
                bg-slate-50
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
                <div>
                  <p
                    className="
                      font-black
                      text-slate-900
                    "
                  >
                    Airtel Money
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-slate-500
                    "
                  >
                    DIEUMERCI IDI
                  </p>
                </div>

                <span
                  className="
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    py-2
                    text-xs
                    font-bold
                    text-slate-700
                  "
                >
                  Airtel
                </span>
              </div>

              <p
                className="
                  mt-4
                  text-lg
                  font-black
                  text-indigo-600
                "
              >
                +243 994 864 173
              </p>
            </div>

            {/* ORANGE */}

            <div
              className="
                rounded-2xl
                border
                border-slate-200
                bg-slate-50
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
                <div>
                  <p
                    className="
                      font-black
                      text-slate-900
                    "
                  >
                    Orange Money
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-slate-500
                    "
                  >
                    DIEUMERCI IDI
                  </p>
                </div>

                <span
                  className="
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    py-2
                    text-xs
                    font-bold
                    text-slate-700
                  "
                >
                  Orange
                </span>
              </div>

              <p
                className="
                  mt-4
                  text-lg
                  font-black
                  text-indigo-600
                "
              >
                +243 891 618 812
              </p>
            </div>

            {/* M-PESA */}

            <div
              className="
                rounded-2xl
                border
                border-slate-200
                bg-slate-50
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
                <div>
                  <p
                    className="
                      font-black
                      text-slate-900
                    "
                  >
                    M-Pesa
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-slate-500
                    "
                  >
                    DIEUMERCI IDI
                  </p>
                </div>

                <span
                  className="
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    py-2
                    text-xs
                    font-bold
                    text-slate-700
                  "
                >
                  Vodacom
                </span>
              </div>

              <p
                className="
                  mt-4
                  text-lg
                  font-black
                  text-indigo-600
                "
              >
                +243 810 168 651
              </p>
            </div>

          </div>
        </section>

        {/* ========================================================
            DEMANDE ACTIVATION
        ======================================================== */}

        <section
          className="
            rounded-[26px]
            border
            border-slate-200/80
            bg-white
            p-6
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
          "
        >
          <div
            className="
              flex
              items-start
              gap-3
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
                bg-indigo-50
              "
            >
              <Sparkles
                size={20}
                className="text-indigo-600"
              />
            </div>

            <div>
              <h3
                className="
                  text-lg
                  font-black
                  text-slate-900
                "
              >
                Demande d'activation
              </h3>

              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                Après votre paiement, remplissez vos informations.
              </p>
            </div>
          </div>

          {!isOnline && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">

              <WifiOff
                size={18}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div>
                <p className="text-xs font-black text-amber-800">
                  Demande indisponible hors connexion
                </p>

                <p className="mt-1 text-[11px] leading-5 text-amber-700">
                  Vous pouvez consulter votre abonnement sans Internet. Pour envoyer une demande de renouvellement, reconnectez-vous.
                </p>
              </div>

            </div>
          )}

          <div
            className="
              mt-6
              space-y-4
            "
          >

            {/* NOM */}

            <div>
              <label
                className="
                  mb-2
                  block
                  text-sm
                  font-bold
                  text-slate-700
                "
              >
                Nom complet
              </label>

              <div className="relative">

                <User
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
                  placeholder="Votre nom complet"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(
                      e.target.value
                    )
                  }
                  className="
                    h-14
                    w-full
                    rounded-2xl
                    border
                    border-slate-200
                    bg-slate-50
                    pl-12
                    pr-4
                    text-slate-900
                    outline-none
                    transition
                    placeholder:text-slate-400
                    focus:border-indigo-500
                    focus:bg-white
                    focus:ring-4
                    focus:ring-indigo-500/10
                  "
                />

              </div>
            </div>

            {/* TELEPHONE */}

            <div>
              <label
                className="
                  mb-2
                  block
                  text-sm
                  font-bold
                  text-slate-700
                "
              >
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
                    text-slate-400
                  "
                />

                <input
                  type="tel"
                  placeholder="Votre numéro de téléphone"
                  value={phone}
                  onChange={(e) =>
                    setPhone(
                      e.target.value
                    )
                  }
                  className="
                    h-14
                    w-full
                    rounded-2xl
                    border
                    border-slate-200
                    bg-slate-50
                    pl-12
                    pr-4
                    text-slate-900
                    outline-none
                    transition
                    placeholder:text-slate-400
                    focus:border-indigo-500
                    focus:bg-white
                    focus:ring-4
                    focus:ring-indigo-500/10
                  "
                />

              </div>
            </div>

            {/* BOUTON */}

            <button
              type="button"
              onClick={
                handleRenew
              }
              disabled={
                loading ||
                !isOnline
              }
              className="
                h-14
                w-full
                rounded-2xl
                bg-indigo-600
                font-black
                text-white
                shadow-[0_8px_20px_rgba(79,70,229,0.18)]
                transition
                hover:bg-indigo-700
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {loading ? (
                <span
                  className="
                    flex
                    items-center
                    justify-center
                    gap-2
                  "
                >
                  <span
                    className="
                      h-5
                      w-5
                      animate-spin
                      rounded-full
                      border-2
                      border-white/30
                      border-t-white
                    "
                  />

                  Enregistrement...
                </span>
              ) : !isOnline ? (
                <span
                  className="
                    flex
                    items-center
                    justify-center
                    gap-2
                  "
                >
                  <WifiOff
                    size={20}
                  />

                  Connexion requise
                </span>
              ) : (
                <span
                  className="
                    flex
                    items-center
                    justify-center
                    gap-2
                  "
                >
                  <CheckCircle2
                    size={20}
                  />

                  Envoyer pour vérification

                  <ArrowRight
                    size={18}
                  />
                </span>
              )}
            </button>

          </div>
        </section>

        {/* ========================================================
            PAIEMENT EN VERIFICATION
        ======================================================== */}

        {status ===
          "pending" && (
          <section
            className="
              rounded-[26px]
              border
              border-amber-200
              bg-amber-50
              p-6
            "
          >
            <div
              className="
                flex
                items-start
                gap-4
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
                  bg-amber-100
                "
              >
                <Clock3
                  size={21}
                  className="text-amber-600"
                />
              </div>

              <div>
                <h3
                  className="
                    text-lg
                    font-black
                    text-amber-900
                  "
                >
                  Paiement en vérification
                </h3>

                <p
                  className="
                    mt-1
                    text-sm
                    leading-6
                    text-amber-800/80
                  "
                >
                  Votre demande a bien été envoyée. L'administration va vérifier votre paiement avant d'activer votre abonnement.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================
            WHATSAPP
        ======================================================== */}

        {showConfirmation && (
          <section
            className="
              rounded-[26px]
              border
              border-emerald-200
              bg-emerald-50
              p-6
            "
          >
            <div
              className="
                flex
                items-start
                gap-4
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
                  bg-emerald-100
                "
              >
                <MessageCircle
                  size={21}
                  className="text-emerald-600"
                />
              </div>

              <div className="flex-1">

                <h3
                  className="
                    text-lg
                    font-black
                    text-emerald-900
                  "
                >
                  Envoyer la preuve de paiement
                </h3>

                <p
                  className="
                    mt-1
                    text-sm
                    leading-6
                    text-emerald-800/80
                  "
                >
                  Envoyez votre capture de paiement sur WhatsApp afin que l'administration puisse vérifier votre demande.
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
                  className="
                    mt-5
                    flex
                    h-14
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-2xl
                    bg-emerald-600
                    font-black
                    text-white
                    transition
                    hover:bg-emerald-700
                  "
                >
                  <MessageCircle
                    size={21}
                  />

                  Envoyer la capture sur WhatsApp
                </button>

              </div>
            </div>
          </section>
        )}

        {/* ========================================================
            PROPOSER UNE IDÉE
        ======================================================== */}

        <section
          className="
            rounded-[26px]
            border
            border-slate-200/80
            bg-white
            p-6
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
          "
        >
          <div
            className="
              flex
              items-start
              gap-4
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
                bg-indigo-50
              "
            >
              <Sparkles
                size={20}
                className="text-indigo-600"
              />
            </div>

            <div>
              <h3
                className="
                  text-lg
                  font-black
                  text-slate-900
                "
              >
                Proposer une idée
              </h3>

              <p
                className="
                  mt-1
                  text-sm
                  leading-6
                  text-slate-500
                "
              >
                Une suggestion pour améliorer Biso-Commerce ?
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              openWhatsApp(
                `Bonjour DIEUMERCI IDI (PDG),

Je voudrais proposer une amélioration pour Biso-Commerce.`
              )
            }
            className="
              mt-5
              flex
              h-14
              w-full
              items-center
              justify-center
              gap-2
              rounded-2xl
              bg-slate-900
              font-black
              text-white
              transition
              hover:bg-slate-800
            "
          >
            <MessageCircle
              size={20}
            />

            Envoyer une proposition
          </button>
        </section>

        {/* ========================================================
            SECURITE
        ======================================================== */}

        <section
          className="
            rounded-[26px]
            border
            border-indigo-100
            bg-indigo-50
            p-6
          "
        >
          <div
            className="
              flex
              items-start
              gap-4
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
                bg-white
                shadow-sm
              "
            >
              <ShieldCheck
                size={21}
                className="text-indigo-600"
              />
            </div>

            <div>
              <h3
                className="
                  font-black
                  text-slate-900
                "
              >
                Paiement sécurisé
              </h3>

              <p
                className="
                  mt-1
                  text-sm
                  leading-6
                  text-slate-600
                "
              >
                Conservez toujours votre preuve de paiement. Votre abonnement sera activé après vérification par l'administration.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================
            FOOTER
        ======================================================== */}

        <footer
          className="
            py-8
            text-center
          "
        >
          <div
            className="
              inline-flex
              items-center
              gap-2
            "
          >
            <div
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-xl
                bg-indigo-600
              "
            >
              <Crown
                size={18}
                className="text-white"
              />
            </div>

            <span
              className="
                font-black
                text-slate-900
              "
            >
              Biso-Commerce
            </span>
          </div>

          <p
            className="
              mt-3
              text-sm
              font-bold
              text-indigo-600
            "
          >
            IDI HEMEDI DIEUMERCI (PDG)
          </p>

          <p
            className="
              mt-1
              text-xs
              text-slate-400
            "
          >
            KINSHASA, RDC
          </p>

          <p
            className="
              mt-4
              text-xs
              text-slate-400
            "
          >
            Gestion simple • Rapide • Professionnelle 😊
          </p>
        </footer>

      </div>
    </main>
  );
}