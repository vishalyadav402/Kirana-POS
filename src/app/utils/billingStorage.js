// get all bills
export const getBills = () => {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem("bills") || "[]");
};

// save bill
export const saveBill = (bill) => {
  const bills = getBills();
  bills.unshift(bill); // newest first
  localStorage.setItem("bills", JSON.stringify(bills));
};
