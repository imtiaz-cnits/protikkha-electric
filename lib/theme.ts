export function getInitialTheme(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem("theme");
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return document.documentElement.classList.contains("dark");
}

export function applyTheme(isDark: boolean) {
  if (typeof window === "undefined") return;
  if (isDark) {
    document.documentElement.classList.add("dark");
    document.documentElement.setAttribute("light-mode", "dark");
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("light-mode");
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("theme", "light");
  }
  window.dispatchEvent(new CustomEvent("theme-change", { detail: { isDark } }));
}
