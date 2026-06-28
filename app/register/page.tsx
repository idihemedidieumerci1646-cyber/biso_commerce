"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!businessName || !phone || !pin) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);

    const { error: userError } = await supabase
      .from("users")
      .insert({
        full_name: businessName,
        phone: phone,
        pin: pin,
      });

    if (userError) {
      alert("Erreur : " + userError.message);
      setLoading(false);
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const { error: subError } = await supabase
      .from("subscriptions")
      .insert({
        full_name: businessName,
        phone: phone,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_active: true,
        status: "trial",
      });

    if (subError) {
      alert("Erreur abonnement : " + subError.message);
      setLoading(false);
      return;
    }

    alert("Compte créé avec succès 🚀 30 jours gratuits activés");

    setLoading(false);

    localStorage.setItem("phone", phone);


    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center px-5">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">

        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🏪</div>

          <h1 className="text-3xl font-bold text-white">
            Biso-Commerce
          </h1>

          <p className="text-slate-300 mt-2">
            Créez votre commerce
          </p>
        </div>

        <div className="space-y-4">

          <input
            type="text"
            placeholder="Votre nom complet"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20 outline-none"
          />

          <input
            type="tel"
            placeholder="Votre numéro"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20 outline-none"
          />

          <input
            type="password"
            placeholder="Code PIN (6 chiffres)"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20 outline-none"
          />

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full p-4 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700"
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>

        </div>

      </div>
    </main>
  );
}