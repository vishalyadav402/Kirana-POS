"use client";

/* =========================
   PRODUCTS STORAGE
========================= */

const PRODUCTS_KEY = "products";

export const getProducts = () => {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];
};

export const saveProducts = (products) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

/* =========================
   CUSTOMERS STORAGE
========================= */

const CUSTOMERS_KEY = "customers";

/* GET ALL CUSTOMERS */
export const getCustomers = () => {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(CUSTOMERS_KEY)) || [];
};

/* ADD CUSTOMER */
export const addCustomer = (customer) => {
  const customers = getCustomers();
  const newCustomer = {
    ...customer,
    id: Date.now()
  };
  localStorage.setItem(
    CUSTOMERS_KEY,
    JSON.stringify([...customers, newCustomer])
  );
};

/* UPDATE CUSTOMER */
export const updateCustomer = (id, updatedData) => {
  const customers = getCustomers().map((c) =>
    c.id === id ? { ...c, ...updatedData } : c
  );
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
};

/* DELETE CUSTOMER */
export const deleteCustomer = (id) => {
  const customers = getCustomers().filter((c) => c.id !== id);
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
};



// CATEGORY STORAGE
export const getCategories = () => {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem("categories") || "[]");
};

export const saveCategory = (category) => {
  if (!category) return;

  const existing = getCategories();

  if (!existing.includes(category)) {
    const updated = [...existing, category];
    localStorage.setItem("categories", JSON.stringify(updated));
  }
};
