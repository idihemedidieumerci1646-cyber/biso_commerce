"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";

type Sale = {
  id: string;
  product_name: string;
  quantity: number;
  total_sale: number;
  profit: number;
  currency: string;
  created_at: string;
};

export default function ReportsPage() {
  // TODAY
  const [todayFc, setTodayFc] = useState(0);
  const [todayUsd, setTodayUsd] = useState(0);
  const [todayProfitFc, setTodayProfitFc] = useState(0);
  const [todayProfitUsd, setTodayProfitUsd] = useState(0);

  // YESTERDAY
  const [yesterdayFc, setYesterdayFc] = useState(0);
  const [yesterdayUsd, setYesterdayUsd] = useState(0);
  const [yesterdayProfitFc, setYesterdayProfitFc] = useState(0);
  const [yesterdayProfitUsd, setYesterdayProfitUsd] = useState(0);

  // BEFORE YESTERDAY
  const [beforeYesterdayFc, setBeforeYesterdayFc] = useState(0);
  const [beforeYesterdayUsd, setBeforeYesterdayUsd] = useState(0);
  const [beforeYesterdayProfitFc, setBeforeYesterdayProfitFc] = useState(0);
  const [beforeYesterdayProfitUsd, setBeforeYesterdayProfitUsd] = useState(0);

  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: sales } = await supabase
      .from("sales")
      .select(
        "id, product_name, quantity, total_sale, profit, currency, created_at"
      );

    const now = new Date();
    const today = new Date().toISOString().split("T")[0];

    const yesterdayDate = new Date();
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split("T")[0];

    const beforeYesterdayDate = new Date();
    beforeYesterdayDate.setDate(now.getDate() - 2);
    const beforeYesterday = beforeYesterdayDate.toISOString().split("T")[0];

    let tFc = 0, tUsd = 0, tPfFc = 0, tPfUsd = 0;
    let yFc = 0, yUsd = 0, yPfFc = 0, yPfUsd = 0;
    let byFc = 0, byUsd = 0, byPfFc = 0, byPfUsd = 0;

    sales?.forEach((s: Sale) => {
      const isFC = s.currency === "FC";
      const val = Number(s.total_sale || 0);
      const prof = Number(s.profit || 0);

      if (s.created_at.split("T")[0] === today) {
        if (isFC) { tFc += val; tPfFc += prof; }
        else { tUsd += val; tPfUsd += prof; }
      }

      if (s.created_at.split("T")[0] === yesterday) {
        if (isFC) { yFc += val; yPfFc += prof; }
        else { yUsd += val; yPfUsd += prof; }
      }

      if (s.created_at.split("T")[0] === beforeYesterday) {
        if (isFC) { byFc += val; byPfFc += prof; }
        else { byUsd += val; byPfUsd += prof; }
      }
    });

    setTodayFc(tFc); setTodayUsd(tUsd); setTodayProfitFc(tPfFc); setTodayProfitUsd(tPfUsd);
    setYesterdayFc(yFc); setYesterdayUsd(yUsd); setYesterdayProfitFc(yPfFc); setYesterdayProfitUsd(yPfUsd);
    setBeforeYesterdayFc(byFc); setBeforeYesterdayUsd(byUsd); setBeforeYesterdayProfitFc(byPfFc); setBeforeYesterdayProfitUsd(byPfUsd);

    const sortedSales =
      sales?.sort(
        (a: Sale, b: Sale) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      ) || [];

    setSalesHistory(sortedSales);
    setFilteredSales(sortedSales);
  };

  const searchByDate = () => {
    if (!selectedDate) {
      setFilteredSales(salesHistory);
      return;
    }

    const result = salesHistory.filter(
      (sale) =>
        sale.created_at.split("T")[0] === selectedDate
    );

    setFilteredSales(result);
  };

  const last7Days = salesHistory.slice(0, 7);

  const downloadPDF = () => {
    const doc = new jsPDF();
  
    doc.setFontSize(18);
    doc.text("RAPPORT BISO GESTION", 20, 20);
  
    doc.setFontSize(12);
  
    // Correction ici : Utilisation des backticks (`)
    doc.text(
      `Date : ${selectedDate || "Toutes les dates"}`,
      20,
      40
    );
  
    let totalFc = 0;
    let totalUsd = 0;
    let profitFc = 0;
    let profitUsd = 0;
  
    filteredSales.forEach((sale) => {
      if (sale.currency === "FC") {
        totalFc += Number(sale.total_sale || 0);
        profitFc += Number(sale.profit || 0);
      } else {
        totalUsd += Number(sale.total_sale || 0);
        profitUsd += Number(sale.profit || 0);
      }
    });
  
    doc.text(`Total ventes FC : ${totalFc} FC`, 20, 60);
    doc.text(`Total ventes USD : ${totalUsd} $`, 20, 70);
  
    doc.text(`Total bénéfices FC : ${profitFc} FC`, 20, 85);
    doc.text(`Total bénéfices USD : ${profitUsd} $`, 20, 95);
  
    let y = 115;
  
    doc.text("Produits vendus :", 20, y);
  
    filteredSales.forEach((sale) => {
      y += 10;
  
      doc.text(
        `${sale.product_name} | Qté: ${sale.quantity} | ${sale.total_sale} ${sale.currency}`,
        20,
        y
      );
    });
  
    y += 20;
  
    doc.text("PDG DIEUMERCI IDI", 20, y);
  
    doc.save(`rapport-${selectedDate || "complet"}.pdf`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <style jsx global>{`
        @media print {
          body > div > main > div > .print-only-block { display: block !important; }
          body > div > main > div > .print-hide { display: none !important; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">📊 Rapports PRO</h1>

        <div className="print-only-block">
          <Section title="Aujourd’hui">
            <Card label="Ventes FC" value={`${todayFc} FC`} />
            <Card label="Ventes USD" value={`${todayUsd} $`} />
            <Card label="Bénéfice FC" value={`${todayProfitFc} FC`} />
            <Card label="Bénéfice USD" value={`${todayProfitUsd} $`} />
          </Section>

          <div className="hidden print:block mt-10">
            <p className="text-black text-xl font-bold"></p>
          </div>
        </div>

        <div className="print-hide">
          <Section title="Hier">
            <Card label="Ventes FC" value={`${yesterdayFc} FC`} />
            <Card label="Ventes USD" value={`${yesterdayUsd} $`} />
            <Card label="Bénéfice FC" value={`${yesterdayProfitFc} FC`} />
            <Card label="Bénéfice USD" value={`${yesterdayProfitUsd} $`} />
          </Section>

          <Section title="Avant-hier">
            <Card label="Ventes FC" value={`${beforeYesterdayFc} FC`} />
            <Card label="Ventes USD" value={`${beforeYesterdayUsd} $`} />
            <Card label="Bénéfice FC" value={`${beforeYesterdayProfitFc} FC`} />
            <Card label="Bénéfice USD" value={`${beforeYesterdayProfitUsd} $`} />
          </Section>

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-3">📅 7 derniers rapports</h2>
            <div className="bg-white/10 rounded-xl p-4">
              {last7Days.length === 0 ? (
                <p>Aucun rapport</p>
              ) : (
                last7Days.map((sale) => (
                  <div key={sale.id} className="border-b border-white/10 py-3">
                    <p>Date : {new Date(sale.created_at).toLocaleDateString()}</p>
                    <p>Produit : {sale.product_name}</p>
                    <p>Vente : {sale.total_sale} {sale.currency}</p>
                    <p>Bénéfice : {sale.profit} {sale.currency}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-3">🔎 Rechercher un rapport</h2>
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white/10 p-3 rounded-xl text-white"
              />
              <button onClick={searchByDate} className="bg-green-600 px-5 py-3 rounded-xl font-bold">
                Rechercher
              </button>
              <button onClick={downloadPDF} className="bg-red-600 px-6 py-3 rounded-xl font-bold">
                📄 Télécharger PDF
              </button>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold mb-3">📚 Historique complet</h2>
            <div className="bg-white/10 rounded-xl p-4 max-h-[600px] overflow-y-auto">
              {filteredSales.length === 0 ? (
                <p>Aucun résultat trouvé pour cette date.</p>
              ) : (
                filteredSales.map((sale) => (
                  <div key={sale.id} className="border-b border-white/10 py-3">
                    <p>Date : {new Date(sale.created_at).toLocaleDateString()}</p>
                    <p>Produit : {sale.product_name}</p>
                    <p>Vente : {sale.total_sale} {sale.currency}</p>
                    <p>Bénéfice : {sale.profit} {sale.currency}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-3">{title}</h2>
      <div className="grid md:grid-cols-4 gap-4">{children}</div>
    </div>
  );
}

function Card({ label, value }: any) {
  return (
    <div className="bg-white/10 p-4 rounded-xl">
      <p className="text-slate-400">{label}</p>
      <h3 className="text-xl font-bold">{value}</h3>
    </div>
  );
}