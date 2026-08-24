"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

export default function Navbar() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#050b16]/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[58px] max-w-7xl items-center justify-between gap-3 px-3 sm:px-4">
        
        {/* LOGO */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-yellow-400 shadow-sm">
            <span className="text-base">🏪</span>
          </div>

          <h1 className="truncate text-base font-black tracking-tight text-white sm:text-lg">
            BISO-
            <span className="bg-gradient-to-r from-orange-400 to-yellow-300 bg-clip-text text-transparent">
              COMMERCE
            </span>
          </h1>
        </div>

        {/* ÉTAT INTERNET */}
        <div
          className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black sm:px-3.5 sm:text-xs ${
            isOnline
              ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
              : "border-amber-400/20 bg-amber-500/10 text-amber-300"
          }`}
        >
          {isOnline ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>

              <Wifi size={13} />

              <span>En ligne</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-400" />

              <WifiOff size={13} />

              <span>Hors connexion</span>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}