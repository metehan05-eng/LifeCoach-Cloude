"use client";
import { useEffect, useState } from "react";

/**
 * SSR/hydration uyumsuzluğunu önlemek için içeriği yalnızca tarayıcıda render eder.
 */
export default function ClientOnly({ children, fallback = null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return fallback;
  return children;
}
