"use client";

import { useEffect, useState } from "react";
import { RiSunLine, RiMoonLine } from "react-icons/ri";

export function ThemeToggle({ pill = false }: { pill?: boolean }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("crm-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored === "dark" || (!stored && prefersDark);
    setDark(isDark);
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("crm-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("crm-theme", "light");
    }
  }

  if (!mounted) {
    return (
      <div
        className={pill ? "theme-toggle-wrap" : "theme-toggle"}
        style={{ opacity: 0 }}
        aria-hidden="true"
      >
        <span className="h-4 w-4" />
      </div>
    );
  }

  if (pill) {
    return (
      <button
        onClick={toggle}
        className="theme-toggle-wrap anim-bounce-in"
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        title={dark ? "Light mode" : "Dark mode"}
      >
        <span
          className="flex h-5 w-5 items-center justify-center transition-all"
          style={{ color: dark ? "#f59e0b" : "var(--muted)" }}
        >
          <RiSunLine className="h-4 w-4" />
        </span>
        {/* Track */}
        <div
          className="relative h-5 w-9 rounded-full transition-all duration-300"
          style={{
            background: dark
              ? "linear-gradient(135deg, var(--accent), var(--accent2))"
              : "var(--border)",
          }}
        >
          <div
            className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-300"
            style={{ left: dark ? "calc(100% - 18px)" : "2px" }}
          />
        </div>
        <span
          className="flex h-5 w-5 items-center justify-center transition-all"
          style={{ color: dark ? "var(--accent2)" : "var(--muted2)" }}
        >
          <RiMoonLine className="h-4 w-4" />
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="theme-toggle anim-bounce-in"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? (
        <RiSunLine className="h-4 w-4" style={{ color: "#f59e0b" }} />
      ) : (
        <RiMoonLine className="h-4 w-4" />
      )}
    </button>
  );
}
