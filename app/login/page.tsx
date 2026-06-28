"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      if (!phone || !pin) {
        alert("Veuillez remplir tous les champs");
        return;
      }

      setLoading(true);

      const cleanPhone = phone.trim();

      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .eq("phone", cleanPhone);

      if (error) {
        console.error("Erreur Supabase :", error);
        alert("Erreur de lecture utilisateurs");
        setLoading(false);
        return;
      }

      if (!users || users.length === 0) {
        alert("Téléphone introuvable");
        setLoading(false);
        return;
      }

      const user = users[0];
      
      // Nettoyage agressif : supprime absolument tous les espaces/caractères invisibles
      const basePin = String(user.pin).replace(/\s+/g, '');
      const saisiePin = String(pin).replace(/\s+/g, '');

      console.log("PIN en base (nettoyé) :", basePin);
      console.log("PIN saisi (nettoyé) :", saisiePin);

      if (basePin !== saisiePin) {
        alert("PIN incorrect");
        setLoading(false);
        return;
      }

      localStorage.setItem("phone", cleanPhone);
      alert("Connexion réussie 🚀");
      router.push("/dashboard");
      
    } catch (err) {
      console.error("Erreur inattendue :", err);
      alert("Erreur inattendue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center px-5">
      <div className="w-full max-w-md bg-white/10 p-8 rounded-3xl">
        <h1 className="text-3xl font-bold text-white mb-6">
          🔐 Connexion
        </h1>

        <div className="space-y-4">
          <input
            type="tel"
            placeholder="Votre numéro"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20"
          />

          <input
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-green-600 p-4 rounded-xl text-white font-bold"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </div>
      </div>
    </main>
  );
}
