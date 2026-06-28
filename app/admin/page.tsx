"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Subscription = {
  id: string;
  full_name: string;
  phone: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  status: string;
  created_at: string;
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  
  // 🔍 Ajout de l'état pour la recherche
  const [searchTerm, setSearchTerm] = useState("");

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [renewRequests, setRenewRequests] = useState<Subscription[]>([]);
  const [activeClients, setActiveClients] = useState<Subscription[]>([]);
  const [expiredClients, setExpiredClients] = useState<Subscription[]>([]);

  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  // 📥 LOAD DATA
  const loadData = async () => {
    setLoading(true);

    const { data: subs, error } = await supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur Supabase:", error);
      setLoading(false);
      return;
    }

    const { data: payments } = await supabase
      .from("subscription_payments")
      .select("*");

    let revenue = 0;
    payments?.forEach((p: any) => {
      revenue += Number(p.amount || 0);
    });

    const now = new Date();
    const data = (subs as Subscription[]) || [];

    // 🟢 ACTIFS
    const active = data.filter((s: Subscription) => {
      if (!s.end_date) return false;
      return s.is_active === true && new Date(s.end_date) > now;
    });

    // 🔴 EXPIRÉS
    const expired = data.filter((s: Subscription) => {
      if (!s.end_date) return false;
      return s.is_active === false || new Date(s.end_date) < now;
    });

    // ⏳ DEMANDES
    const requests = data.filter((s: Subscription) => s.status === "pending");

    setSubscriptions(data);
    setActiveClients(active);
    setExpiredClients(expired);
    setRenewRequests(requests);
    setTotalRevenue(revenue);

    setLoading(false);
  };

  // ✅ ACTIVER ABONNEMENT
  const activateSubscription = async (client: Subscription) => {
    const confirmAction = confirm(
      "[ATTENTION] Activer l'abonnement de " + client.full_name + " ?"
    );

    if (!confirmAction) return;

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);

    const { error } = await supabase
      .from("subscriptions")
      .update({
        is_active: true,
        status: "active",
        start_date: start.toISOString(),
        end_date: end.toISOString(),
      })
      .eq("id", client.id);

    if (error) {
      alert(error.message);
      return;
    }

    // 💰 AJOUT PAIEMENT 5$
    const { error: paymentError } = await supabase
      .from("subscription_payments")
      .insert({
        phone: client.phone,
        full_name: client.full_name,
        amount: 5,
      });

    if (paymentError) {
      alert(paymentError.message);
      return;
    }

    alert("Abonnement activé");
    await loadData();
  };

  // 🟡 REFUSER
  const deleteRequest = async (client: Subscription) => {
    const confirmDelete = confirm(
      "[REFUSER] Refuser la demande de " + client.full_name + " ?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "rejected",
        is_active: false,
      })
      .eq("id", client.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Demande refusée (compte non bloqué)");
    await loadData();
  };

  // ⏳ FILTRAGE DES DEMANDES (Logique de recherche)
  const filteredRequests = renewRequests.filter((client) =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  // ⏳ LOADING
  if (loading) {
    return (
      <div className="p-6 text-white">Chargement...</div>
    );
  }

  return (
    <main className="p-6 text-white bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">👑 Admin Panel</h1>

      {/* 📊 STATS */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-600 p-4 rounded-xl">
          💰 {totalRevenue} $
        </div>
        <div className="bg-blue-600 p-4 rounded-xl">
          👥 {activeClients.length} actifs
        </div>
        <div className="bg-red-600 p-4 rounded-xl">
          ❌ {expiredClients.length} expirés
        </div>
      </div>

      {/* 🔍 BARRE DE RECHERCHE */}
      <input
        type="text"
        placeholder="Rechercher par nom ou code (ex: 0936)..."
        className="w-full p-3 mb-6 bg-gray-800 border border-white/20 rounded-xl text-white"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* ⏳ DEMANDES */}
      <h2 className="text-xl font-bold mb-3">
        Demandes de renouvellement ({filteredRequests.length})
      </h2>

      {filteredRequests.length === 0 ? (
        <p className="text-gray-400 mb-4">Aucune demande trouvée</p>
      ) : (
        filteredRequests.map((c) => (
          <div
            key={c.id}
            className="p-3 border-b border-white/10 flex justify-between items-center"
          >
            <div>
              <p className="font-bold">{c.full_name}</p>
              <p className="text-sm text-gray-400">{c.phone}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => activateSubscription(c)}
                className="bg-green-600 px-3 py-1 rounded"
              >
                ✅ Activer
              </button>

              <button
                onClick={() => deleteRequest(c)}
                className="bg-red-600 px-3 py-1 rounded"
              >
                ❌ Refuser
              </button>
            </div>
          </div>
        ))
      )}
    </main>
  );
}