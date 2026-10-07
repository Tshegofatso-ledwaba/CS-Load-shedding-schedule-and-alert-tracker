import type { Metadata } from "next";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import ThemeToggle from "./components/ThemeToggle";
import BackButton from "./components/BackButton";

export const metadata: Metadata = {
  title: "PowerTrack | Load-shedding clarity",
  description: "Live load-shedding status and schedules for your area.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try { const theme = localStorage.getItem('powertrack_theme'); if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme; } catch {}" }} /></head><body><BackButton />{children}<ThemeToggle /></body></html>;
}
