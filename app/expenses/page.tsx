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
    const phone = localStorage.getItem("phone");

    if (!phone) return;

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();

    if (!user) return;

    const { data: sales } = await supabase
      .from("sales")
      .select("*")
      .eq("user_id", user.id);

    const { data: expenses } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setExpensesList(expenses || []);

    let tFc = 0,
      tUsd = 0,
      tPfFc = 0,
      tPfUsd = 0,
      expFc = 0,
      expUsd = 0;

    sales?.forEach((s: Sale) => {
      if (s.created_at.split("T")[0] === todayStr) {
        if (s.currency === "FC") {
          tFc += Number(s.total_sale || 0);
          tPfFc += Number(s.profit || 0);
        } else {
          tUsd += Number(s.total_sale || 0);
          tPfUsd += Number(s.profit || 0);
        }
      }
    });

    expenses?.forEach((e: Expense) => {
      if (e.created_at.split("T")[0] === todayStr) {
        if (e.currency === "FC") expFc += Number(e.amount || 0);
        else expUsd += Number(e.amount || 0);
      }
    });

    setTodayFc(tFc);
    setTodayUsd(tUsd);
    setTodayProfitFc(tPfFc);
    setTodayProfitUsd(tPfUsd);
    setTodayExpenseFc(expFc);
    setTodayExpenseUsd(expUsd);
  };

  const addExpense = async () => {
    if (!title || !amount) return alert("Remplissez les champs");

    const phone = localStorage.getItem("phone");

    if (!phone) {
      alert("Utilisateur non connecté");
      return;
    }

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();

    if (!user) {
      alert("Utilisateur introuvable");
      return;
    }

    const { error } = await supabase.from("expenses").insert([
      {
        title,
        amount: Number(amount),
        currency,
        user_id: user.id,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setTitle("");
    setAmount("");
    load();
  };

  const deleteExpense = async (id: number) => {
    if (!confirm("Supprimer cette dépense ?")) return;

    const phone = localStorage.getItem("phone");

    if (!phone) return;

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();

    if (!user) return;

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    load();
  };

  const todayExpenses = expensesList.filter(
    (e) => e.created_at && e.created_at.split("T")[0] === todayStr
  );

  const yesterdayExpenses = expensesList.filter(
    (e) => e.created_at && e.created_at.split("T")[0] === yesterdayStr
  );

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-2xl font-bold">📊 Rapports</h1>
          <p className="text-slate-400 text-sm">
            Analyse ventes & dépenses
          </p>
        </div>

        {/* ADD EXPENSE */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="font-bold mb-4">➕ Ajouter dépense</h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="bg-black border border-slate-700 p-3 rounded-xl flex-1"
              placeholder="Nom"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <input
              className="bg-black border border-slate-700 p-3 rounded-xl w-full sm:w-40"
              type="number"
              placeholder="Montant"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <select
              className="bg-black border border-slate-700 p-3 rounded-xl"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="FC">FC</option>
              <option value="USD">USD</option>
            </select>

            <button
              onClick={addExpense}
              className="bg-green-600 px-6 py-3 rounded-xl font-bold"
            >
              Ajouter
            </button>
          </div>
        </div>

        {/* SUMMARY */}
        <div>
          <h2 className="text-emerald-400 font-bold mb-3">
            💰 Résultat du jour
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card
              title="EN FC IL ME RESTE"
              value={`${todayProfitFc - todayExpenseFc} FC`}
            />
            <Card
              title="EN USD IL ME RESTE"
              value={`${todayProfitUsd - todayExpenseUsd} $`}
            />
          </div>
        </div>

        {/* LISTS */}
        <div className="grid md:grid-cols-2 gap-6">

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="font-bold mb-3 text-emerald-400">
              Aujourd’hui
            </h3>

            {todayExpenses.length === 0 ? (
              <p className="text-slate-500 text-sm">Aucune dépense</p>
            ) : (
              todayExpenses.map((exp) => (
                <ExpenseItem key={exp.id} exp={exp} onDelete={deleteExpense} />
              ))
            )}
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="font-bold mb-3 text-amber-400">
              Hier
            </h3>

            {yesterdayExpenses.length === 0 ? (
              <p className="text-slate-500 text-sm">Aucune dépense</p>
            ) : (
              yesterdayExpenses.map((exp) => (
                <ExpenseItem key={exp.id} exp={exp} onDelete={deleteExpense} />
              ))
            )}
          </section>

        </div>
      </div>
    </main>
  );
}

/* UI */

function ExpenseItem({
  exp,
  onDelete,
}: {
  exp: Expense;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-slate-800">
      <p className="text-slate-300 text-sm">{exp.title}</p>

      <div className="flex items-center gap-3">
        <span className="font-bold">
          {exp.amount} {exp.currency}
        </span>

        <button
          onClick={() => onDelete(exp.id)}
          className="text-[10px] bg-red-600 px-2 py-1 rounded font-bold"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}

function Card({ title, value }: any) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <p className="text-slate-400 text-sm">{title}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}