
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

import { Store, Phone, Lock, Loader2, Sparkles, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPin, setShowPin] = useState(false); // 👈 NEW

  const handleRegister = async () => {
    if (!businessName || !phone || !pin) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);

    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        full_name: businessName,
        phone: phone,
        pin: pin,
      })
      .select()
      .single();

    if (userError || !user) {
      alert("Erreur utilisateur : " + userError?.message);
      setLoading(false);
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const { error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
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

    alert("Compte créé 🚀 30 jours gratuits activés");

    localStorage.setItem("phone", phone);

    setLoading(false);

    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-5">

      <div className="w-full max-w-md">

        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="bg-green-500/10 p-3 rounded-2xl border border-green-500/30">
              <Store className="text-green-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white">
            Biso Commerce
          </h1>

          <p className="text-xs text-slate-400 mt-1">
            Crée ton compte caisse en 30 secondes
          </p>
        </div>

        {/* FORM CARD */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">

          {/* BUSINESS NAME */}
          <div>
            <label className="text-xs text-slate-400">
              Nom du commerce
            </label>

            <div className="flex items-center gap-2 bg-black/40 border border-slate-800 rounded-xl p-3 mt-1">
              <Store size={18} className="text-green-400" />
              <input
                type="text"
                placeholder="Ex: Boutique Amani"
                value={businessName}
                onChange={(e) =>
                  setBusinessName(e.target.value)
                }
                className="bg-transparent w-full outline-none text-white text-sm"
              />
            </div>
          </div>

          {/* PHONE */}
          <div>
            <label className="text-xs text-slate-400">
              Téléphone
            </label>

            <div className="flex items-center gap-2 bg-black/40 border border-slate-800 rounded-xl p-3 mt-1">
              <Phone size={18} className="text-blue-400" />
              <input
                type="tel"
                placeholder="XXXXXXXXX"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
                className="bg-transparent w-full outline-none text-white text-sm"
              />
            </div>
          </div>

          {/* PIN */}
          <div>
            <label className="text-xs text-slate-400">
              Code PIN
            </label>

            <div className="flex items-center gap-2 bg-black/40 border border-slate-800 rounded-xl p-3 mt-1">
              <Lock size={18} className="text-yellow-400" />

              <input
                type={showPin ? "text" : "password"} // 👈 TOGGLE
                placeholder="••••"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value)
                }
                className="bg-transparent w-full outline-none text-white text-sm"
              />

              {/* 👁️ BUTTON */}
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-slate-400 hover:text-white"
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* BUTTON */}
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 transition p-4 rounded-2xl font-bold flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Créer mon compte
              </>
            )}
          </button>

          {/* FOOTER INFO */}
          <p className="text-[10px] text-slate-500 text-center">
            30 jours gratuits • Sans carte bancaire
          </p>
        </div>
      </div>
    </main>
  );
}
