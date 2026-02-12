"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";
import { useEffect, useState } from "react";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  // Fix for vh units on mobile (Safari iOS address bar)
  useEffect(() => {
    const setVhVariable = () => {
      const vh = (window.visualViewport?.height ?? window.innerHeight) * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVhVariable();
    window.addEventListener('resize', setVhVariable);
    window.visualViewport?.addEventListener('resize', setVhVariable);

    return () => {
      window.removeEventListener('resize', setVhVariable);
      window.visualViewport?.removeEventListener('resize', setVhVariable);
    };
  }, []);

  // Use useEffect to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}