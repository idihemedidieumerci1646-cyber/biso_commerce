"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  Bot,
  Sparkles,
  Send,
  TrendingUp,
  Package,
  Wallet,
  AlertTriangle,
  Lightbulb,
  WifiOff,
  X,
  RefreshCw,
  BarChart3,
  CircleDollarSign,
  Users,
  ShoppingCart,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";

type Sale = {
  id: string;
  product_name: string;
  quantity: number;
  total_sale: number;
  profit: number;
  currency: string;
  created_at: string;
};

type Product = {
  id: string;
  name: string;
  stock: number;
  unit: string;
};

type Expense = {
  id: number;
  title: string;
  amount: number;
  currency: string;
};

type Debt = {
  id: string;
  client_name: string;
  total_amount: number;
  paid_amount: number;
};

type AssistantResult = {
  type:
    | "sales"
    | "profit"
    | "stock"
    | "debts"
    | "expenses"
    | "products"
    | "advice"
    | "global"
    | "install"
    | "support"
    | "default";
  title: string;
  description: string;
  stats?: {
    label: string;
    value: string;
    icon: "money" | "sales" | "profit" | "users" | "stock";
  }[];
  items?: {
    label: string;
    value?: string;
    status?: "success" | "warning" | "danger" | "normal";
  }[];
  advice?: string;
};

