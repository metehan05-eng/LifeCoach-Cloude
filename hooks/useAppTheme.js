"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "han-theme";

export function useAppTheme() {
  const [theme, setThemeState] = useState("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    const preferred =
      saved ||
      (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    setThemeState(preferred);
    document.documentElement.setAttribute("data-theme", preferred);
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      preferred === "light" ? "#f8f9fc" : "#060618"
    );
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      next === "light" ? "#f8f9fc" : "#060618"
    );
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme, mounted };
}
