"use client";

import { useEffect } from "react";
import { disableHeavyAnimations } from "@/lib/performance";

export default function PerformanceOptimizer() {
  useEffect(() => {
    disableHeavyAnimations();
  }, []);

  return null;
}