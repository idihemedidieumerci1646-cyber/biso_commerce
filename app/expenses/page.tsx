"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Sale = {
  total_sale: number;
  profit: number;
  currency: string;
  created_at: string;
};

type Expense = {
  id: number;
  title: string;
  amount: number;
  currency: string;
  created_at: string;
};

export default function ReportsPage() {
  const [todayFc, setTodayFc] = useState(0);
  const [todayUsd, setTodayUsd] = useState(0);
  const [todayProfitFc, setTodayProfitFc] = useState(0);
  const [todayProfitUsd, setTodayProfitUsd] = useState(0);

  const [todayExpenseFc, setTodayExpenseFc] = useState(0);
  const [todayExpenseUsd, setTodayExpenseUsd] = useState(0);
  const [expensesList, setExpensesList] = useState<Expense[]>([]);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("FC");

  // CORRECTIF FUSEAU HORAIRE (Kinshasa)
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localDate = new Date(now.getTime() - offset);
  const todayStr = localDate.toISOString().split("T")[0];
  
  const yesterdayDate = new Date(localDate);
  yesterdayDate.setDate(localDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: sales } = await supabase.from("sales").select("*");
    const { data: expenses } = await supabase.from("expenses").select("*").order("created_at", { ascending: false });

    setExpensesList(expenses || []);
    
    let tFc = 0, tUsd = 0, tPfFc = 0, tPfUsd = 0;
    let expTodayFc = 0, expTodayUsd = 0;

    sales?.forEach((s: Sale) => {
      const isFC = s.currency === "FC";
      if (s.created_at.split("T")[0] === todayStr) {
        if (isFC) { tFc += Number(s.total_sale || 0); tPfFc += Number(s.profit || 0); }
        else { tUsd += Number(s.total_sale || 0); tPfUsd += Number(s.profit || 0); }
      }
    });

    expenses?.forEach((e: Expense) => {
      const isFC = e.currency === "FC";
      if (e.created_at.split("T")[0] === todayStr) {
        if (isFC) expTodayFc += Number(e.amount || 0); else expTodayUsd += Number(e.amount || 0);
      }
    });

    setTodayFc(tFc); setTodayUsd(tUsd);
    setTodayProfitFc(tPfFc); setTodayProfitUsd(tPfUsd);
    setTodayExpenseFc(expTodayFc); setTodayExpenseUsd(expTodayUsd);
  };

  const addExpense = async () => {
    if (!title || !amount) return alert("Remplissez les champs");
    await supabase.from("expenses").insert([{ title, amount: Number(amount), currency }]);
    setTitle(""); setAmount("");
    load();
  };

  const deleteExpense = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cette dépense ?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    load();
  };

  const todayExpenses = expensesList.filter(e => e.created_at.split("T")[0] === todayStr);
  const yesterdayExpenses = expensesList.filter(e => e.created_at.split("T")[0] === yesterdayStr);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">📊 Rapports & Dépenses</h1>

        <div className="bg-white/10 p-6 rounded-xl mb-8 border border-white/10">
          <h2 className="text-lg font-bold mb-4">➕ Ajouter une dépense</h2>
          <div className="flex flex-wrap gap-4">
            <input className="bg-slate-800 p-2 rounded text-white flex-1" placeholder="Nom" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="bg-slate-800 p-2 rounded text-white w-32" type="number" placeholder="Montant" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <select className="bg-slate-800 p-2 rounded text-white" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option className="text-black" value="FC">FC</option>
              <option className="text-black" value="USD">USD</option>
            </select>
            <button className="bg-blue-600 px-6 py-2 rounded font-bold hover:bg-blue-500" onClick={addExpense}>Ajouter</button>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-3 text-emerald-400">💰 CE QU'IL ME RESTE AUJOURD'HUI</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card title="FC IL ME RESTE" value={`${todayProfitFc - todayExpenseFc} FC`} />
          <Card title="USD IL ME RESTE" value={`${todayProfitUsd - todayExpenseUsd} $`} />
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <section>
            <h2 className="text-xl font-bold mb-3 text-emerald-400">📅 Aujourd'hui</h2>
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 min-h-[200px]">
              {todayExpenses.map(exp => <ExpenseItem key={exp.id} exp={exp} onDelete={deleteExpense} />)}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3 text-amber-400">🕒 Hier</h2>
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 min-h-[200px]">
              {yesterdayExpenses.map(exp => <ExpenseItem key={exp.id} exp={exp} onDelete={deleteExpense} />)}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function ExpenseItem({ exp, onDelete }: { exp: Expense; onDelete: (id: number) => void }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/10">
      <span className="text-slate-300">{exp.title}</span>
      <div className="flex items-center gap-4">
        <span className="font-bold">{exp.amount} {exp.currency}</span>
        <button onClick={() => onDelete(exp.id)} className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[10px] font-bold">Supprimer</button>
      </div>
    </div>
  );
}

function Card({ title, value }: any) {
  return (
    <div className="bg-white/10 p-4 rounded-xl border border-white/5">
      <p className="text-slate-400 text-sm">{title}</p>
      <h3 className="text-xl font-bold">{value}</h3>
    </div>
  );
}