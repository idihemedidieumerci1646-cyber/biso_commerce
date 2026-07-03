
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Lock, Phone, KeyRound, Loader2, MessageCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const [showReset, setShowReset] = useState(false);
  const [resetPhone, setResetPhone] = useState("");

  const handleLogin = async () => {
    if (!phone || !pin) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = phone.trim();

      // 1. GET USER
      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .eq("phone", cleanPhone);

      if (error || !users?.length) {
        alert("Cher client vérifie bien votre numéro et votre PIN");
        return;
      }

      const user = users[0];

      // 2. CHECK PIN
      const basePin = String(user.pin).replace(/\s+/g, "");
      const saisiePin = String(pin).replace(/\s+/g, "");

      if (basePin !== saisiePin) {
        alert("PIN incorrect");
        return;
      }

      // 3. CHECK SUBSCRIPTION (IMPORTANT)
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const now = new Date();
      const end = new Date(sub?.end_date || 0);

      const isActive =
        sub?.is_active === true && end > now;

      if (!sub || !isActive) {
        alert("❌ Abonnement expiré");
        router.replace("/subscription");
        return;
      }

      // 4. SAVE SESSION
      localStorage.setItem("phone", cleanPhone);
localStorage.setItem("user_id", user.id);


      // 5. GO DASHBOARD
      router.push("/dashboard");

    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = () => {
    if (!resetPhone) {
      alert("Veuillez entrer votre numéro");
      return;
    }

    const message = encodeURIComponent(
      `Bonjour PDG j'ai oublié mon pin. Mon numéro est : ${resetPhone}`
    );

    window.open(
      `https://wa.me/243994864173?text=${message}`,
      "_blank"
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black flex items-center justify-center px-4">

      <div className="w-full max-w-md">

        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center">
              <Lock className="text-black" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white">
            Connexion caisse
          </h1>

          <p className="text-xs text-slate-400 mt-1">
            Accès sécurisé à votre gestion
          </p>
        </div>

        {/* FORM */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">

          {/* PHONE */}
          <div className="space-y-1">
            <p className="text-xs text-slate-400">NUMÉRO</p>
            <div className="flex items-center gap-2 bg-black/40 border border-slate-800 rounded-xl px-3">
              <Phone size={16} className="text-green-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="XXXXXXXXXX"
                className="w-full bg-transparent p-3 outline-none text-white"
              />
            </div>
          </div>

          {/* PIN */}
          <div className="space-y-1">
            <p className="text-xs text-slate-400">PIN</p>
            <div className="flex items-center gap-2 bg-black/40 border border-slate-800 rounded-xl px-3">
              <KeyRound size={16} className="text-green-400" />
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-transparent p-3 outline-none text-white"
              />
            </div>
          </div>

          {/* BUTTON LOGIN */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 transition p-4 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Connexion...
              </>
            ) : (
              <>
                <Lock size={18} />
                Se connecter
              </>
            )}
          </button>

          {/* RESET */}
          <button
            onClick={() => setShowReset(!showReset)}
            className="text-xs text-slate-400 underline w-full text-center"
          >
            Mot de passe oublié ?
          </button>

          {showReset && (
            <div className="bg-black/40 border border-slate-800 p-4 rounded-xl space-y-3">

              <input
                type="tel"
                value={resetPhone}
                onChange={(e) => setResetPhone(e.target.value)}
                placeholder="Numéro de votre compte"
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white"
              />

              <button
                onClick={handleResetPassword}
                className="w-full bg-blue-600 hover:bg-blue-700 transition p-3 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} />
                WhatsApp support
              </button>

            </div>
          )}
        </div>

      </div>
    </main>
  );
}
