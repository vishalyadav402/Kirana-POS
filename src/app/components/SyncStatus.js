"use client";
import { useState, useEffect, useCallback } from "react";
import { syncAll, getPendingCount } from "../utils/sync";
import { toast } from "react-toastify";

export default function SyncStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPending = useCallback(async () => {
    const count = await getPendingCount();
    setPending(count);
  }, []);

  const handleSync = useCallback(async () => {
    if (!isOnline) { toast.error("No internet connection"); return; }
    setSyncing(true);
    try {
      await syncAll();
      await refreshPending();
      toast.success("Synced successfully ✅");
    } catch {
      toast.error("Sync failed, will retry automatically");
    } finally {
      setSyncing(false);
    }
  }, [isOnline, refreshPending]);

  useEffect(() => {
    // set initial state
    setIsOnline(navigator.onLine);
    refreshPending();

    const handleOnline = async () => {
      setIsOnline(true);
      toast.success("Back online — syncing...", { autoClose: 2000 });
      setSyncing(true);
      await syncAll();
      await refreshPending();
      setSyncing(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warn("Offline — bills will sync when reconnected", { autoClose: 3000 });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // refresh pending count every 10s
    const interval = setInterval(refreshPending, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [refreshPending]);

  return (
    <button
      onClick={handleSync}
      disabled={syncing || !isOnline}
      title={isOnline ? "Click to sync now" : "Offline — working locally"}
      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-all
        ${isOnline
          ? "bg-green-700 hover:bg-green-600 text-white"
          : "bg-red-700 text-white cursor-not-allowed"
        }`}
    >
      {/* status dot */}
      <span className={`w-1.5 h-1.5 rounded-full ${
        syncing ? "bg-yellow-300 animate-pulse" :
        isOnline ? "bg-green-300" : "bg-red-300"
      }`} />

      {syncing ? "Syncing..." : isOnline ? "Online" : "Offline"}

      {pending > 0 && (
        <span className="bg-yellow-400 text-black text-[10px] font-bold px-1.5 rounded-full">
          {pending}
        </span>
      )}
    </button>
  );
}
