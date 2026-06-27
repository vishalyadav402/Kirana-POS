"use client";
import { useEffect } from "react";
import { flushSyncQueue, pullFromSupabase } from "./sync";

export default function SyncProvider({ children }) {
  useEffect(() => {
    // On mount: pull latest from Supabase + flush any queued ops
    const init = async () => {
      await flushSyncQueue();
      await pullFromSupabase("customers");
      // add more tables here as needed
    };
    init();

    // On reconnect: auto-sync
    const handleOnline = async () => {
      console.log("🟢 Back online — syncing...");
      await flushSyncQueue();
      await pullFromSupabase("customers");
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return children;
}