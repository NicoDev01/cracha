"use client";

import type React from "react";
import { createContext, useState, useContext, useEffect } from "react";
import { useMounted } from "@/hooks/use-mounted";

type Theme = "light" | "dark";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Dark is what the site is designed for, so it is what a first-time visitor
  // gets. The inline script in the root layout has already put the class on
  // <html>; this only has to agree with it.
  const isMounted = useMounted();
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    return savedTheme === "light" ? "light" : "dark";
  });

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [theme, isMounted]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
