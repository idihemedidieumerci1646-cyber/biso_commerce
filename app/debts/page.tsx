"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Debt = {
  id: string;
  client_name: string;
  total_amount: number;
  paid_amount: number;
  currency: string;
};

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("FC");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedDebt, setSelectedDebt] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadDebts();
  }, []);

  // 📥 LOAD DEBTS
  const loadDebts = async () => {
    const phone = localStorage.getItem("phone");

    if (!phone) return;

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();

    if (!user) return;

    const { data, error } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    setDebts(data || []);
  };

  // ➕ ADD DEBT
  const addDebt = async () => {
    if (!name || !amount || !currency) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    const phone = localStorage.getItem("phone");
    if (!phone) return;

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();

    if (!user) return;

    const { error } = await supabase.from("debts").insert([
      {
        client_name: name,
        total_amount: Number(amount),
        paid_amount: 0,
        currency,
        user_id: user.id,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setName("");
    setAmount("");
    loadDebts();
  };

  // 💰 PAY DEBT
  const payDebt = async () => {
    if (!selectedDebt || !paymentAmount) return;

    const debt = debts.find((d) => d.id === selectedDebt);
    if (!debt) return;

    const remaining = debt.total_amount - debt.paid_amount;

    if (Number(paymentAmount) > remaining) {
      alert("Montant trop élevé");
      return;
    }

    const newPaid = debt.paid_amount + Number(paymentAmount);

    if (debt.total_amount - newPaid <= 0) {
      await supabase.from("debts").delete().eq("id", selectedDebt);
    } else {
      await supabase
        .from("debts")
        .update({ paid_amount: newPaid })
        .eq("id", selectedDebt);
    }

    setPaymentAmount("");
    setSelectedDebt("");
    setSearchTerm("");
    loadDebts();
  };

  // 🔍 FILTER SAFE
  const filteredDebts = debts.filter((d) =>
    (d.client_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6">
      <div className="max-w-md mx-auto space-y-6">

        {/* HEADER */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">🧾 Dettes</h1>
          <p className="text-slate-400 text-sm">
            Gestion clients & paiements
          </p>
        </div>

        {/* ADD DEBT */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <h2 className="font-bold mb-4">➕ Nouvelle dette</h2>

          <div className="space-y-3">

            <input
              placeholder="Nom client"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded-xl bg-black border border-slate-700"
            />

            <input
              type="number"
              placeholder="Montant"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-3 rounded-xl bg-black border border-slate-700"
            />

            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full p-3 rounded-xl bg-black border border-slate-700"
            >
              <option value="FC">FC</option>
              <option value="$">USD</option>
            </select>

            <button
              onClick={addDebt}
              className="w-full bg-green-600 py-3 rounded-xl font-bold"
            >
              Ajouter
            </button>

          </div>
        </div>

        {/* PAYMENT */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <h2 className="font-bold mb-4">💰 Paiement</h2>

          <input
            placeholder="Rechercher client"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedDebt("");
            }}
            className="w-full p-3 rounded-xl bg-black border border-slate-700"
          />

          {searchTerm && !selectedDebt && (
            <div className="mt-2 bg-black border border-slate-700 rounded-xl overflow-hidden">

              {filteredDebts.map((d) => {
                const remaining =
                  d.total_amount - d.paid_amount;

                return (
                  <button
                    key={d.id}
                    className="w-full text-left p-3 hover:bg-slate-800 border-b border-slate-800"
                    onClick={() => {
                      setSelectedDebt(d.id);
                      setSearchTerm(d.client_name);
                    }}
                  >
                    <div className="flex justify-between">
                      <span>{d.client_name}</span>
                      <span className="text-green-400 text-sm">
                        {remaining} {d.currency}
                      </span>
                    </div>
                  </button>
                );
              })}

            </div>
          )}

          <input
            type="number"
            placeholder="Montant payé"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            className="w-full mt-3 p-3 rounded-xl bg-black border border-slate-700"
          />

          <button
            onClick={payDebt}
            className="w-full mt-3 bg-green-600 py-3 rounded-xl font-bold"
          >
            Valider paiement
          </button>
        </div>

        {/* LIST */}
        <div>
          <h2 className="font-bold mb-3 text-center">
            📋 Dettes actives
          </h2>

          {debts.length === 0 ? (
            <div className="text-center text-slate-500">
              Aucune dette
            </div>
          ) : (
            <div className="space-y-3">

              {debts.map((d) => {
                const remaining =
                  d.total_amount - d.paid_amount;

                const percent =
                  d.total_amount > 0
                    ? (d.paid_amount / d.total_amount) * 100
                    : 0;

                return (
                  <div
                    key={d.id}
                    className="bg-slate-900 border border-slate-800 p-4 rounded-2xl"
                  >
                    <div className="flex justify-between mb-2">
                      <span className="font-bold">
                        {d.client_name}
                      </span>
                      <span className="text-green-400 text-sm">
                        {remaining} {d.currency}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-800 rounded-full">
                      <div
                        className="h-2 bg-green-500 rounded-full"
                        style={{ width: percent + "%" }}
                      />
                    </div>
                  </div>
                );
              })}

            </div>
          )}
        </div>

      </div>
    </main>
  );
}
