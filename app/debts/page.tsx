"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function DebtsPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("FC");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedDebt, setSelectedDebt] = useState("");
  
  // Seul ajout pour la recherche
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = async () => {
    const { data, error } = await supabase
      .from("debts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { console.log(error); return; }
    setDebts(data || []);
  };

  const addDebt = async () => {
    if (!name || !amount || !currency) {
      alert("Veuillez remplir tous les champs (Nom, montant et devise).");
      return;
    }
    const { error } = await supabase
      .from("debts")
      .insert([{ client_name: name, total_amount: Number(amount), paid_amount: 0, currency }]);
    if (error) { alert("Erreur : " + error.message); return; }
    alert("La dette a été ajoutée avec succès !");
    setName(""); setAmount(""); loadDebts();
  };

  const payDebt = async () => {
    if (!selectedDebt || !paymentAmount) {
      alert("Veuillez choisir une dette et indiquer le montant payé.");
      return;
    }
    const debt = debts.find((d) => d.id === selectedDebt);
    if (!debt) return;

    // SÉCURITÉ AJOUTÉE
    const remaining = Number(debt.total_amount) - Number(debt.paid_amount);
    if (Number(paymentAmount) > remaining) {
      alert("Erreur : le paiement dépasse le reste dû (" + remaining + ")");
      return;
    }

    const newPaid = Number(debt.paid_amount) + Number(paymentAmount);
    if (Number(debt.total_amount) - newPaid <= 0) {
      await supabase.from("debts").delete().eq("id", selectedDebt);
    } else {
      await supabase.from("debts").update({ paid_amount: newPaid }).eq("id", selectedDebt);
    }
    alert("Le paiement a été enregistré avec succès !");
    setPaymentAmount(""); setSelectedDebt(""); setSearchTerm(""); loadDebts();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4">
      <div className="max-w-md mx-auto space-y-6">
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold">🧾 Gestion des dettes</h1>
          <p className="text-slate-400">Suivez vos clients et paiements.</p>
        </div>

        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-xl">
          <h2 className="text-lg font-bold mb-4 text-center">➕ Nouvelle dette</h2>
          <div className="space-y-3">
            <input placeholder="Nom du client" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700" />
            <input type="number" placeholder="Montant" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700" />
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white">
              <option value="FC">Franc Congolais (FC)</option>
              <option value="$">Dollar ($)</option>
            </select>
            <button onClick={addDebt} className="w-full bg-green-600 hover:bg-green-700 p-3 rounded-xl font-bold transition mt-2">Ajouter la dette</button>
          </div>
        </div>

        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-xl">
          <h2 className="text-lg font-bold mb-4 text-center">💰 Paiement reçu</h2>
          <div className="space-y-3">
            
            {/* RECHERCHE DESIGN SOMBRE */}
            <input 
                placeholder="Rechercher le client..." 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setSelectedDebt(""); }} 
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700" 
            />
            {searchTerm && !selectedDebt && (
                <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
                    {debts.filter(d => d.client_name.toLowerCase().includes(searchTerm.toLowerCase())).map((d) => (
                        <button key={d.id} className="w-full p-3 text-left hover:bg-slate-800" onClick={() => { setSelectedDebt(d.id); setSearchTerm(d.client_name); }}>
                            {d.client_name} - Reste {Number(d.total_amount) - Number(d.paid_amount)} {d.currency}
                        </button>
                    ))}
                </div>
            )}

            <input type="number" placeholder="Montant payé" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700" />
            <button onClick={payDebt} className="w-full bg-green-600 hover:bg-green-700 p-3 rounded-xl font-bold transition mt-2">Enregistrer le paiement</button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 text-center mt-6">📋 Dettes en cours</h2>
          {debts.length === 0 ? (
            <div className="bg-white/5 p-6 rounded-3xl text-center text-slate-500 border border-white/5">Aucune dette</div>
          ) : (
            <div className="space-y-4">
              {debts.map((d) => {
                const remaining = Number(d.total_amount) - Number(d.paid_amount);
                const percent = (Number(d.paid_amount) / Number(d.total_amount)) * 100;
                return (
                  <div key={d.id} className="bg-white/5 p-5 rounded-3xl border border-white/10">
                    <h3 className="font-bold text-lg mb-2">{d.client_name}</h3>
                    <div className="space-y-1 text-sm">
                      <p className="text-slate-300">Total: {Number(d.total_amount).toLocaleString()} {d.currency}</p>
                      <p className="text-green-400 font-bold text-base">Reste: {remaining.toLocaleString()} {d.currency}</p>
                      <div className="w-full h-2 bg-slate-800 rounded-full mt-2">
                        <div className="h-2 bg-green-500 rounded-full" style={{ width: percent + "%" }} />
                      </div>
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