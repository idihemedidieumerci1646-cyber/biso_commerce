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
  const [todayFc, setTodayFc] = useState(0);
  const [todayUsd, setTodayUsd] = useState(0);
  const [todayProfitFc, setTodayProfitFc] = useState(0);
  const [todayProfitUsd, setTodayProfitUsd] = useState(0);

  const [yesterdayFc, setYesterdayFc] = useState(0);
  const [yesterdayUsd, setYesterdayUsd] = useState(0);
  const [yesterdayProfitFc, setYesterdayProfitFc] = useState(0);
  const [yesterdayProfitUsd, setYesterdayProfitUsd] = useState(0);

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
    const phone = localStorage.getItem("phone");
    if (!phone) return;

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();

    if (!user) return;

    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select("*")
      .eq("user_id", user.id);

    if (salesError) {
      console.log(salesError);
      return;
    }

    const now = new Date();
    const today = new Date().toISOString().split("T")[0];

    const y = new Date();
    y.setDate(now.getDate() - 1);
    const yesterday = y.toISOString().split("T")[0];

    const by = new Date();
    by.setDate(now.getDate() - 2);
    const beforeYesterday = by.toISOString().split("T")[0];

    let tFc = 0, tUsd = 0, tPfFc = 0, tPfUsd = 0;
    let yFc = 0, yUsd = 0, yPfFc = 0, yPfUsd = 0;
    let byFc = 0, byUsd = 0, byPfFc = 0, byPfUsd = 0;

    sales?.forEach((s: Sale) => {
      const date = s.created_at.split("T")[0];
      const val = Number(s.total_sale || 0);
      const prof = Number(s.profit || 0);

      if (date === today) {
        if (s.currency === "FC") { tFc += val; tPfFc += prof; }
        else { tUsd += val; tPfUsd += prof; }
      }

      if (date === yesterday) {
        if (s.currency === "FC") { yFc += val; yPfFc += prof; }
        else { yUsd += val; yPfUsd += prof; }
      }

      if (date === beforeYesterday) {
        if (s.currency === "FC") { byFc += val; byPfFc += prof; }
        else { byUsd += val; byPfUsd += prof; }
      }
    });

    setTodayFc(tFc); setTodayUsd(tUsd);
    setTodayProfitFc(tPfFc); setTodayProfitUsd(tPfUsd);

    setYesterdayFc(yFc); setYesterdayUsd(yUsd);
    setYesterdayProfitFc(yPfFc); setYesterdayProfitUsd(yPfUsd);

    setBeforeYesterdayFc(byFc); setBeforeYesterdayUsd(byUsd);
    setBeforeYesterdayProfitFc(byPfFc); setBeforeYesterdayProfitUsd(byPfUsd);

    const sorted = sales?.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ) || [];

    setSalesHistory(sorted);
    setFilteredSales(sorted);
  };

  const searchByDate = () => {
    if (!selectedDate) return setFilteredSales(salesHistory);

    setFilteredSales(
      salesHistory.filter((s) => s.created_at.split("T")[0] === selectedDate)
    );
  };

  const last7Days = salesHistory.slice(0, 7);

  const downloadPDF = () => {
    // Sécurité : Si l'utilisateur a choisi une date mais n'a pas cliqué sur Rechercher, 
    // on filtre pour lui avant de générer le document.
    const dataToExport = selectedDate 
      ? salesHistory.filter((s) => s.created_at.split("T")[0] === selectedDate)
      : filteredSales;

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("RAPPORT BISO GESTION", 20, 20);

    doc.setFontSize(12);
    doc.text("Date : " + (selectedDate || "Toutes les dates"), 20, 40);

    let totalFc = 0, totalUsd = 0, profitFc = 0, profitUsd = 0;

    dataToExport.forEach((s) => {
      if (s.currency === "FC") {
        totalFc += Number(s.total_sale || 0);
        profitFc += Number(s.profit || 0);
      } else {
        totalUsd += Number(s.total_sale || 0);
        profitUsd += Number(s.profit || 0);
      }
    });

    doc.text("Ventes FC : " + totalFc + " FC", 20, 60);
    doc.text("Ventes USD : " + totalUsd + " $", 20, 70);

    doc.text("Bénéfice FC : " + profitFc + " FC", 20, 85);
    doc.text("Bénéfice USD : " + profitUsd + " $", 20, 95);
    
    doc.line(20, 100, 190, 100);

    let y = 115;
    doc.setFontSize(14);
    doc.text("PRODUITS VENDUS", 20, y);

    dataToExport.forEach((s) => {
      y += 12;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(11);
      doc.text("Produit : " + s.product_name, 20, y);
      y += 6;
      doc.text("Quantité : " + s.quantity, 25, y);
      y += 6;
      doc.text("Montant : " + s.total_sale + " " + s.currency, 25, y);
      y += 6;
    });

    doc.save("rapport-" + (selectedDate || "complet") + ".pdf");
  };

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold">📊 Rapports PRO</h1>
          <p className="text-slate-400 text-sm">
            Analyse ventes & performance caisse
          </p>
        </div>

        {/* PETIT MOT D'AIDE */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400">
          <p>💡 <strong> PDF Comment ça marche ?</strong> Choisissez la date (par exemple : 24-07-2026), cliquez sur 'Rechercher' pour voir les ventes, puis sur 'PDF' pour télécharger votre rapport.</p>
        </div>

        {/* SECTIONS */}
        <Section title="Aujourd’hui">
          <Card label="Ventes FC" value={`${todayFc} FC`} />
          <Card label="Ventes USD" value={`${todayUsd} $`} />
          <Card label="Bénéfice FC" value={`${todayProfitFc} FC`} />
          <Card label="Bénéfice USD" value={`${todayProfitUsd} $`} />
        </Section>

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

        {/* 7 DAYS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h2 className="font-bold mb-3">📅 7 derniers rapports</h2>
          {last7Days.length === 0 ? (
            <p className="text-slate-500 text-sm">Aucun rapport</p>
          ) : (
            last7Days.map((s) => (
              <div key={s.id} className="border-b border-slate-800 py-3">
                <p className="text-sm text-slate-400">
                  {new Date(s.created_at).toLocaleDateString()}
                </p>
                <p>{s.product_name} - {s.quantity}</p>
                <p className="text-green-400 font-bold">
                  {s.total_sale} {s.currency}
                </p>
              </div>
            ))
          )}
        </div>

        {/* SEARCH */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h2 className="font-bold mb-3">🔎 Recherche</h2>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-black border border-slate-700 p-3 rounded-xl"
            />
            <button
              onClick={searchByDate}
              className="bg-green-600 px-5 py-3 rounded-xl font-bold"
            >
              Rechercher
            </button>
            <button
              onClick={downloadPDF}
              className="bg-red-600 px-5 py-3 rounded-xl font-bold"
            >
              📄 PDF
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}

/* UI */
function Section({ title, children }: any) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-3 text-slate-300">{title}</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
        {children}
      </div>
    </div>
  );
}

function Card({ label, value }: any) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}