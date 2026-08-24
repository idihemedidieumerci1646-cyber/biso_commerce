"use client";

import { supabase } from "@/lib/supabase";
import {
  getSyncQueue,
  removeFromSyncQueue,
  type SyncAction,
} from "./offline-db";

// ============================================================
// BISO-COMMERCE
// SYNCHRONISATION OFFLINE → SUPABASE
// ============================================================

let syncing = false;

// ============================================================
// SYNCHRONISER UNE ACTION
// ============================================================

async function syncAction(action: SyncAction): Promise<boolean> {
  try {
    // --------------------------------------------------------
    // INSERT
    // --------------------------------------------------------

    if (action.action === "insert") {
      const { error } = await supabase
        .from(action.table)
        .insert(action.data);

      if (error) {
        console.error(
          `Erreur INSERT ${action.table}:`,
          error
        );

        return false;
      }

      return true;
    }

    // --------------------------------------------------------
    // UPDATE
    // --------------------------------------------------------

    if (action.action === "update") {
      if (!action.data?.id) {
        console.error(
          "UPDATE impossible : id manquant."
        );

        return false;
      }

      const { id, ...data } = action.data;

      const { error } = await supabase
        .from(action.table)
        .update(data)
        .eq("id", id)
        .eq("user_id", action.user_id);

      if (error) {
        console.error(
          `Erreur UPDATE ${action.table}:`,
          error
        );

        return false;
      }

      return true;
    }

    // --------------------------------------------------------
    // DELETE
    // --------------------------------------------------------

    if (action.action === "delete") {
      if (!action.data?.id) {
        console.error(
          "DELETE impossible : id manquant."
        );

        return false;
      }

      const { error } = await supabase
        .from(action.table)
        .delete()
        .eq("id", action.data.id)
        .eq("user_id", action.user_id);

      if (error) {
        console.error(
          `Erreur DELETE ${action.table}:`,
          error
        );

        return false;
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error(
      "Erreur synchronisation action:",
      error
    );

    return false;
  }
}

// ============================================================
// SYNCHRONISER TOUTE LA FILE
// ============================================================

export async function syncOfflineData(): Promise<void> {
  if (typeof window === "undefined") return;

  // Pas Internet
  if (!navigator.onLine) {
    return;
  }

  // Une synchronisation est déjà en cours
  if (syncing) {
    return;
  }

  syncing = true;

  try {
    const queue = await getSyncQueue();

    if (!queue.length) {
      return;
    }

    console.log(
      `🔄 ${queue.length} opération(s) à synchroniser...`
    );

    for (const action of queue) {
      const success = await syncAction(action);

      // IMPORTANT :
      // On supprime de la file uniquement si
      // Supabase a accepté l'opération.
      if (success) {
        await removeFromSyncQueue(action.id);

        console.log(
          `✅ Synchronisé : ${action.action} ${action.table}`
        );
      } else {
        console.log(
          `⏳ Conservé pour plus tard : ${action.id}`
        );
      }
    }
  } catch (error) {
    console.error(
      "Erreur générale de synchronisation:",
      error
    );
  } finally {
    syncing = false;
  }
}

// ============================================================
// DÉMARRER LE SYSTÈME OFFLINE
// ============================================================

export function startOfflineSync(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  // ----------------------------------------------------------
  // INTERNET REVIENT
  // ----------------------------------------------------------

  const handleOnline = () => {
    console.log(
      "🌐 Connexion retrouvée."
    );

    // Petite attente pour laisser la connexion
    // se stabiliser sur les téléphones.
    setTimeout(() => {
      syncOfflineData();
    }, 1000);
  };

  // ----------------------------------------------------------
  // INTERNET PERDU
  // ----------------------------------------------------------

  const handleOffline = () => {
    console.log(
      "📴 BISO-COMMERCE fonctionne maintenant hors connexion."
    );
  };

  window.addEventListener(
    "online",
    handleOnline
  );

  window.addEventListener(
    "offline",
    handleOffline
  );

  // ----------------------------------------------------------
  // SI INTERNET EST DÉJÀ DISPONIBLE
  // ----------------------------------------------------------

  if (navigator.onLine) {
    syncOfflineData();
  }

  // ----------------------------------------------------------
  // NETTOYAGE
  // ----------------------------------------------------------

  return () => {
    window.removeEventListener(
      "online",
      handleOnline
    );

    window.removeEventListener(
      "offline",
      handleOffline
    );
  };
}