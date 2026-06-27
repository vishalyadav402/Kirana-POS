import { openDB } from "idb";

const DB_NAME = "pos-db";
const DB_VERSION = 1;

export const getDB = () =>
  openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Customers store
      if (!db.objectStoreNames.contains("customers")) {
        const cs = db.createObjectStore("customers", { keyPath: "id" });
        cs.createIndex("mobile", "mobile");
      }
      // Sync queue store
      if (!db.objectStoreNames.contains("syncQueue")) {
        db.createObjectStore("syncQueue", {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    },
  });