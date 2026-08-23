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
  MessageCircle,
  BarChart3,
  Receipt,
  CreditCard,
  CheckCircle2,
  Loader2,
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

// ======================================================
// STAT CARD
// ======================================================

function StatCard({
  title,
  value,
  description,
  icon,
  iconClassName,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  iconClassName: string;
}) {
  return (
    <div
      className="
        w-full
        rounded-[26px]
        border
        border-slate-200
        bg-white
        p-5
        shadow-[0_8px_30px_rgba(15,23,42,0.04)]
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`
            shrink-0
            rounded-2xl
            p-3
            ${iconClassName}
          `}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

// ======================================================
// PAGE ASSISTANT
// ======================================================

export default function AssistantPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // ======================================================
  // CHARGEMENT
  // ======================================================

  useEffect(() => {
    loadData();
  }, []);

  // ======================================================
  // CHARGER LES DONNÉES
  // ======================================================

  async function loadData() {
    setLoadingData(true);

    try {
      const phone = localStorage.getItem("phone");

      if (!phone) {
        setLoadingData(false);
        return;
      }

      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("phone", phone)
        .single();

      if (!user) {
        setLoadingData(false);
        return;
      }

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

      setSales(salesData || []);
      setProducts(productsData || []);
      setExpenses(expensesData || []);
      setDebts(debtsData || []);
    } catch (error) {
      console.log("Erreur chargement assistant :", error);
    } finally {
      setLoadingData(false);
    }
  }

  // ======================================================
  // FORMAT ARGENT
  // ======================================================

  function formatMoney(value: number) {
    return Math.round(Number(value || 0))
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  // ======================================================
  // ANALYSE COMMERCE
  // ======================================================

  function analyseCommerce(type: string) {
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

    const produits: Record<string, number> = {};

    sales.forEach((s) => {
      produits[s.product_name] =
        (produits[s.product_name] || 0) +
        Number(s.quantity || 0);
    });

    const meilleurProduit = Object.entries(produits).sort(
      (a, b) => b[1] - a[1]
    )[0];

    // ====================================================
    // VENTES
    // ====================================================

    if (type === "ventes") {
      return `
📊 ANALYSE DES VENTES

💰 Chiffre d'affaires
${formatMoney(totalVentes)} FC

🛒 Nombre de ventes
${sales.length}

🏆 Produit le plus vendu
${meilleurProduit?.[0] || "Aucun produit vendu"}

📦 Quantité du produit principal
${meilleurProduit?.[1] || 0}

💡 CONSEIL

Continuez à développer les produits qui attirent le plus vos clients.
      `.trim();
    }

    // ====================================================
    // BENEFICE
    // ====================================================

    if (type === "benefice") {
      return `
📈 ANALYSE DU BÉNÉFICE

💰 Bénéfice actuel
${formatMoney(totalProfit)} FC

📊 Total des ventes
${formatMoney(totalVentes)} FC

💸 Dépenses enregistrées
${formatMoney(totalDepenses)} FC

💡 CONSEIL

Favorisez les produits qui possèdent une meilleure marge et surveillez vos dépenses.
      `.trim();
    }

    // ====================================================
    // STOCK
    // ====================================================

    if (type === "stock") {
      return `
📦 ANALYSE DU STOCK

⚠️ Produits en alerte
${stockFaible.length}

${
  stockFaible.length
    ? stockFaible
        .map(
          (p) =>
            `• ${p.name} : ${p.stock} ${p.unit}`
        )
        .join("\n")
    : "✅ Aucun produit en rupture ou en stock faible."
}

💡 CONSEIL

Réapprovisionnez les produits faibles avant de perdre des ventes.
      `.trim();
    }

    // ====================================================
    // DETTES
    // ====================================================

    if (type === "dettes") {
      return `
💳 ANALYSE DES DETTES CLIENTS

💰 Montant restant
${formatMoney(totalDettes)} FC

👥 Clients débiteurs
${debts.length}

💡 CONSEIL

Relancez en priorité les clients ayant les plus grandes dettes afin d'améliorer votre trésorerie.
      `.trim();
    }

    // ====================================================
    // GLOBAL
    // ====================================================

    return `
📊 RAPPORT GLOBAL BISO-COMMERCE

💰 Chiffre d'affaires
${formatMoney(totalVentes)} FC

📈 Bénéfice
${formatMoney(totalProfit)} FC

💸 Dépenses
${formatMoney(totalDepenses)} FC

📦 Nombre de produits
${products.length}

⚠️ Stock faible
${stockFaible.length}

💳 Dettes clients
${formatMoney(totalDettes)} FC

🛒 Nombre de ventes
${sales.length}

🔎 PRIORITÉS

1️⃣ Surveiller les produits en stock faible.

2️⃣ Suivre régulièrement les dettes clients.

3️⃣ Favoriser les produits rentables.

4️⃣ Contrôler les dépenses du commerce.
    `.trim();
  }

  // ======================================================
  // TOP PRODUITS
  // ======================================================

  function analyseTopProduits() {
    const classement: Record<string, number> = {};

    sales.forEach((s) => {
      classement[s.product_name] =
        (classement[s.product_name] || 0) +
        Number(s.quantity || 0);
    });

    const top = Object.entries(classement)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return `
🏆 TOP PRODUITS

${
  top.length === 0
    ? "Aucune vente disponible."
    : top
        .map(
          (item, index) =>
            `${index + 1}️⃣ ${item[0]} : ${item[1]} vendu(s)`
        )
        .join("\n")
}

💡 CONSEIL

Mettez davantage en avant les produits qui se vendent rapidement.
    `.trim();
  }

  // ======================================================
  // DEPENSES
  // ======================================================

  function analyseDepenses() {
    let total = 0;

    expenses.forEach((e) => {
      total += Number(e.amount || 0);
    });

    return `
💸 ANALYSE DES DÉPENSES

💰 Total des dépenses
${formatMoney(total)} FC

🧾 Nombre de dépenses
${expenses.length}

💡 CONSEIL

Contrôlez régulièrement vos sorties d'argent afin de protéger vos bénéfices.
    `.trim();
  }

  // ======================================================
  // CONSEILS
  // ======================================================

  function analyseConseils() {
    const faible = products.filter(
      (p) => Number(p.stock) <= 5
    );

    return `
🚀 CONSEILS POUR VOTRE COMMERCE

${
  faible.length
    ? "⚠️ Certains produits doivent être réapprovisionnés."
    : "✅ Votre stock est actuellement bien surveillé."
}

💳 Suivez régulièrement les dettes clients.

📈 Analysez les produits qui rapportent le plus.

💰 Réinvestissez une partie des bénéfices.

📊 Consultez vos rapports chaque semaine.

💡 Une bonne gestion du stock et de la trésorerie permet de mieux protéger les bénéfices.
    `.trim();
  }

  // ======================================================
  // QUESTION ASSISTANT
  // ======================================================

  async function askAssistant(text?: string) {
    const userQuestion = (text || question)
      .toLowerCase()
      .trim();

    if (!userQuestion) {
      return;
    }

    setLoading(true);

    // Petite attente pour donner un retour visuel
    await new Promise((resolve) =>
      setTimeout(resolve, 250)
    );

    let result = "";

    // ====================================================
    // TOP PRODUITS EN PREMIER
    // ====================================================

    if (
      userQuestion.includes("produit le plus vendu") ||
      userQuestion.includes("plus vendu") ||
      userQuestion.includes("top produit") ||
      userQuestion.includes("top produits") ||
      userQuestion.includes("produit populaire") ||
      userQuestion.includes("vend le plus") ||
      userQuestion.includes("meilleur produit")
    ) {
      result = analyseTopProduits();
    }

    // ====================================================
    // VENTES
    // ====================================================

    else if (
      userQuestion.includes("vente") ||
      userQuestion.includes("vendu") ||
      userQuestion.includes("chiffre") ||
      userQuestion.includes(" ca ") ||
      userQuestion === "ca" ||
      userQuestion.includes("revenu") ||
      userQuestion.includes("aujourd'hui") ||
      userQuestion.includes("aujourd’hui")
    ) {
      result = analyseCommerce("ventes");
    }

    // ====================================================
    // BENEFICE
    // ====================================================

    else if (
      userQuestion.includes("bénéfice") ||
      userQuestion.includes("benefice") ||
      userQuestion.includes("profit") ||
      userQuestion.includes("gain") ||
      userQuestion.includes("marge") ||
      userQuestion.includes("rentable") ||
      userQuestion.includes("argent gagné") ||
      userQuestion.includes("argent gagne")
    ) {
      result = analyseCommerce("benefice");
    }

    // ====================================================
    // STOCK
    // ====================================================

    else if (
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
    }

    // ====================================================
    // DETTES
    // ====================================================

    else if (
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
      result = analyseCommerce("dettes");
    }

    // ====================================================
    // DEPENSES
    // ====================================================

    else if (
      userQuestion.includes("dépense") ||
      userQuestion.includes("depense") ||
      userQuestion.includes("dépensé") ||
      userQuestion.includes("depense")
    ) {
      result = analyseDepenses();
    }

    // ====================================================
    // CONSEILS
    // ====================================================

    else if (
      userQuestion.includes("conseil") ||
      userQuestion.includes("aide") ||
      userQuestion.includes("améliorer")
    ) {
      result = analyseConseils();
    }

    // ====================================================
    // RAPPORT GLOBAL
    // ====================================================

    else if (
      userQuestion.includes("résumé") ||
      userQuestion.includes("resume") ||
      userQuestion.includes("rapport") ||
      userQuestion.includes("commerce")
    ) {
      result = analyseCommerce("global");
    }

    // ====================================================
    // AJOUT PRODUIT
    // ====================================================

    else if (
      userQuestion.includes("ajouter un produit") ||
      userQuestion.includes("comment ajouter") ||
      userQuestion.includes("créer un produit") ||
      userQuestion.includes("creer un produit") ||
      userQuestion.includes("nouveau produit")
    ) {
      result = `
📦 AJOUTER UN PRODUIT SUR BISO-COMMERCE

1️⃣ Ouvrez le menu :

📦 Produits

Puis cliquez sur :

➕ Ajouter un produit

2️⃣ Entrez le nom du produit.

Exemples :

• Paracétamol
• Riz 25Kg
• Coca-Cola
• Savon

3️⃣ Choisissez l'unité :

✅ Pièce
✅ Carton
✅ Boîte
✅ Sachet
✅ Kg

4️⃣ Entrez la quantité achetée.

Exemple :

📦 2 cartons

📦 24 pièces par carton

Biso-Commerce calcule automatiquement le stock disponible.

5️⃣ Ajoutez les prix d'achat et de vente.

6️⃣ Cliquez sur :

✅ Ajouter le produit

💡 CONSEIL DU PDG

Ajoutez toujours vos produits avant de commencer les ventes afin que Biso-Commerce puisse calculer correctement le stock, les ventes et les bénéfices.
      `.trim();
    }

    // ====================================================
    // INSTALLATION
    // ====================================================

    else if (
      userQuestion.includes("installer l'application") ||
      userQuestion.includes("installation") ||
      userQuestion.includes("installer") ||
      userQuestion.includes("application")
    ) {
      result = `
📱 INSTALLATION DE BISO-COMMERCE

🌐 Ouvrez :

https://bisocommerce.vercel.app

━━━━━━━━━━━━━━━━━━
🤖 ANDROID
━━━━━━━━━━━━━━━━━━

1️⃣ Ouvrez le lien avec Google Chrome.

2️⃣ Attendez le chargement complet.

3️⃣ Appuyez sur les trois points ⋮.

4️⃣ Choisissez :

📲 Installer l'application

ou

📲 Ajouter à l'écran d'accueil.

5️⃣ Appuyez sur Installer.

L'icône Biso-Commerce apparaîtra sur votre écran d'accueil.

━━━━━━━━━━━━━━━━━━
🍎 IPHONE
━━━━━━━━━━━━━━━━━━

1️⃣ Ouvrez le lien avec Safari.

2️⃣ Appuyez sur Partager.

3️⃣ Choisissez :

"Sur l'écran d'accueil"

4️⃣ Appuyez sur Ajouter.

L'application apparaîtra ensuite sur votre écran d'accueil.

💡 ASTUCE

Après l'installation, utilisez directement l'icône Biso-Commerce comme une application normale.
      `.trim();
    }

    // ====================================================
    // SUPPORT
    // ====================================================

    else if (
      userQuestion.includes("problème") ||
      userQuestion.includes("probleme") ||
      userQuestion.includes("support") ||
      userQuestion.includes("question")
    ) {
      result = `
🛠️ BESOIN D'ASSISTANCE ?

Le service client Biso-Commerce peut vous aider concernant :

✅ Installation de l'application

✅ Création des produits

✅ Gestion des ventes

✅ Problèmes techniques

✅ Abonnement

✅ Questions sur l'utilisation

📲 Service client WhatsApp :

+243 994 864 173

Notre équipe pourra vous accompagner.

🚀 Merci d'utiliser BISO-COMMERCE.
      `.trim();
    }

    // ====================================================
    // REPONSE PAR DEFAUT
    // ====================================================

    else {
      result = `
🤖 ASSISTANT BISO

Je peux analyser votre commerce et vous aider à comprendre vos données.

Essayez par exemple :

• Mes ventes aujourd'hui
• Quel produit est le plus vendu ?
• Quel est mon bénéfice ?
• Quels produits sont en rupture ?
• Qui me doit de l'argent ?
• Combien ai-je dépensé ?
• Donne-moi un rapport complet
• Donne-moi des conseils
• Comment ajouter un produit ?
• Comment installer l'application ?
      `.trim();
    }

    setAnswer(result);
    setQuestion("");
    setLoading(false);
  }

  // ======================================================
  // QUESTIONS RAPIDES
  // ======================================================

  const quickQuestions = [
    {
      label: "Mes ventes",
      icon: <TrendingUp size={18} />,
    },
    {
      label: "Mon bénéfice",
      icon: <BarChart3 size={18} />,
    },
    {
      label: "Produit le plus vendu",
      icon: <Package size={18} />,
    },
    {
      label: "Stock faible",
      icon: <AlertTriangle size={18} />,
    },
    {
      label: "Mes dettes clients",
      icon: <CreditCard size={18} />,
    },
    {
      label: "Mes dépenses",
      icon: <Receipt size={18} />,
    },
    {
      label: "Résumé commerce",
      icon: <Wallet size={18} />,
    },
    {
      label: "Donne-moi des conseils",
      icon: <Lightbulb size={18} />,
    },
    {
      label: "Comment installer ?",
      icon: <Sparkles size={18} />,
    },
  ];

  // ======================================================
  // AFFICHAGE
  // ======================================================

  return (
    <main
      className="
        min-h-screen
        w-full
        overflow-x-hidden
        bg-[#f5f7fb]
        px-4
        py-5
        pb-28
        text-slate-900
        sm:px-6
        sm:py-7
      "
    >
      <div
        className="
          mx-auto
          w-full
          max-w-6xl
          space-y-5
        "
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <section
          className="
            w-full
            overflow-hidden
            rounded-[26px]
            border
            border-slate-200
            bg-white
            p-5
            shadow-[0_8px_30px_rgba(15,23,42,0.04)]
            sm:p-7
          "
        >
          <div className="flex items-center gap-4">
            <div
              className="
                shrink-0
                rounded-2xl
                bg-indigo-50
                p-3
                sm:p-4
              "
            >
              <Bot
                size={32}
                className="text-indigo-600 sm:h-9 sm:w-9"
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className="
                    text-2xl
                    font-black
                    tracking-tight
                    text-slate-900
                    sm:text-3xl
                  "
                >
                  Assistant Biso
                </h1>

                <span
                  className="
                    rounded-full
                    bg-indigo-50
                    px-3
                    py-1
                    text-[11px]
                    font-black
                    text-indigo-600
                  "
                >
                  INTELLIGENT
                </span>
              </div>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Votre conseiller intelligent pour comprendre
                et améliorer votre commerce.
              </p>
            </div>
          </div>
        </section>

        {/* ==================================================
            ETAT CHARGEMENT
        ================================================== */}

        {loadingData && (
          <div
            className="
              flex
              items-center
              gap-3
              rounded-[26px]
              border
              border-indigo-100
              bg-indigo-50
              p-4
              text-sm
              font-bold
              text-indigo-700
            "
          >
            <Loader2
              size={20}
              className="animate-spin"
            />

            Analyse des données de votre commerce...
          </div>
        )}

        {/* ==================================================
            STATISTIQUES
        ================================================== */}

        <section
          className="
            grid
            grid-cols-1
            gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >
          <StatCard
            title="Ventes"
            value={sales.length}
            description="Ventes enregistrées"
            icon={
              <TrendingUp
                size={23}
                className="text-indigo-600"
              />
            }
            iconClassName="bg-indigo-50"
          />

          <StatCard
            title="Produits"
            value={products.length}
            description="Produits dans le stock"
            icon={
              <Package
                size={23}
                className="text-indigo-600"
              />
            }
            iconClassName="bg-indigo-50"
          />

          <StatCard
            title="Dettes"
            value={debts.length}
            description="Clients débiteurs"
            icon={
              <CreditCard
                size={23}
                className="text-indigo-600"
              />
            }
            iconClassName="bg-indigo-50"
          />

          <StatCard
            title="Stock faible"
            value={
              products.filter(
                (p) => Number(p.stock) <= 5
              ).length
            }
            description="Produits à surveiller"
            icon={
              <AlertTriangle
                size={23}
                className="text-red-600"
              />
            }
            iconClassName="bg-red-50"
          />
        </section>

        {/* ==================================================
            QUESTIONS RAPIDES
        ================================================== */}

        <section
          className="
            w-full
            overflow-hidden
            rounded-[26px]
            border
            border-slate-200
            bg-white
            p-5
            shadow-[0_8px_30px_rgba(15,23,42,0.04)]
            sm:p-6
          "
        >
          <div className="mb-5 flex items-center gap-3">
            <div
              className="
                rounded-2xl
                bg-indigo-50
                p-2.5
              "
            >
              <Sparkles
                size={20}
                className="text-indigo-600"
              />
            </div>

            <div>
              <h2 className="font-black text-slate-900">
                Questions rapides
              </h2>

              <p className="mt-0.5 text-xs text-slate-400">
                Obtenez rapidement une analyse
              </p>
            </div>
          </div>

          <div
            className="
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-2
              lg:grid-cols-3
            "
          >
            {quickQuestions.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() =>
                  askAssistant(item.label)
                }
                disabled={loading}
                className="
                  flex
                  min-h-[56px]
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  border-slate-200
                  bg-slate-50
                  px-4
                  py-3
                  text-left
                  text-sm
                  font-bold
                  text-slate-700
                  transition
                  hover:border-indigo-200
                  hover:bg-indigo-50
                  hover:text-indigo-700
                  active:scale-[0.99]
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <span
                  className="
                    flex
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-white
                    p-2
                    text-indigo-600
                    shadow-sm
                  "
                >
                  {item.icon}
                </span>

                <span className="min-w-0">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ==================================================
            QUESTION PERSONNALISEE
        ================================================== */}

        <section
          className="
            w-full
            overflow-hidden
            rounded-[26px]
            border
            border-slate-200
            bg-white
            p-5
            shadow-[0_8px_30px_rgba(15,23,42,0.04)]
            sm:p-6
          "
        >
          <div className="mb-5 flex items-center gap-3">
            <div
              className="
                rounded-2xl
                bg-indigo-50
                p-2.5
              "
            >
              <MessageCircle
                size={20}
                className="text-indigo-600"
              />
            </div>

            <div>
              <h2 className="font-black text-slate-900">
                Posez votre question
              </h2>

              <p className="mt-0.5 text-xs text-slate-400">
                Demandez une analyse de votre commerce
              </p>
            </div>
          </div>

          <div
            className="
              flex
              flex-col
              gap-3
              sm:flex-row
            "
          >
            <input
              value={question}
              onChange={(e) =>
                setQuestion(e.target.value)
              }
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !loading
                ) {
                  askAssistant();
                }
              }}
              placeholder="Ex : Est-ce que mon commerce progresse ?"
              className="
                min-h-[54px]
                min-w-0
                flex-1
                rounded-2xl
                border
                border-slate-200
                bg-slate-50
                px-4
                text-sm
                font-medium
                text-slate-900
                outline-none
                transition
                placeholder:text-slate-400
                focus:border-indigo-400
                focus:bg-white
                focus:ring-4
                focus:ring-indigo-100
              "
            />

            <button
              type="button"
              onClick={() =>
                askAssistant()
              }
              disabled={
                loading ||
                !question.trim()
              }
              className="
                flex
                min-h-[54px]
                shrink-0
                items-center
                justify-center
                gap-2
                rounded-2xl
                bg-indigo-600
                px-6
                font-black
                text-white
                shadow-sm
                transition
                hover:bg-indigo-700
                active:scale-[0.98]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {loading ? (
                <>
                  <Loader2
                    size={19}
                    className="animate-spin"
                  />

                  Analyse...
                </>
              ) : (
                <>
                  <Send size={19} />

                  Analyser
                </>
              )}
            </button>
          </div>
        </section>

        {/* ==================================================
            REPONSE ASSISTANT
        ================================================== */}

        {answer && (
          <section
            className="
              w-full
              overflow-hidden
              rounded-[26px]
              border
              border-indigo-100
              bg-white
              shadow-[0_10px_35px_rgba(79,70,229,0.07)]
            "
          >
            {/* EN-TETE REPONSE */}

            <div
              className="
                border-b
                border-indigo-100
                bg-indigo-50/70
                p-5
                sm:p-6
              "
            >
              <div className="flex items-start gap-3">
                <div
                  className="
                    shrink-0
                    rounded-2xl
                    bg-indigo-600
                    p-3
                    shadow-sm
                  "
                >
                  <Lightbulb
                    size={22}
                    className="text-white"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      className="
                        text-lg
                        font-black
                        text-slate-900
                      "
                    >
                      Analyse Assistant
                    </h2>

                    <span
                      className="
                        flex
                        items-center
                        gap-1
                        rounded-full
                        bg-green-100
                        px-2.5
                        py-1
                        text-[10px]
                        font-black
                        text-green-700
                      "
                    >
                      <CheckCircle2 size={12} />

                      ANALYSE TERMINÉE
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Voici les informations disponibles
                    concernant votre commerce.
                  </p>
                </div>
              </div>
            </div>

            {/* CONTENU REPONSE */}

            <div className="p-5 sm:p-7">
              <div
                className="
                  overflow-hidden
                  rounded-2xl
                  border
                  border-slate-200
                  bg-slate-50
                "
              >
                <div
                  className="
                    whitespace-pre-line
                    break-words
                    p-5
                    text-[15px]
                    font-medium
                    leading-7
                    text-slate-700
                    sm:p-6
                  "
                >
                  {answer}
                </div>
              </div>

              {/* PETIT RAPPEL */}

              <div
                className="
                  mt-4
                  flex
                  items-start
                  gap-3
                  rounded-2xl
                  border
                  border-indigo-100
                  bg-indigo-50/60
                  p-4
                "
              >
                <Bot
                  size={19}
                  className="
                    mt-0.5
                    shrink-0
                    text-indigo-600
                  "
                />

                <p className="text-xs leading-5 text-indigo-700">
                  L'Assistant Biso analyse les données
                  enregistrées dans votre commerce pour
                  vous donner une réponse basée sur vos
                  ventes, produits, dépenses et dettes.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ==================================================
            AUCUNE REPONSE
        ================================================== */}

        {!answer && !loading && (
          <section
            className="
              w-full
              rounded-[26px]
              border
              border-slate-200
              bg-white
              p-8
              text-center
              shadow-[0_8px_30px_rgba(15,23,42,0.04)]
              sm:p-10
            "
          >
            <div
              className="
                mx-auto
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-3xl
                bg-indigo-50
              "
            >
              <Bot
                size={30}
                className="text-indigo-600"
              />
            </div>

            <h2
              className="
                mt-4
                text-lg
                font-black
                text-slate-900
              "
            >
              Comment puis-je vous aider ?
            </h2>

            <p
              className="
                mx-auto
                mt-2
                max-w-xl
                text-sm
                leading-6
                text-slate-500
              "
            >
              Posez une question ci-dessus ou utilisez
              l'une des questions rapides pour obtenir une
              analyse de votre commerce.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}