export default function AssistantPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] =
    useState<AssistantResult | null>(null);

  const [loading, setLoading] = useState(false);

  const [isOnline, setIsOnline] = useState(true);
  const [showConnectionPopup, setShowConnectionPopup] =
    useState(false);

  useEffect(() => {
    const online = navigator.onLine;

    setIsOnline(online);

    if (!online) {
      setShowConnectionPopup(true);
    } else {
      loadData();
    }

    const handleOnline = () => {
      setIsOnline(true);
      setShowConnectionPopup(false);
      loadData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowConnectionPopup(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function loadData() {
    if (!navigator.onLine) {
      setIsOnline(false);
      setShowConnectionPopup(true);
      return;
    }

    try {
      const phone = localStorage.getItem("phone");

      if (!phone) return;

      const { data: user, error: userError } =
        await supabase
          .from("users")
          .select("id")
          .eq("phone", phone)
          .single();

      if (userError || !user) return;

      const { data: salesData } = await supabase
        .from("sales")
        .select("*")
        .eq("user_id", user.id);

      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id);

      const { data: expensesData } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id);

      const { data: debtsData } = await supabase
        .from("debts")
        .select("*")
        .eq("user_id", user.id);

      setSales((salesData || []) as Sale[]);
      setProducts((productsData || []) as Product[]);
      setExpenses((expensesData || []) as Expense[]);
      setDebts((debtsData || []) as Debt[]);
    } catch (error) {
      console.log(error);
    }
  }

  function requireConnection() {
    if (!navigator.onLine) {
      setIsOnline(false);
      setShowConnectionPopup(true);
      return false;
    }

    return true;
  }

  function money(value: number) {
    return Math.round(value || 0)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function analyseCommerce(
    type:
      | "sales"
      | "profit"
      | "stock"
      | "debts"
      | "expenses"
      | "products"
      | "advice"
      | "global"
  ): AssistantResult {
    let totalVentes = 0;
    let totalProfit = 0;
    let totalDepenses = 0;
    let totalDettes = 0;

    sales.forEach((s) => {
      totalVentes += Number(s.total_sale || 0);
      totalProfit += Number(s.profit || 0);
    });

    expenses.forEach((e) => {
      totalDepenses += Number(e.amount || 0);
    });

    debts.forEach((d) => {
      totalDettes +=
        Number(d.total_amount || 0) -
        Number(d.paid_amount || 0);
    });

    const stockFaible = products.filter(
      (p) => Number(p.stock) <= 5
    );

    const classement: Record<string, number> = {};

    sales.forEach((s) => {
      classement[s.product_name] =
        (classement[s.product_name] || 0) +
        Number(s.quantity);
    });

    const topProducts = Object.entries(classement)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const meilleurProduit = topProducts[0];

    if (type === "sales") {
      return {
        type: "sales",
        title: "Analyse de vos ventes",
        description:
          "Voici une vue rapide de l'activité commerciale enregistrée.",
        stats: [
          {
            label: "Chiffre d'affaires",
            value: `${money(totalVentes)} FC`,
            icon: "money",
          },
          {
            label: "Nombre de ventes",
            value: String(sales.length),
            icon: "sales",
          },
        ],
        items: [
          {
            label: "Produit le plus vendu",
            value:
              meilleurProduit?.[0] || "Aucune vente",
            status: meilleurProduit
              ? "success"
              : "normal",
          },
          {
            label: "Quantité vendue",
            value: `${sales.reduce(
              (sum, sale) =>
                sum + Number(sale.quantity || 0),
              0
            )}`,
            status: "normal",
          },
        ],
        advice:
          "Continuez à développer les produits qui attirent le plus vos clients.",
      };
    }

    if (type === "profit") {
      return {
        type: "profit",
        title: "Analyse de votre bénéfice",
        description:
          "Voici les principaux chiffres permettant de suivre votre rentabilité.",
        stats: [
          {
            label: "Bénéfice",
            value: `${money(totalProfit)} FC`,
            icon: "profit",
          },
          {
            label: "Ventes",
            value: `${money(totalVentes)} FC`,
            icon: "money",
          },
          {
            label: "Dépenses",
            value: `${money(totalDepenses)} FC`,
            icon: "money",
          },
        ],
        items: [
          {
            label: "Rentabilité",
            value:
              totalVentes > 0
                ? `${Math.round(
                    (totalProfit / totalVentes) * 100
                  )}%`
                : "0%",
            status:
              totalProfit > 0
                ? "success"
                : "danger",
          },
        ],
        advice:
          "Concentrez-vous sur les produits ayant une bonne marge et surveillez vos dépenses.",
      };
    }

    if (type === "stock") {
      return {
        type: "stock",
        title: "Analyse de votre stock",
        description:
          "L'assistant a identifié les produits qui nécessitent votre attention.",
        stats: [
          {
            label: "Produits",
            value: String(products.length),
            icon: "stock",
          },
          {
            label: "Stock faible",
            value: String(stockFaible.length),
            icon: "stock",
          },
        ],
        items:
          stockFaible.length > 0
            ? stockFaible.map((product) => ({
                label: product.name,
                value: `${product.stock} ${product.unit}`,
                status:
                  Number(product.stock) === 0
                    ? "danger"
                    : "warning",
              }))
            : [
                {
                  label: "État du stock",
                  value: "Aucune alerte",
                  status: "success",
                },
              ],
        advice:
          stockFaible.length > 0
            ? "Pensez à réapprovisionner les produits en alerte avant une rupture."
            : "Votre stock ne présente actuellement aucune alerte importante.",
      };
    }

    if (type === "debts") {
      return {
        type: "debts",
        title: "Analyse des dettes clients",
        description:
          "Voici la situation actuelle des crédits accordés à vos clients.",
        stats: [
          {
            label: "Reste à récupérer",
            value: `${money(totalDettes)} FC`,
            icon: "money",
          },
          {
            label: "Clients débiteurs",
            value: String(debts.length),
            icon: "users",
          },
        ],
        items:
          debts.length > 0
            ? debts.slice(0, 5).map((debt) => ({
                label: debt.client_name,
                value: `${money(
                  Number(debt.total_amount) -
                    Number(debt.paid_amount)
                )} ${
                  debt.total_amount
                    ? "FC"
                    : ""
                }`,
                status: "warning",
              }))
            : [
                {
                  label: "Situation",
                  value: "Aucune dette",
                  status: "success",
                },
              ],
        advice:
          "Relancez en priorité les clients ayant les montants les plus importants à payer.",
      };
    }

    if (type === "expenses") {
      return {
        type: "expenses",
        title: "Analyse de vos dépenses",
        description:
          "Voici un résumé de vos sorties d'argent enregistrées.",
        stats: [
          {
            label: "Total dépenses",
            value: `${money(totalDepenses)} FC`,
            icon: "money",
          },
          {
            label: "Nombre",
            value: String(expenses.length),
            icon: "sales",
          },
        ],
        items:
          expenses.length > 0
            ? expenses.slice(0, 5).map((expense) => ({
                label: expense.title,
                value: `${money(
                  Number(expense.amount)
                )} ${expense.currency || "FC"}`,
                status: "normal",
              }))
            : [
                {
                  label: "Dépenses",
                  value: "Aucune dépense",
                  status: "success",
                },
              ],
        advice:
          "Contrôlez régulièrement vos dépenses afin de protéger vos bénéfices.",
      };
    }

    if (type === "products") {
      return {
        type: "products",
        title: "Produits les plus vendus",
        description:
          "Voici le classement des produits selon les quantités vendues.",
        stats: [
          {
            label: "Produits actifs",
            value: String(products.length),
            icon: "stock",
          },
          {
            label: "Ventes",
            value: String(sales.length),
            icon: "sales",
          },
        ],
        items:
          topProducts.length > 0
            ? topProducts.map(
                ([name, quantity], index) => ({
                  label: `${index + 1}. ${name}`,
                  value: `${quantity} vendu${
                    quantity > 1 ? "s" : ""
                  }`,
                  status:
                    index === 0
                      ? "success"
                      : "normal",
                })
              )
            : [
                {
                  label: "Classement",
                  value: "Aucune vente disponible",
                  status: "normal",
                },
              ],
        advice:
          "Mettez davantage en avant les produits qui se vendent rapidement.",
      };
    }

    if (type === "advice") {
      return {
        type: "advice",
        title: "Conseils pour votre commerce",
        description:
          "Quelques recommandations basées sur les données disponibles.",
        items: [
          {
            label:
              stockFaible.length > 0
                ? "Réapprovisionnement"
                : "Gestion du stock",
            value:
              stockFaible.length > 0
                ? `${stockFaible.length} produit(s) en alerte`
                : "Stock correctement surveillé",
            status:
              stockFaible.length > 0
                ? "warning"
                : "success",
          },
          {
            label: "Dettes clients",
            value:
              debts.length > 0
                ? `${debts.length} client(s) débiteur(s)`
                : "Aucune dette",
            status:
              debts.length > 0
                ? "warning"
                : "success",
          },
          {
            label: "Bénéfice",
            value: `${money(totalProfit)} FC`,
            status:
              totalProfit > 0
                ? "success"
                : "danger",
          },
        ],
        advice:
          "Surveillez votre stock, récupérez régulièrement les dettes clients et privilégiez les produits réellement rentables.",
      };
    }

    return {
      type: "global",
      title: "Rapport global du commerce",
      description:
        "Voici une synthèse de l'activité enregistrée dans Biso-Commerce.",
      stats: [
        {
          label: "Chiffre d'affaires",
          value: `${money(totalVentes)} FC`,
          icon: "money",
        },
        {
          label: "Bénéfice",
          value: `${money(totalProfit)} FC`,
          icon: "profit",
        },
        {
          label: "Dépenses",
          value: `${money(totalDepenses)} FC`,
          icon: "money",
        },
        {
          label: "Produits",
          value: String(products.length),
          icon: "stock",
        },
      ],
      items: [
        {
          label: "Ventes enregistrées",
          value: String(sales.length),
          status: "normal",
        },
        {
          label: "Produits en stock faible",
          value: String(stockFaible.length),
          status:
            stockFaible.length > 0
              ? "warning"
              : "success",
        },
        {
          label: "Clients débiteurs",
          value: String(debts.length),
          status:
            debts.length > 0
              ? "warning"
              : "success",
        },
      ],
      advice:
        "Vos priorités sont de surveiller les produits en stock faible, suivre les dettes clients et favoriser les produits rentables.",
    };
  }

  async function askAssistant(text?: string) {
    if (!requireConnection()) return;

    const userQuestion = (text || question)
      .toLowerCase()
      .trim();

    if (!userQuestion) return;

    setLoading(true);

    let result: AssistantResult;

    if (
      userQuestion.includes("vente") ||
      userQuestion.includes("vendu") ||
      userQuestion.includes("chiffre") ||
      userQuestion.includes("ca") ||
      userQuestion.includes("revenu") ||
      userQuestion.includes("gagné") ||
      userQuestion.includes("aujourd'hui") ||
      userQuestion.includes("aujourd’hui")
    ) {
      result = analyseCommerce("sales");
    } else if (
      userQuestion.includes("bénéfice") ||
      userQuestion.includes("benefice") ||
      userQuestion.includes("profit") ||
      userQuestion.includes("gain") ||
      userQuestion.includes("marge") ||
      userQuestion.includes("rentable")
    ) {
      result = analyseCommerce("profit");
    } else if (
      userQuestion.includes("stock") ||
      userQuestion.includes("rupture") ||
      userQuestion.includes("manque") ||
      userQuestion.includes("vide") ||
      userQuestion.includes("reste") ||
      userQuestion.includes("disponible") ||
      userQuestion.includes("acheter") ||
      userQuestion.includes("réapprovisionner") ||
      userQuestion.includes("recommander")
    ) {
      result = analyseCommerce("stock");
    } else if (
      userQuestion.includes("dette") ||
      userQuestion.includes("doit") ||
      userQuestion.includes("client") ||
      userQuestion.includes("impayé") ||
      userQuestion.includes("impaye") ||
      userQuestion.includes("crédit") ||
      userQuestion.includes("credit") ||
      userQuestion.includes("argent dû") ||
      userQuestion.includes("argent du") ||
      userQuestion.includes("qui me doit")
    ) {
      result = analyseCommerce("debts");
    } else if (
      userQuestion.includes("dépense") ||
      userQuestion.includes("depense") ||
      userQuestion.includes("sortie") ||
      userQuestion.includes("dépensé")
    ) {
      result = analyseCommerce("expenses");
    } else if (
      userQuestion.includes("meilleur") ||
      userQuestion.includes("top") ||
      userQuestion.includes("produit") ||
      userQuestion.includes("vend le plus") ||
      userQuestion.includes("plus vendu") ||
      userQuestion.includes("populaire")
    ) {
      result = analyseCommerce("products");
    } else if (
      userQuestion.includes("conseil") ||
      userQuestion.includes("aide") ||
      userQuestion.includes("améliorer")
    ) {
      result = analyseCommerce("advice");
    } else if (
      userQuestion.includes("résumé") ||
      userQuestion.includes("rapport") ||
      userQuestion.includes("commerce")
    ) {
      result = analyseCommerce("global");
    } else if (
      userQuestion.includes("installer l'application") ||
      userQuestion.includes("installation") ||
      userQuestion.includes("installer") ||
      userQuestion.includes("application")
    ) {
      result = {
        type: "install",
        title: "Installer Biso-Commerce",
        description:
          "Installez Biso-Commerce sur votre téléphone pour y accéder rapidement.",
        items: [
          {
            label: "Android",
            value:
              "Chrome → ⋮ → Installer l'application",
            status: "success",
          },
          {
            label: "iPhone",
            value:
              "Safari → Partager → Sur l'écran d'accueil",
            status: "success",
          },
        ],
        advice:
          "Après l'installation, l'icône Biso-Commerce apparaîtra directement sur votre écran d'accueil.",
      };
    } else if (
      userQuestion.includes("problème") ||
      userQuestion.includes("probleme") ||
      userQuestion.includes("support") ||
      userQuestion.includes("question")
    ) {
      result = {
        type: "support",
        title: "Besoin d'assistance ?",
        description:
          "Notre service client Biso-Commerce peut vous accompagner.",
        items: [
          {
            label: "Installation",
            value: "Assistance disponible",
            status: "success",
          },
          {
            label: "Produits",
            value: "Assistance disponible",
            status: "success",
          },
          {
            label: "Ventes",
            value: "Assistance disponible",
            status: "success",
          },
          {
            label: "Abonnement",
            value: "Assistance disponible",
            status: "success",
          },
        ],
        advice:
          "WhatsApp service client : +243 994 864 173",
      };
    } else {
      result = {
        type: "default",
        title: "Je suis prêt à vous aider",
        description:
          "Posez une question sur votre commerce et je vais analyser les données disponibles.",
        items: [
          {
            label: "📊 Ventes",
            value: "Analyse des ventes",
            status: "normal",
          },
          {
            label: "📈 Bénéfice",
            value: "Analyse de la rentabilité",
            status: "normal",
          },
          {
            label: "📦 Stock",
            value: "Produits en alerte",
            status: "normal",
          },
          {
            label: "💳 Dettes",
            value: "Clients débiteurs",
            status: "normal",
          },
        ],
        advice:
          "Essayez : « Mes ventes », « Mon bénéfice », « Quel produit est le plus vendu ? » ou « Donne-moi un rapport complet ».",
      };
    }

    setAnswer(result);
    setLoading(false);
  }

  const quickQuestions = [
    "Mes ventes",
    "Mon bénéfice",
    "Produit le plus vendu",
    "Stock faible",
    "Mes dettes clients",
    "Mes dépenses",
    "Résumé commerce",
    "Donne-moi des conseils",
    "Comment installer ?",
  ];

  return (
    <>
      <main
        className="
          min-h-screen
          w-full
          overflow-x-hidden
          bg-[#081221]
          px-3
          py-5
          pb-28
          text-white
          sm:px-5
          sm:py-6
        "
      >
        <div
          className="
            mx-auto
            w-full
            max-w-5xl
            space-y-5
            sm:space-y-6
          "
        >
          {/* HEADER */}

          <section
            className="
              w-full
              overflow-hidden
              rounded-3xl
              border
              border-white/10
              bg-white/5
              p-4
              shadow-2xl
              backdrop-blur-xl
              sm:p-6
            "
          >
            <div
              className="
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
                  sm:gap-4
                "
              >
                <div
                  className="
                    shrink-0
                    rounded-2xl
                    bg-orange-500/20
                    p-3
                    sm:rounded-3xl
                    sm:p-4
                  "
                >
                  <Bot
                    size={32}
                    className="text-orange-400 sm:h-10 sm:w-10"
                  />
                </div>

                <div className="min-w-0">
                  <h1
                    className="
                      truncate
                      text-xl
                      font-black
                      sm:text-3xl
                    "
                  >
                    Assistant Biso
                  </h1>

                  <p
                    className="
                      mt-1
                      truncate
                      text-xs
                      text-slate-400
                      sm:text-sm
                    "
                  >
                    Votre conseiller intelligent de commerce
                  </p>
                </div>
              </div>

              <div
                className={`
                  flex
                  shrink-0
                  items-center
                  gap-1.5
                  rounded-full
                  px-3
                  py-2
                  text-[11px]
                  font-black
                  ${
                    isOnline
                      ? "bg-green-500/10 text-green-400"
                      : "bg-red-500/10 text-red-400"
                  }
                `}
              >
                <span
                  className={`
                    h-2
                    w-2
                    rounded-full
                    ${
                      isOnline
                        ? "bg-green-400"
                        : "bg-red-400"
                    }
                  `}
                />

                <span className="hidden sm:inline">
                  {isOnline
                    ? "En ligne"
                    : "Hors connexion"}
                </span>
              </div>
            </div>
          </section>

          {/* STATISTIQUES */}

          <section
            className="
              grid
              w-full
              grid-cols-2
              gap-3
              sm:gap-4
            "
          >
            <AssistantStatCard
              icon={
                <TrendingUp
                  size={21}
                  className="text-orange-400"
                />
              }
              title="Ventes"
              value={sales.length}
              className="border-orange-400/20 bg-orange-500/10"
            />

            <AssistantStatCard
              icon={
                <Package
                  size={21}
                  className="text-blue-400"
                />
              }
              title="Produits"
              value={products.length}
              className="border-blue-400/20 bg-blue-500/10"
            />

            <AssistantStatCard
              icon={
                <Wallet
                  size={21}
                  className="text-green-400"
                />
              }
              title="Dettes"
              value={debts.length}
              className="border-green-400/20 bg-green-500/10"
            />

            <AssistantStatCard
              icon={
                <AlertTriangle
                  size={21}
                  className="text-red-400"
                />
              }
              title="Stock faible"
              value={
                products.filter(
                  (p) => Number(p.stock) <= 5
                ).length
              }
              className="border-red-400/20 bg-red-500/10"
            />
          </section>

          {/* QUESTIONS RAPIDES */}

          <section
            className="
              w-full
              overflow-hidden
              rounded-3xl
              border
              border-white/10
              bg-white/5
              p-4
              sm:p-5
            "
          >
            <div
              className="
                mb-4
                flex
                items-center
                gap-2
              "
            >
              <Sparkles
                size={20}
                className="shrink-0 text-orange-400"
              />

              <h2 className="text-base font-black sm:text-lg">
                Questions rapides
              </h2>
            </div>

            <div
              className="
                grid
                grid-cols-2
                gap-2.5
                sm:gap-3
              "
            >
              {quickQuestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => askAssistant(item)}
                  className="
                    min-h-[58px]
                    min-w-0
                    rounded-2xl
                    border
                    border-white/10
                    bg-black/30
                    px-3
                    py-3
                    text-left
                    text-xs
                    font-bold
                    leading-5
                    text-slate-200
                    transition
                    hover:border-orange-400/30
                    hover:bg-orange-500/10
                    active:scale-[0.98]
                    sm:px-4
                    sm:text-sm
                  "
                >
                  <span className="line-clamp-2">
                    {item}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* QUESTION */}

          <section
            className="
              w-full
              overflow-hidden
              rounded-3xl
              border
              border-white/10
              bg-white/5
              p-4
              sm:p-5
            "
          >
            <h2 className="mb-4 font-black">
              🤖 Posez votre question
            </h2>

            <div
              className="
                flex
                w-full
                min-w-0
                gap-2
                sm:gap-3
              "
            >
              <input
                value={question}
                onChange={(e) =>
                  setQuestion(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    askAssistant();
                  }
                }}
                placeholder="Ex : Est-ce que mon commerce progresse ?"
                className="
                  min-w-0
                  flex-1
                  rounded-2xl
                  border
                  border-white/10
                  bg-black/40
                  px-3
                  py-3.5
                  text-sm
                  text-white
                  outline-none
                  placeholder:text-slate-500
                  focus:border-orange-400
                  sm:px-4
                  sm:py-4
                "
              />

              <button
                type="button"
                onClick={() => askAssistant()}
                disabled={loading}
                className="
                  flex
                  min-h-[52px]
                  w-[52px]
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-gradient-to-r
                  from-orange-500
                  to-yellow-400
                  font-black
                  text-black
                  transition
                  active:scale-95
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  sm:w-[60px]
                "
              >
                {loading ? (
                  <RefreshCw
                    size={20}
                    className="animate-spin"
                  />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          </section>

          {/* ==================================================
              BELLE REPONSE ASSISTANT
          ================================================== */}

          {answer && (
            <AssistantResponse result={answer} />
          )}
        </div>
      </main>

      {/* ==================================================
          POPUP CONNEXION
      ================================================== */}

      {showConnectionPopup && (
        <div
          className="
            fixed
            inset-0
            z-[9999]
            flex
            items-center
            justify-center
            bg-black/70
            px-4
            backdrop-blur-md
          "
        >
          <div
            className="
              relative
              w-full
              max-w-sm
              overflow-hidden
              rounded-3xl
              border
              border-white/10
              bg-[#111c2e]
              p-6
              shadow-2xl
              sm:p-7
            "
          >
            <button
              type="button"
              onClick={() =>
                setShowConnectionPopup(false)
              }
              className="
                absolute
                right-4
                top-4
                rounded-xl
                bg-white/5
                p-2
                text-slate-400
                transition
                hover:text-white
              "
            >
              <X size={18} />
            </button>

            <div className="text-center">
              <div
                className="
                  mx-auto
                  mb-5
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-3xl
                  bg-orange-500/15
                "
              >
                <WifiOff
                  size={30}
                  className="text-orange-400"
                />
              </div>

              <h2 className="text-xl font-black text-white">
                Connexion requise
              </h2>

              <p
                className="
                  mt-3
                  text-sm
                  leading-6
                  text-slate-400
                "
              >
                L'Assistant Biso a besoin d'une
                connexion Internet pour analyser
                les données de votre commerce.
              </p>

              <div
                className="
                  mt-5
                  rounded-2xl
                  border
                  border-orange-400/10
                  bg-orange-500/5
                  p-4
                  text-left
                "
              >
                <p className="text-xs font-bold leading-5 text-slate-300">
                  📡 Connectez votre téléphone à
                  Internet puis réessayez.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (navigator.onLine) {
                    setIsOnline(true);
                    setShowConnectionPopup(false);
                    loadData();
                  }
                }}
                className="
                  mt-5
                  flex
                  min-h-[52px]
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-2xl
                  bg-gradient-to-r
                  from-orange-500
                  to-yellow-400
                  px-5
                  py-3
                  font-black
                  text-black
                  transition
                  active:scale-[0.98]
                "
              >
                <RefreshCw size={19} />
                Vérifier la connexion
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ======================================================
   CARTE STATISTIQUE
====================================================== */

function AssistantStatCard({
  icon,
  title,
  value,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  className: string;
}) {
  return (
    <div
      className={`
        min-w-0
        overflow-hidden
        rounded-3xl
        border
        p-4
        sm:p-5
        ${className}
      `}
    >
      <div
        className="
          flex
          min-w-0
          items-start
          justify-between
          gap-2
        "
      >
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-400 sm:text-sm">
            {title}
          </p>

          <p className="mt-1 text-2xl font-black text-white sm:text-3xl">
            {value}
          </p>
        </div>

        <div
          className="
            shrink-0
            rounded-2xl
            bg-black/20
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

/* ======================================================
   REPONSE ASSISTANT
====================================================== */

function AssistantResponse({
  result,
}: {
  result: AssistantResult;
}) {
  const getMainIcon = () => {
    switch (result.type) {
      case "sales":
        return (
          <TrendingUp
            size={24}
            className="text-orange-400"
          />
        );

      case "profit":
        return (
          <CircleDollarSign
            size={24}
            className="text-green-400"
          />
        );

      case "stock":
        return (
          <Package
            size={24}
            className="text-blue-400"
          />
        );

      case "debts":
        return (
          <Wallet
            size={24}
            className="text-orange-400"
          />
        );

      case "expenses":
        return (
          <BarChart3
            size={24}
            className="text-red-400"
          />
        );

      case "products":
        return (
          <ShoppingCart
            size={24}
            className="text-purple-400"
          />
        );

      case "advice":
        return (
          <Lightbulb
            size={24}
            className="text-yellow-400"
          />
        );

      default:
        return (
          <Sparkles
            size={24}
            className="text-orange-400"
          />
        );
    }
  };

  return (
    <section
      className="
        w-full
        overflow-hidden
        rounded-3xl
        border
        border-white/10
        bg-[#0d1a2c]
        shadow-2xl
      "
    >
      {/* EN-TETE REPONSE */}

      <div
        className="
          border-b
          border-white/10
          bg-gradient-to-r
          from-orange-500/10
          via-white/5
          to-transparent
          p-5
          sm:p-6
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
              h-12
              w-12
              shrink-0
              items-center
              justify-center
              rounded-2xl
              bg-white/5
            "
          >
            {getMainIcon()}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="
                  rounded-full
                  bg-green-500/10
                  px-2.5
                  py-1
                  text-[10px]
                  font-black
                  uppercase
                  tracking-wide
                  text-green-400
                "
              >
                Analyse terminée
              </span>
            </div>

            <h2
              className="
                mt-2
                break-words
                text-xl
                font-black
                text-white
                sm:text-2xl
              "
            >
              {result.title}
            </h2>

            <p
              className="
                mt-1
                text-xs
                leading-5
                text-slate-400
                sm:text-sm
              "
            >
              {result.description}
            </p>
          </div>
        </div>
      </div>

      {/* STATISTIQUES */}

      {result.stats &&
        result.stats.length > 0 && (
          <div className="p-4 sm:p-5">
            <div
              className="
                grid
                grid-cols-2
                gap-3
              "
            >
              {result.stats.map((stat, index) => (
                <ResponseStat
                  key={`${stat.label}-${index}`}
                  stat={stat}
                />
              ))}
            </div>
          </div>
        )}

      {/* INFORMATIONS */}

      {result.items &&
        result.items.length > 0 && (
          <div
            className="
              border-t
              border-white/10
              p-4
              sm:p-5
            "
          >
            <div className="mb-3 flex items-center gap-2">
              <BarChart3
                size={17}
                className="text-slate-400"
              />

              <p className="text-sm font-black text-white">
                Détails
              </p>
            </div>

            <div className="grid gap-2.5">
              {result.items.map((item, index) => (
                <ResponseItem
                  key={`${item.label}-${index}`}
                  item={item}
                />
              ))}
            </div>
          </div>
        )}

      {/* CONSEIL */}

      {result.advice && (
        <div
          className="
            border-t
            border-white/10
            p-4
            sm:p-5
          "
        >
          <div
            className="
              overflow-hidden
              rounded-2xl
              border
              border-yellow-400/10
              bg-yellow-400/5
              p-4
            "
          >
            <div className="flex gap-3">
              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-yellow-400/10
                "
              >
                <Lightbulb
                  size={18}
                  className="text-yellow-400"
                />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-yellow-400">
                  Conseil de l'Assistant
                </p>

                <p
                  className="
                    mt-1
                    break-words
                    text-sm
                    leading-6
                    text-slate-300
                  "
                >
                  {result.advice}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ======================================================
   STAT REPONSE
====================================================== */

function ResponseStat({
  stat,
}: {
  stat: {
    label: string;
    value: string;
    icon: "money" | "sales" | "profit" | "users" | "stock";
  };
}) {
  const icon = () => {
    if (stat.icon === "money") {
      return (
        <CircleDollarSign
          size={19}
          className="text-orange-400"
        />
      );
    }

    if (stat.icon === "sales") {
      return (
        <ShoppingCart
          size={19}
          className="text-blue-400"
        />
      );
    }

    if (stat.icon === "profit") {
      return (
        <TrendingUp
          size={19}
          className="text-green-400"
        />
      );
    }

    if (stat.icon === "users") {
      return (
        <Users
          size={19}
          className="text-purple-400"
        />
      );
    }

    return (
      <Package
        size={19}
        className="text-blue-400"
      />
    );
  };

  return (
    <div
      className="
        min-w-0
        overflow-hidden
        rounded-2xl
        border
        border-white/10
        bg-black/20
        p-3.5
        sm:p-4
      "
    >
      <div className="flex items-center gap-2">
        <div
          className="
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-white/5
          "
        >
          {icon()}
        </div>

        <p
          className="
            min-w-0
            truncate
            text-[11px]
            font-bold
            text-slate-500
            sm:text-xs
          "
        >
          {stat.label}
        </p>
      </div>

      <p
        className="
          mt-3
          break-words
          text-lg
          font-black
          text-white
          sm:text-xl
        "
      >
        {stat.value}
      </p>
    </div>
  );
}

/* ======================================================
   LIGNE DETAIL
====================================================== */

function ResponseItem({
  item,
}: {
  item: {
    label: string;
    value?: string;
    status?: "success" | "warning" | "danger" | "normal";
  };
}) {
  const status = item.status || "normal";

  const statusClass =
    status === "success"
      ? "border-green-400/10 bg-green-500/5"
      : status === "warning"
      ? "border-yellow-400/10 bg-yellow-500/5"
      : status === "danger"
      ? "border-red-400/10 bg-red-500/5"
      : "border-white/10 bg-black/20";

  const icon =
    status === "success" ? (
      <div className="h-2 w-2 rounded-full bg-green-400" />
    ) : status === "warning" ? (
      <div className="h-2 w-2 rounded-full bg-yellow-400" />
    ) : status === "danger" ? (
      <div className="h-2 w-2 rounded-full bg-red-400" />
    ) : (
      <div className="h-2 w-2 rounded-full bg-slate-500" />
    );

  return (
    <div
      className={`
        flex
        min-w-0
        items-center
        justify-between
        gap-3
        rounded-2xl
        border
        px-4
        py-3
        ${statusClass}
      `}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="shrink-0">{icon}</div>

        <p
          className="
            min-w-0
            break-words
            text-xs
            font-bold
            text-slate-300
            sm:text-sm
          "
        >
          {item.label}
        </p>
      </div>

      {item.value && (
        <p
          className="
            max-w-[55%]
            shrink-0
            break-words
            text-right
            text-xs
            font-black
            text-white
            sm:text-sm
          "
        >
          {item.value}
        </p>
      )}
    </div>
  );
}