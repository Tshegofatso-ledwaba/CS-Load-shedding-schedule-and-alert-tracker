"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

const fallbackPaths: Record<string, string> = {
  "/admin/login": "/",
  "/admin/dashboard": "/",
  "/admin/locations": "/admin/dashboard",
  "/admin/schedules": "/admin/dashboard",
};

const appPathHistory: string[] = [];
const historySubscribers = new Set<() => void>();

function notifyHistorySubscribers() {
  for (const subscriber of historySubscribers) subscriber();
}

function subscribeToHistory(onChange: () => void) {
  historySubscribers.add(onChange);
  if (historySubscribers.size === 1) {
    window.addEventListener("popstate", handlePopState);
  }
  return () => {
    historySubscribers.delete(onChange);
    if (historySubscribers.size === 0) window.removeEventListener("popstate", handlePopState);
  };
}

function handlePopState() {
  if (appPathHistory.length > 1) appPathHistory.pop();
  notifyHistorySubscribers();
}

function hasPreviousAppPage() {
  return appPathHistory.length > 1;
}

function recordPathname(pathname: string) {
  if (appPathHistory.at(-1) === pathname) return;
  appPathHistory.push(pathname);
  notifyHistorySubscribers();
}

export default function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const canGoBack = useSyncExternalStore(subscribeToHistory, hasPreviousAppPage, () => false);
  const fallbackPath = fallbackPaths[pathname];

  useEffect(() => {
    recordPathname(pathname);
  }, [pathname]);

  function goBack() {
    if (hasPreviousAppPage()) {
      router.back();
      return;
    }
    if (fallbackPath) router.push(fallbackPath);
  }

  if (pathname === "/") return null;

  return <div className="back-navigation"><button className="nav back-button" type="button" onClick={goBack} disabled={!canGoBack && !fallbackPath} aria-label="Go back">Back</button></div>;
}