import { openDB } from "idb";

const DB_NAME = "pos-db";
const DB_VERSION = 3;

export const getDB = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // ── V1 STORES ───────────────────────────────────────
      if (!db.objectStoreNames.contains("customers")) {
        const cs = db.createObjectStore("customers", { keyPath: "id" });
        cs.createIndex("mobile", "mobile");
      }
      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue", {
          keyPath: "id",
          autoIncrement: true,
        });
      }

      // ── V2 STORES ───────────────────────────────────────
      if (!db.objectStoreNames.contains("products")) {
        const ps = db.createObjectStore("products", { keyPath: "id" });
        ps.createIndex("is_active", "is_active");
      }
      if (!db.objectStoreNames.contains("orders")) {
        const os = db.createObjectStore("orders", { keyPath: "order_id" });
        os.createIndex("customer_id", "customer_id");
        os.createIndex("created_at", "created_at");
        os.createIndex("status", "status");
      }
      if (!db.objectStoreNames.contains("udharPayments")) {
        const us = db.createObjectStore("udharPayments", { keyPath: "id" });
        us.createIndex("customer_id", "customer_id");
      }

      // ── V3 STORES ───────────────────────────────────────
      if (!db.objectStoreNames.contains("manualUdhar")) {
        const mu = db.createObjectStore("manualUdhar", { keyPath: "id" });
        mu.createIndex("customer_id", "customer_id");
      }
    },

    // ✅ if another tab has old version open, tell it to close
    blocking() {
      console.warn("DB upgrade blocked — closing old connection");
      window.location.reload();
    },

    // ✅ if this tab is blocking an upgrade in another tab, close and reload
    blocked() {
      console.warn("DB upgrade needed — reloading page");
      window.location.reload();
    },
  });