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

  const [step, setStep] = useState("form");

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    const phoneStorage = localStorage.getItem("phone");
    if (!phoneStorage) return;

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phoneStorage)
      .single();

    if (!user) return;

    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) {
      setStatus("expired");
      return;
    }

    setSubscription(data);

    const now = new Date();
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

    const isTrialActive =
      data.status === "trial" &&
      new Date(data.trial_end || 0) > now;

    const isActive = data.is_active === true && left > 0;
    const isPending = data.status === "pending";

    if (isPending) setStatus("pending");
    else if (isTrialActive || isActive) setStatus("active");
    else setStatus("expired");
  };

  const handleRenew = async () => {
    if (!fullName || !phone) {
      alert("Veuillez remplir votre nom et numéro de téléphone");
      return;
    }

    const phoneStorage = localStorage.getItem("phone");
    if (!phoneStorage) return;

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone", phoneStorage)
      .single();

    if (!user || !subscription?.id) return;

    await supabase
      .from("subscriptions")
      .update({
        full_name: fullName,
        phone: phone,
        status: "pending",
        user_id: user.id,
      })
      .eq("id", subscription.id)
      .eq("user_id", user.id);

    setStatus("pending");
    setStep("confirm");
  };

  return (
    <main className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">💳 Mon abonnement</h1>
          <p className="text-slate-400 text-sm">
            Gestion de votre accès Biso-Commerce
          </p>
        </div>

        {/* STATUS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center">
          <p className="text-slate-400">Statut actuel</p>

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
              ? "⏳ En attente de validation"
              : "🔴 Expiré"}
          </h2>
        </div>

        {/* USAGE */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <p className="text-slate-400">📅 Utilisation de votre abonnement</p>

          <h2 className="text-xl font-bold mt-2">
            {daysUsed} / 30 jours utilisés
          </h2>

          <p className="text-green-400 mt-1">
            {daysLeft} jours restants
          </p>
        </div>

        {/* INFO */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-bold mb-2">💰 Abonnement Biso-Commerce</h3>
          <p className="text-slate-300">Prix : 5 USD / mois</p>
          <div className="mt-3 text-sm text-slate-300 space-y-1">
            <p>Avec cet abonnement vous avez accès à :</p>
            <p>✅ Gestion des produits</p>
            <p>✅ Enregistrement des ventes</p>
            <p>✅ Gestion des dettes clients</p>
            <p>✅ Suivi des dépenses</p>
            <p>✅ Rapports financiers</p>
            <p>✅ Dashboard complet</p>
          </div>
        </div>

        {/* PAIEMENT */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h3 className="font-bold mb-2">📱 Moyens de paiement</h3>
          <p className="text-slate-300">AIRTEL MONEY : +243 994 864 173</p>
          <p className="text-slate-300">ORANGE MONEY : +243XXXXXXXX</p>
          <p className="text-slate-300">MPESA : +243XXXXXXXX</p>
        </div>

        {/* FORM */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <input
            className="w-full p-3 rounded-xl bg-black border border-slate-700"
            placeholder="Nom complet"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            className="w-full p-3 rounded-xl bg-black border border-slate-700"
            placeholder="Numéro de téléphone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* BUTTON STEP 1 */}
        <button
          onClick={handleRenew}
          className="w-full bg-green-600 hover:bg-green-500 transition p-4 rounded-xl font-bold"
        >
          🔄 Renouveler mon abonnement
        </button>

        {/* STEP 2 CONFIRMATION */}
        {step === "confirm" && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 p-5 rounded-2xl text-yellow-300 space-y-3">
            
            <p className="font-bold text-lg">
              📸 Dernière étape obligatoire
            </p>
            <p className="text-sm">Merci pour votre demande de renouvellement.</p>
            <p className="text-sm">👉 Avant de continuer, vous devez envoyer :</p>
            <ul className="text-sm list-disc pl-5 space-y-1">
              <li>La capture d’écran de votre paiement</li>
              <li>La preuve de transaction mobile money</li>
            </ul>
            <p className="text-sm mt-2">Cliquez ensuite sur le bouton ci-dessous pour envoyer la preuve directement sur WhatsApp au support.</p>

            <button
              onClick={() => {
                const message = `Bonjour PDG,

Je viens de faire le paiement pour le renouvellement de mon abonnement Biso-Commerce.

Nom : ${fullName}
Téléphone : ${phone}

Je joins ici la capture d’écran et la preuve de paiement.`;

                const url =
                  "https://wa.me/243994864173?text=" +
                  encodeURIComponent(message);

                window.open(url, "_blank");
              }}
              className="w-full bg-green-600 hover:bg-green-500 p-3 rounded-xl font-bold"
            >
              📤 Envoyer la preuve sur WhatsApp au PDG
            </button>
          </div>
        )}

        {/* PENDING */}
        {status === "pending" && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl text-yellow-300">
            ⏳ Votre demande est en cours de vérification par l’administration.
          </div>
        )}

      </div>
    </main>
  );
}
