"use client";

import { useEffect } from "react";
import { startOfflineSync } from "@/lib/offline-sync";

export default function OfflineSyncProvider() {
  useEffect(() => {
    const stopSync = startOfflineSync();

    return () => {
      stopSync();
    };
  }, []);

  return null;
}