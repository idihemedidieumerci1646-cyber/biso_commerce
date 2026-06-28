
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [daysUsed, setDaysUsed] = useState(0);
  const [daysLeft, setDaysLeft] = useState(30);
  const [status, setStatus] = useState<"active" | "expired" | "pending">("active");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    loadSubscription();
  }, []);

  // 📥 LOAD SUBSCRIPTION (CORRIGÉ)
  const loadSubscription = async () => {
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      setStatus("expired");
      return;
    }

    setSubscription(data);

    const now = new Date();

    // 📅 CALCUL JOURS
    const start = data.start_date ? new Date(data.start_date) : null;

    let used = 0;

    if (start) {
      const diffTime = now.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      used = diffDays < 0 ? 0 : diffDays;
    }

    const left = Math.max(0, 30 - used);

    setDaysUsed(used);
    setDaysLeft(left);

    // 🔥 LOGIQUE SIMPLE ET FIABLE
    const isTrialActive =
      data.status === "trial" &&
      new Date(data.trial_end || 0) > now;

    const isActive =
      data.is_active === true &&
      left > 0;

    const isPending = data.status === "pending";

    if (isPending) {
      setStatus("pending");
    } else if (isTrialActive || isActive) {
      setStatus("active");
    } else {
      setStatus("expired");
    }
  };

  // 👉 RENOUVELLEMENT WHATSAPP
  const handleRenew = async () => {
    if (!fullName || !phone) {
      alert("Veuillez remplir vos informations");
      return;
    }

    await supabase
      .from("subscriptions")
      .update({
        full_name: fullName,
        phone: phone,
        status: "pending",
      })
      .eq("id", subscription?.id);

    setStatus("pending");

    const message = `Bonjour PDG,

J'ai effectué mon paiement pour l'abonnement Biso-Commerce.

Nom : ${fullName}
Téléphone : ${phone}`;

    const url =
      "https://wa.me/243994864173?text=" + encodeURIComponent(message);

    window.open(url, "_blank");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">

      <div className="max-w-2xl mx-auto space-y-6">

        {/* TITRE */}
        <h1 className="text-3xl font-bold">
          💳 Mon abonnement
        </h1>

        {/* STATUS */}
        <div className="bg-white/10 p-5 rounded-2xl">
          <p className="text-gray-400">Statut</p>

          <h2
            className={`text-2xl font-bold mt-2 ${
              status === "active"
                ? "text-green-400"
                : status === "pending"
                ? "text-yellow-400"
                : "text-red-400"
            }`}
          >
            {status === "active"
              ? "🟢 Actif"
              : status === "pending"
              ? "⏳ En attente"
              : "🔴 Expiré"}
          </h2>
        </div>

        {/* UTILISATION */}
        <div className="bg-white/10 p-5 rounded-2xl">
          <p className="text-gray-400">📅 Utilisation</p>

          <h2 className="text-xl font-bold mt-2">
            {daysUsed} / 30 jours utilisés
          </h2>

          <p className="text-green-400 mt-1">
            {daysLeft} jours restants
          </p>
        </div>

        {/* INFOS */}
        <div className="bg-white/10 p-5 rounded-2xl">
          <h3 className="font-bold mb-2">
            💰 Informations abonnement
          </h3>

          <p>Abonnement Biso-Commerce</p>
          <p>Prix : 5 USD / mois</p>

          <div className="mt-3 text-sm text-gray-300">
            <p>Accès complet :</p>
            <p>✅ Produits</p>
            <p>✅ Ventes</p>
            <p>✅ Dettes</p>
            <p>✅ Dépenses</p>
            <p>✅ Rapports</p>
            <p>✅ Dashboard</p>
          </div>
        </div>

        {/* PAIEMENT */}
        <div className="bg-white/10 p-5 rounded-2xl">
          <h3 className="font-bold mb-2">
            📱 Moyens de paiement
          </h3>

          <p>AIRTEL MONEY : +243 994 864 173</p>
          <p>ORANGE MONEY : +243XXXXXXXX</p>
          <p>MPESA : +243XXXXXXXX</p>
        </div>

        {/* FORM */}
        <div className="bg-white/10 p-5 rounded-2xl space-y-3">
          <input
            className="w-full p-3 rounded bg-slate-800"
            placeholder="VOTRE NOM COMPLET"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            className="w-full p-3 rounded bg-slate-800"
            placeholder="VOTRE NUMÉRO DE TÉLÉPHONE"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* BUTTON */}
        <button
          onClick={handleRenew}
          className="w-full bg-green-600 p-4 rounded-xl font-bold"
        >
          🔄 Renouveler mon abonnement
        </button>

        {/* PENDING MESSAGE */}
        {status === "pending" && (
          <div className="bg-yellow-500/10 p-4 rounded-xl text-yellow-300">
            ⏳ Votre demande est en attente de validation.
          </div>
        )}

      </div>
    </main>
  );
}
