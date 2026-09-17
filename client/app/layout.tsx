import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PowerTrack | Load-shedding clarity",
  description: "Live load-shedding status and schedules for your area.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en"><body>{children}</body></html>;
}
