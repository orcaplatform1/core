"use client";

import { useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { authStorage } from "@/lib/auth-storage";

const VISITOR_ID_KEY = "orca_visitor_id";
const LAST_PING_KEY = "orca_visitor_last_ping";

function getOrCreateVisitorId() {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

// Sadece giris yapmamis (anonim) ziyaretcileri sayar — bu yuzden token varsa
// hic istek atmiyoruz. Gunde bir kez ping atarak (localStorage'daki tarih
// damgasiyla) her sayfa gecisinde gereksiz istek gitmesini engelliyoruz.
export function VisitorPing() {
  useEffect(() => {
    if (authStorage.getAccessToken()) return;
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(LAST_PING_KEY) === today) return;
    const visitorId = getOrCreateVisitorId();
    apiClient("/public/track-visit", { method: "POST", auth: false, body: { visitorId } })
      .then(() => localStorage.setItem(LAST_PING_KEY, today))
      .catch(() => {});
  }, []);

  return null;
}
