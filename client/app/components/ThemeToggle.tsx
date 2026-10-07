"use client";

export default function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const nextTheme = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = nextTheme;

    try {
      window.localStorage.setItem("powertrack_theme", nextTheme);
    } catch {}
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle light and dark theme"
      title="Toggle light and dark theme"
    >
      <span className="theme-icon-light" aria-hidden="true">☀</span>
      <span className="theme-icon-dark" aria-hidden="true">☾</span>
    </button>
  );
}