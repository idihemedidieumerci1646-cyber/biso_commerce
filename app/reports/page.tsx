
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  Download,
  Search,
  Sparkles,
  ArrowUp,
  CalendarDays,
  X,
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

type DayReport = {
  fc: number;
  usd: number;
  profitFc: number;
  profitUsd: number;
  quantity: number;
};

export default function ReportsPage() {
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);

  const [selectedDate, setSelectedDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [showAll, setShowAll] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showTopButton, setShowTopButton] = useState(false);

  const [today, setToday] = useState<DayReport>({
    fc: 0,
    usd: 0,
    profitFc: 0,
    profitUsd: 0,
    quantity: 0,
  });

  const [yesterday, setYesterday] = useState<DayReport>({
    fc: 0,
    usd: 0,
    profitFc: 0,
    profitUsd: 0,
    quantity: 0,
  });

  const [beforeYesterday, setBeforeYesterday] =
    useState<DayReport>({
      fc: 0,
      usd: 0,
      profitFc: 0,
      profitUsd: 0,
      quantity: 0,
    });

  const [bestProduct, setBestProduct] =
    useState("Aucun");

  // ======================================================
  // CHARGEMENT INITIAL
  // ======================================================

  useEffect(() => {
    loadReports();
  }, []);

  // ======================================================
  // BOUTON RETOUR EN HAUT
  // ======================================================

  useEffect(() => {
    const handleScroll = () => {
      setShowTopButton(window.scrollY > 500);
    };

    window.addEventListener(
      "scroll",
      handleScroll
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ======================================================
  // FORMAT ARGENT
  // ======================================================

  const formatMoney = (value: number) => {
    return Math.round(
      Number(value || 0)
    ).toLocaleString("fr-FR");
  };

  // ======================================================
  // NETTOYAGE DU TEXTE POUR LE PDF
  // ======================================================

  const cleanPDF = (text: string) => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, "");
  };

  // ======================================================
  // CALCUL D'UNE JOURNÉE
  // ======================================================

  const calculateDayReport = (
    sales: Sale[],
    targetDate: string
  ): DayReport => {
    let fc = 0;
    let usd = 0;

    let profitFc = 0;
    let profitUsd = 0;

    let quantity = 0;

    sales.forEach((sale) => {
      const saleDate =
        sale.created_at.split("T")[0];

      if (saleDate !== targetDate) {
        return;
      }

      const amount =
        Number(sale.total_sale || 0);

      const profit =
        Number(sale.profit || 0);

      quantity += Number(
        sale.quantity || 0
      );

      if (sale.currency === "FC") {
        fc += amount;
        profitFc += profit;
      } else if (
        sale.currency === "$" ||
        sale.currency === "USD"
      ) {
        usd += amount;
        profitUsd += profit;
      }
    });

    return {
      fc,
      usd,
      profitFc,
      profitUsd,
      quantity,
    };
  };

  // ======================================================
  // CHARGEMENT DES VENTES
  // ======================================================

  const loadReports = async () => {
    try {
      const userId =
        localStorage.getItem("user_id");

      if (!userId) {
        return;
      }

      const { data, error } =
        await supabase
          .from("sales")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        console.log(
          "Erreur chargement ventes :",
          error
        );
        return;
      }

      const list =
        (data || []) as Sale[];

      setSalesHistory(list);
      setFilteredSales(list);

      // ==================================================
      // DATES
      // ==================================================

      const now = new Date();

      const todayDate =
        now.toISOString().split("T")[0];

      const yesterdayDate =
        new Date(now);

      yesterdayDate.setDate(
        now.getDate() - 1
      );

      const yesterdayString =
        yesterdayDate
          .toISOString()
          .split("T")[0];

      const beforeYesterdayDate =
        new Date(now);

      beforeYesterdayDate.setDate(
        now.getDate() - 2
      );

      const beforeYesterdayString =
        beforeYesterdayDate
          .toISOString()
          .split("T")[0];

      // ==================================================
      // RAPPORTS
      // ==================================================

      setToday(
        calculateDayReport(
          list,
          todayDate
        )
      );

      setYesterday(
        calculateDayReport(
          list,
          yesterdayString
        )
      );

      setBeforeYesterday(
        calculateDayReport(
          list,
          beforeYesterdayString
        )
      );

      // ==================================================
      // PRODUIT LE PLUS VENDU
      // ==================================================

      const products: Record<
        string,
        number
      > = {};

      list.forEach((sale) => {
        if (
          !products[
            sale.product_name
          ]
        ) {
          products[
            sale.product_name
          ] = 0;
        }

        products[
          sale.product_name
        ] += Number(
          sale.quantity || 0
        );
      });

      let best = "Aucun";
      let max = 0;

      Object.keys(products).forEach(
        (name) => {
          if (
            products[name] > max
          ) {
            max = products[name];
            best = name;
          }
        }
      );

      setBestProduct(best);
    } catch (error) {
      console.log(
        "Erreur générale :",
        error
      );
    }
  };

  // ======================================================
  // RECHERCHE D'UNE DATE
  // ======================================================

  const filterByDate = () => {
    if (!selectedDate) {
      alert(
        "Choisissez une date."
      );
      return;
    }

    const result =
      salesHistory.filter((sale) => {
        return (
          sale.created_at
            .split("T")[0] ===
          selectedDate
        );
      });

    setFilteredSales(result);
    setShowAll(false);
  };

  // ======================================================
  // RECHERCHE ENTRE DEUX DATES
  // ======================================================

  const filterByPeriod = () => {
    if (!startDate || !endDate) {
      alert(
        "Choisissez la date de début et la date de fin."
      );
      return;
    }

    if (startDate > endDate) {
      alert(
        "La date de début doit être avant la date de fin."
      );
      return;
    }

    const result =
      salesHistory.filter((sale) => {
        const saleDate =
          sale.created_at
            .split("T")[0];

        return (
          saleDate >= startDate &&
          saleDate <= endDate
        );
      });

    setFilteredSales(result);
    setShowAll(false);
  };

  // ======================================================
  // AFFICHER TOUTES LES VENTES
  // ======================================================

  const showEverything = () => {
    setFilteredSales(
      salesHistory
    );

    setShowAll(true);
  };

  // ======================================================
  // RÉINITIALISER
  // ======================================================

  const resetFilters = () => {
    setSelectedDate("");
    setStartDate("");
    setEndDate("");

    setFilteredSales(
      salesHistory
    );

    setShowAll(false);
  };

  // ======================================================
  // VENTES AFFICHÉES
  // ======================================================

  const displayedSales =
    showAll
      ? filteredSales
      : filteredSales.slice(0, 5);

  // ======================================================
  // CRÉATION DU PDF
  // ======================================================

  const downloadPDF = () => {
    let data: Sale[] = [];

    // --------------------------------------------------
    // PDF D'UNE SEULE DATE
    // --------------------------------------------------

    if (selectedDate) {
      data =
        salesHistory.filter(
          (sale) =>
            sale.created_at
              .split("T")[0] ===
            selectedDate
        );
    }

    // --------------------------------------------------
    // PDF D'UNE PÉRIODE
    // --------------------------------------------------

    else if (
      startDate &&
      endDate
    ) {
      data =
        salesHistory.filter(
          (sale) => {
            const saleDate =
              sale.created_at
                .split("T")[0];

            return (
              saleDate >= startDate &&
              saleDate <= endDate
            );
          }
        );
    }

    // --------------------------------------------------
    // PDF COMPLET
    // --------------------------------------------------

    else {
      data = salesHistory;
    }

    // --------------------------------------------------
    // AUCUNE VENTE
    // --------------------------------------------------

    if (data.length === 0) {
      if (selectedDate) {
        alert(
          `Aucune vente à la date ${selectedDate}.`
        );
      } else if (
        startDate &&
        endDate
      ) {
        alert(
          `Aucune vente du ${startDate} au ${endDate}.`
        );
      } else {
        alert(
          "Aucune vente trouvée."
        );
      }

      return;
    }

    // ==================================================
    // CRÉATION DOCUMENT PDF
    // ==================================================

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      putOnlyUsedFonts: true,
      compress: true,
    });

    doc.setFont(
      "helvetica",
      "normal"
    );

    // ==================================================
    // CALCULS
    // ==================================================

    let totalFc = 0;
    let totalUsd = 0;

    let profitFc = 0;
    let profitUsd = 0;

    let totalQuantity = 0;

    const produits: Record<
      string,
      {
        quantity: number;
        montant: number;
        currency: string;
        profit: number;
      }
    > = {};

    data.forEach((sale) => {
      const montant =
        Number(
          sale.total_sale || 0
        );

      const benefice =
        Number(
          sale.profit || 0
        );

      const quantity =
        Number(
          sale.quantity || 0
        );

      totalQuantity +=
        quantity;

      if (
        sale.currency === "FC"
      ) {
        totalFc += montant;
        profitFc += benefice;
      } else if (
        sale.currency === "$" ||
        sale.currency === "USD"
      ) {
        totalUsd += montant;
        profitUsd += benefice;
      }

      if (
        !produits[
          sale.product_name
        ]
      ) {
        produits[
          sale.product_name
        ] = {
          quantity: 0,
          montant: 0,
          currency:
            sale.currency,
          profit: 0,
        };
      }

      produits[
        sale.product_name
      ].quantity += quantity;

      produits[
        sale.product_name
      ].montant += montant;

      produits[
        sale.product_name
      ].profit += benefice;
    });

    // ==================================================
    // PÉRIODE DU RAPPORT
    // ==================================================

    let periodeTexte =
      "Toutes les ventes";

    if (selectedDate) {
      periodeTexte =
        `Date : ${selectedDate}`;
    } else if (
      startDate &&
      endDate
    ) {
      periodeTexte =
        `Du ${startDate} au ${endDate}`;
    }

    // ==================================================
    // PAGE DE GARDE
    // ==================================================

    doc.setFontSize(26);

    doc.text(
      "BISO-COMMERCE",
      20,
      35
    );

    doc.setFontSize(16);

    doc.text(
      "Rapport professionnel",
      20,
      50
    );

    doc.setFontSize(12);

    doc.text(
      cleanPDF(
        "Suivi des ventes et benefices"
      ),
      20,
      65
    );

    doc.line(
      20,
      75,
      190,
      75
    );

    doc.setFontSize(13);

    doc.text(
      cleanPDF(
        periodeTexte
      ),
      20,
      95
    );

    doc.text(
      cleanPDF(
        `Nombre de ventes : ${data.length}`
      ),
      20,
      110
    );

    doc.text(
      cleanPDF(
        `Quantite vendue : ${totalQuantity}`
      ),
      20,
      125
    );

    doc.text(
      cleanPDF(
        `Produit le plus vendu : ${bestProduct}`
      ),
      20,
      140
    );

    // ==================================================
    // RÉSUMÉ FINANCIER
    // ==================================================

    doc.addPage();

    doc.setFontSize(20);

    doc.text(
      "Resume financier",
      20,
      30
    );

    autoTable(doc, {
      startY: 45,

      head: [
        [
          "Categorie",
          "Montant",
        ],
      ],

      body: [
        [
          "Ventes FC",
          `${formatMoney(totalFc)} FC`,
        ],
        [
          "Ventes USD",
          `${formatMoney(totalUsd)} $`,
        ],
        [
          "Benefice FC",
          `${formatMoney(profitFc)} FC`,
        ],
        [
          "Benefice USD",
          `${formatMoney(profitUsd)} $`,
        ],
      ],

      styles: {
        fontSize: 11,
        cellPadding: 5,
      },
    });

    // ==================================================
    // DÉTAIL DES VENTES
    // ==================================================

    doc.addPage();

    doc.setFontSize(20);

    doc.text(
      "Detail des ventes",
      20,
      30
    );

    const rows =
      Object.keys(
        produits
      ).map((name) => [
        cleanPDF(name),

        produits[name]
          .quantity,

        `${formatMoney(
          produits[name]
            .montant
        )} ${
          produits[name]
            .currency
        }`,

        `${formatMoney(
          produits[name]
            .profit
        )} ${
          produits[name]
            .currency
        }`,
      ]);

    autoTable(doc, {
      startY: 45,

      head: [
        [
          "Produit",
          "Quantite",
          "Ventes",
          "Benefice",
        ],
      ],

      body: rows,

      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
    });

    // ==================================================
    // ANALYSE COMMERCIALE
    // ==================================================

    doc.addPage();

    doc.setFontSize(20);

    doc.text(
      "Analyse commerciale",
      20,
      30
    );

    doc.setFontSize(12);

    doc.text(
      cleanPDF(
        `Produit le plus vendu : ${bestProduct}`
      ),
      20,
      55
    );

    doc.text(
      cleanPDF(
        `Quantite totale vendue : ${totalQuantity}`
      ),
      20,
      70
    );

    doc.text(
      `Total ventes FC : ${formatMoney(
        totalFc
      )} FC`,
      20,
      90
    );

    doc.text(
      `Total ventes USD : ${formatMoney(
        totalUsd
      )} $`,
      20,
      105
    );

    doc.text(
      `Benefice total FC : ${formatMoney(
        profitFc
      )} FC`,
      20,
      120
    );

    doc.text(
      `Benefice total USD : ${formatMoney(
        profitUsd
      )} $`,
      20,
      135
    );

    doc.text(
      cleanPDF(
        "Ce document permet au responsable de suivre les ventes et les benefices du commerce."
      ),
      20,
      175
    );

    // ==================================================
    // TÉLÉCHARGEMENT PDF
    // ==================================================

    const pdfBlob =
      doc.output("blob");

    const url =
      URL.createObjectURL(
        pdfBlob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      `Rapport-BISO-COMMERCE-${
        selectedDate ||
        (startDate && endDate
          ? `${startDate}-${endDate}`
          : "complet")
      }.pdf`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );

    setTimeout(() => {
      URL.revokeObjectURL(
        url
      );
    }, 1000);
  };

  
  // ======================================================
  // JSX
  // ======================================================

  return (
    <main
      className="
        min-h-screen
        bg-[#081221]
        text-white
        p-4
        sm:p-6
      "
    >
      <div
        className="
          max-w-6xl
          mx-auto
          space-y-6
        "
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <section
          className="
            rounded-3xl
            bg-white/5
            border
            border-white/10
            p-6
            backdrop-blur-xl
          "
        >
          <div
            className="
              flex
              flex-col
              sm:flex-row
              sm:justify-between
              sm:items-center
              gap-4
            "
          >
            <div>
              <h1
                className="
                  text-2xl
                  sm:text-3xl
                  font-black
                "
              >
                📊 Rapport 
              </h1>

              <p
                className="
                  text-slate-400
                  mt-2
                "
              >
                Analyse complète du commerce
              </p>
            </div>

            <button
              onClick={() =>
                setShowGuide(
                  !showGuide
                )
              }
              className="
                bg-orange-500/20
                border
                border-orange-400/30
                px-4
                py-3
                rounded-xl
                font-bold
              "
            >
              <Sparkles
                size={16}
                className="inline mr-2"
              />

              Guide
            </button>
          </div>

          {/* GUIDE */}

          {showGuide && (
            <div
              className="
                mt-4
                rounded-2xl
                bg-black/30
                border
                border-white/10
                p-4
                text-sm
                text-slate-300
                leading-6
              "
            >
              <p>
                📅 Choisissez une date
                pour voir uniquement
                les ventes de cette
                journée.
              </p>

              <p className="mt-2">
                📆 Utilisez les deux
                dates pour voir une
                période, par exemple
                du 20 au 30.
              </p>

              <p className="mt-2">
                📄 Le PDF sera créé
                selon votre sélection.
              </p>

              <button
                onClick={() =>
                  setShowGuide(false)
                }
                className="
                  mt-4
                  w-full
                  bg-orange-500
                  text-black
                  py-3
                  rounded-xl
                  font-black
                "
              >
                Fermer le guide
              </button>
            </div>
          )}
        </section>

        {/* ==================================================
            STATISTIQUES
        ================================================== */}

        <section
          className="
            grid
            grid-cols-1
            md:grid-cols-3
            gap-5
          "
        >
          <ReportCard
            icon="🔥"
            title="Aujourd'hui"
            value={`${formatMoney(
              today.fc
            )} FC | ${formatMoney(
              today.usd
            )} $`}
            subtitle={`Bénéfice :
${formatMoney(
  today.profitFc
)} FC | ${formatMoney(
  today.profitUsd
)} $`}
          />

          <ReportCard
            icon="📅"
            title="Hier"
            value={`${formatMoney(
              yesterday.fc
            )} FC | ${formatMoney(
              yesterday.usd
            )} $`}
            subtitle={`Bénéfice :
${formatMoney(
  yesterday.profitFc
)} FC | ${formatMoney(
  yesterday.profitUsd
)} $`}
          />

          <ReportCard
            icon="⏳"
            title="Avant-hier"
            value={`${formatMoney(
              beforeYesterday.fc
            )} FC | ${formatMoney(
              beforeYesterday.usd
            )} $`}
            subtitle={`Bénéfice :
${formatMoney(
  beforeYesterday.profitFc
)} FC | ${formatMoney(
  beforeYesterday.profitUsd
)} $`}
          />
        </section>

        {/* ==================================================
            RECHERCHE
        ================================================== */}

        <section
          className="
            rounded-3xl
            bg-white/5
            border
            border-white/10
            p-5
            sm:p-6
          "
        >
          <h2
            className="
              text-xl
              font-black
              mb-5
            "
          >
            📄 Rechercher les ventes
          </h2>

          {/* UNE DATE */}

          <div className="mb-6">
            <label
              className="
                block
                text-sm
                font-bold
                text-slate-300
                mb-2
              "
            >
              Voir les ventes d'une date
            </label>

            <div
              className="
                flex
                flex-col
                sm:flex-row
                gap-3
              "
            >
              <div
                className="
                  relative
                  flex-1
                "
              >
                <CalendarDays
                  size={18}
                  className="
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-orange-400
                  "
                />

                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) =>
                    setSelectedDate(
                      e.target.value
                    )
                  }
                  className="
                    w-full
                    bg-black/40
                    border
                    border-white/10
                    rounded-xl
                    p-3
                    pl-10
                    text-white
                    outline-none
                  "
                />
              </div>

              <button
                onClick={filterByDate}
                className="
                  bg-blue-500
                  hover:bg-blue-400
                  px-5
                  py-3
                  rounded-xl
                  font-black
                  flex
                  items-center
                  justify-center
                  gap-2
                "
              >
                <Search size={17} />

                Chercher
              </button>
            </div>
          </div>

          {/* PÉRIODE */}

          <div className="mb-6">
            <label
              className="
                block
                text-sm
                font-bold
                text-slate-300
                mb-2
              "
            >
              Voir une période
            </label>

            <div
              className="
                grid
                grid-cols-1
                sm:grid-cols-2
                lg:grid-cols-3
                gap-3
              "
            >
              <div>
                <label
                  className="
                    block
                    text-xs
                    text-slate-500
                    mb-1
                  "
                >
                  Du
                </label>

                <input
                  type="date"
                  value={startDate}
                  onChange={(e) =>
                    setStartDate(
                      e.target.value
                    )
                  }
                  className="
                    w-full
                    bg-black/40
                    border
                    border-white/10
                    rounded-xl
                    p-3
                    text-white
                    outline-none
                  "
                />
              </div>

              <div>
                <label
                  className="
                    block
                    text-xs
                    text-slate-500
                    mb-1
                  "
                >
                  Au
                </label>

                <input
                  type="date"
                  value={endDate}
                  onChange={(e) =>
                    setEndDate(
                      e.target.value
                    )
                  }
                  className="
                    w-full
                    bg-black/40
                    border
                    border-white/10
                    rounded-xl
                    p-3
                    text-white
                    outline-none
                  "
                />
              </div>

              <button
                onClick={filterByPeriod}
                className="
                  bg-purple-500
                  hover:bg-purple-400
                  px-5
                  py-3
                  rounded-xl
                  font-black
                  flex
                  items-center
                  justify-center
                  gap-2
                  self-end
                "
              >
                <CalendarDays
                  size={17}
                />

                Voir la période
              </button>
            </div>
          </div>

          {/* BOUTONS */}

          <div
            className="
              flex
              flex-col
              sm:flex-row
              gap-3
            "
          >
            <button
              onClick={showEverything}
              className="
                bg-orange-500
                hover:bg-orange-400
                text-black
                px-5
                py-3
                rounded-xl
                font-black
              "
            >
              Voir toutes les ventes
            </button>

            <button
              onClick={resetFilters}
              className="
                border
                border-white/10
                bg-black/30
                px-5
                py-3
                rounded-xl
                font-bold
                text-slate-300
                flex
                items-center
                justify-center
                gap-2
              "
            >
              <X size={17} />

              Réinitialiser
            </button>

            <button
              onClick={downloadPDF}
              className="
                bg-gradient-to-r
                from-orange-500
                to-yellow-400
                text-black
                px-5
                py-3
                rounded-xl
                font-black
                flex
                items-center
                justify-center
                gap-2
              "
            >
              <Download size={17} />

              Créer PDF
            </button>
          </div>
        </section>

        {/* ==================================================
            RÉSULTAT DE LA RECHERCHE
        ================================================== */}

        {(selectedDate ||
          startDate ||
          endDate) && (
          <section
            className="
              rounded-2xl
              bg-orange-500/10
              border
              border-orange-400/20
              p-4
            "
          >
            <p
              className="
                text-sm
                font-bold
                text-orange-300
              "
            >
              {selectedDate
                ? `Résultat pour le ${selectedDate}`
                : startDate &&
                  endDate
                ? `Résultat du ${startDate} au ${endDate}`
                : "Sélection incomplète"}
            </p>

            <p
              className="
                mt-1
                text-xs
                text-slate-400
              "
            >
              {filteredSales.length} vente
              {filteredSales.length > 1
                ? "s"
                : ""} trouvée
              {filteredSales.length > 1
                ? "s"
                : ""}
            </p>
          </section>
        )}

        {/* ==================================================
            HISTORIQUE
        ================================================== */}

        <section
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
              flex-col
              sm:flex-row
              sm:justify-between
              sm:items-center
              gap-3
              mb-5
            "
          >
            <div>
              <h2
                className="
                  text-xl
                  font-black
                "
              >
                🧾 Historique des ventes
              </h2>

              <p
                className="
                  text-xs
                  text-slate-400
                  mt-1
                "
              >
                
              </p>
            </div>

            {filteredSales.length > 5 && (
              <button
                onClick={() =>
                  setShowAll(
                    !showAll
                  )
                }
                className="
                  bg-orange-500
                  hover:bg-orange-400
                  text-black
                  px-4
                  py-2
                  rounded-xl
                  font-black
                "
              >
                {showAll
                  ? "Afficher seulement 5"
                  : "Voir toutes les ventes"}
              </button>
            )}
          </div>

          {/* AUCUNE VENTE */}

          {displayedSales.length === 0 ? (
            <div
              className="
                rounded-2xl
                bg-black/30
                border
                border-white/10
                p-8
                text-center
              "
            >
              <p
                className="
                  font-black
                  text-white
                "
              >
                {selectedDate
                  ? "Aucune vente à cette date."
                  : startDate &&
                    endDate
                  ? "Aucune vente dans cette période."
                  : "Aucune vente disponible."}
              </p>

              <p
                className="
                  text-xs
                  text-slate-500
                  mt-2
                "
              >
                Essayez une autre date
                ou une autre période.
              </p>
            </div>
          ) : (
            <div className="space-y-3">

              {displayedSales.map(
                (sale) => (
                  <div
                    key={sale.id}
                    className="
                      rounded-2xl
                      bg-black/30
                      border
                      border-white/10
                      p-4
                      flex
                      flex-col
                      lg:flex-row
                      lg:items-center
                      lg:justify-between
                      gap-4
                    "
                  >

                    {/* PRODUIT */}

                    <div
                      className="
                        min-w-0
                      "
                    >
                      <p
                        className="
                          font-black
                          text-white
                          break-words
                        "
                      >
                        📦{" "}
                        {sale.product_name}
                      </p>

                      <p
                        className="
                          text-xs
                          text-slate-400
                          mt-1
                        "
                      >
                        📅{" "}
                        {new Date(
                          sale.created_at
                        ).toLocaleString(
                          "fr-FR"
                        )}
                      </p>
                    </div>

                    {/* INFORMATIONS */}

                    <div
                      className="
                        grid
                        grid-cols-2
                        sm:grid-cols-3
                        gap-4
                        text-sm
                      "
                    >

                      <div>
                        <p
                          className="
                            text-xs
                            text-slate-500
                          "
                        >
                          Quantité
                        </p>

                        <p
                          className="
                            font-black
                          "
                        >
                          x{sale.quantity}
                        </p>
                      </div>

                      <div>
                        <p
                          className="
                            text-xs
                            text-slate-500
                          "
                        >
                          Vente
                        </p>

                        <p
                          className="
                            font-black
                            text-orange-400
                          "
                        >
                          {formatMoney(
                            sale.total_sale
                          )}{" "}
                          {sale.currency}
                        </p>
                      </div>

                      <div>
                        <p
                          className="
                            text-xs
                            text-slate-500
                          "
                        >
                          Bénéfice
                        </p>

                        <p
                          className="
                            font-black
                            text-green-400
                          "
                        >
                          {formatMoney(
                            sale.profit
                          )}{" "}
                          {sale.currency}
                        </p>
                      </div>

                    </div>
                  </div>
                )
              )}

            </div>
          )}
        </section>

        {/* ==================================================
            RETOUR EN HAUT
        ================================================== */}

        {showTopButton && (
          <button
            onClick={scrollToTop}
            className="
              fixed
              bottom-6
              right-6
              z-50
              bg-orange-500
              hover:bg-orange-400
              text-black
              p-4
              rounded-full
              shadow-2xl
              transition
            "
            title="Retour en haut"
          >
            <ArrowUp size={22} />
          </button>
        )}

      </div>
    </main>
  );
}

// ======================================================
// COMPOSANT CARTE RAPPORT
// ======================================================

function ReportCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: string;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div
      className="
        rounded-3xl
        bg-white/5
        border
        border-white/10
        p-5
        shadow-xl
      "
    >
      <div className="text-3xl">
        {icon}
      </div>

      <h3
        className="
          mt-3
          font-black
          text-white
        "
      >
        {title}
      </h3>

      <p
        className="
          mt-3
          text-lg
          sm:text-xl
          font-black
          text-orange-400
          break-words
        "
      >
        {value}
      </p>

      <p
        className="
          mt-2
          text-xs
          leading-5
          text-slate-400
          whitespace-pre-line
        "
      >
        {subtitle}
      </p>
    </div>
  );
}
