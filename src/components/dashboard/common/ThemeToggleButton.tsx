import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { cn } from "@/lib/utils";

type Props = { className?: string };

export const ThemeToggleButton: React.FC<Props> = ({ className }) => {
  const { toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Theme umschalten"
      title="Theme umschalten"
      className={cn(
        "relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-dark-900 h-11 w-11 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white",
        className
      )}
    >
      <span className="sr-only">Theme umschalten</span>
      <Sun className="hidden size-5 dark:block" aria-hidden="true" />
      <Moon className="size-5 dark:hidden" aria-hidden="true" />
    </button>
  );
};
