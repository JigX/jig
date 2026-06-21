"use client";
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type enMessages from "../messages/en.json";

type Messages = typeof enMessages;
type Locale = "en" | "nl";

type NestedValue = string | Record<string, NestedValue>;

function getNestedValue(obj: Record<string, NestedValue>, path: string): string {
  const parts = path.split(".");
  let current: NestedValue = obj;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return path;
    current = (current as Record<string, NestedValue>)[part];
  }
  return typeof current === "string" ? current : path;
}

interface I18nContext {
  locale: Locale;
  setLocale: (l: Locale) => void;
  messages: Messages;
}

const Ctx = createContext<I18nContext | null>(null);

export function I18nProvider({
  children,
  defaultMessages,
}: {
  children: ReactNode;
  defaultMessages: Messages;
}) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [messages, setMessages] = useState<Messages>(defaultMessages);

  useEffect(() => {
    const saved = document.cookie.match(/locale=([^;]+)/)?.[1] as Locale | undefined;
    if (saved && saved !== "en") {
      setLocaleState(saved);
      import(`../messages/${saved}.json`).then((m) => setMessages(m.default));
    }
  }, []);

  function setLocale(l: Locale) {
    document.cookie = `locale=${l}; path=/; max-age=31536000`;
    setLocaleState(l);
    import(`../messages/${l}.json`).then((m) => setMessages(m.default));
  }

  return <Ctx.Provider value={{ locale, setLocale, messages }}>{children}</Ctx.Provider>;
}

export function useLocale() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLocale must be used within I18nProvider");
  return { locale: ctx.locale, setLocale: ctx.setLocale };
}

export function useTranslations(namespace: string) {
  const ctx = useContext(Ctx);
  const msgs = ctx?.messages ?? ({} as Messages);
  const ns = (msgs as Record<string, NestedValue>)[namespace] as Record<string, NestedValue> ?? {};

  return function t(key: string): string {
    return getNestedValue(ns, key) ?? key;
  };
}
