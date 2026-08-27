"use client";

export function isLowEndDevice(): boolean {
  if (typeof window === "undefined") return false;

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  };

  return (
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) ||
    nav.connection?.effectiveType === "slow-2g" ||
    nav.connection?.effectiveType === "2g" ||
    nav.connection?.saveData === true ||
    (navigator.hardwareConcurrency !== undefined &&
      navigator.hardwareConcurrency <= 2)
  );
}

export function disableHeavyAnimations() {
  if (typeof document === "undefined") return;

  if (isLowEndDevice()) {
    document.documentElement.classList.add("biso-low-end");
  }
}