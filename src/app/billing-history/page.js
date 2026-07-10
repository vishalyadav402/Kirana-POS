"use client";
import { useEffect, useState } from "react";
import { getOrders } from "@/app/utils/storage";

export default function BillingHistory() {
  const [bills, setBills] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("all");

  useEffect(() => { loadBills(); }, []);

  const loadBills = async () => {
    setFetching(true);
    const data = await getOrders(); // ✅ reads from IndexedDB — works offline
    setBills(data);
    setFetching(false);
  };

  // ─── PROFIT HELPERS ─────────────────────────────────────
 const calcBillProfit = (bill) => {
    const gross = (bill.items || []).reduce((sum, item) => {
      const cp = Number(item.cp || 0);
      if (cp <= 0) return sum; // ✅ skip items with no CP
      const price = Number(item.price || 0);
      const qty = Number(item.qty || 1);
      return sum + (price - cp) * qty;
    }, 0);
    return gross - Number(bill.discount || 0);
  };

  const calcItemProfit = (item) => {
    const cp = Number(item.cp || 0);
    if (cp <= 0) return 0; // ✅ no CP entered — don't count price as profit
    return (Number(item.price || 0) - cp) * Number(item.qty || 1);
  };

  const calcItemMargin = (item) => {
    const cp = Number(item.cp || 0);
    const price = Number(item.price || 0);
    if (cp === 0) return null;
    return (((price - cp) / price) * 100).toFixed(1);
  };

  // ─── DATE FILTER ────────────────────────────────────────
  const isInDateRange = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    if (filterDate === "today") return date.toDateString() === now.toDateString();
    if (filterDate === "week") {
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      return date >= weekAgo;
    }
    if (filterDate === "month") {
      return date.getMonth() === now.getMonth() &&
             date.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filtered = bills.filter((b) => {
    const matchSearch =
      b.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.order_id?.toLowerCase().includes(search.toLowerCase()) ||
      b.phone?.includes(search);
    const matchStatus = filterStatus === "all" || b.status === filterStatus;
    const matchDate = isInDateRange(b.created_at);
    return matchSearch && matchStatus && matchDate;
  });

  // ─── SUMMARY STATS ──────────────────────────────────────
  const totalRevenue = filtered.reduce(
    (sum, b) => sum + Number(b.total || 0) - Number(b.discount || 0), 0
  );
  const totalProfit = filtered.reduce((sum, b) => sum + calcBillProfit(b), 0);
  const totalDiscount = filtered.reduce((sum, b) => sum + Number(b.discount || 0), 0);
  const udharTotal = filtered
    .filter((b) => b.status === "udhar")
    .reduce((sum, b) => sum + Number(b.total || 0) - Number(b.discount || 0), 0);
  const avgMargin = totalRevenue > 0
    ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  return (
    <div className="md:p-6 p-3 mx-auto max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">🧾 Billing History</h1>
        <button onClick={loadBills}
          className="text-xs bg-gray-100 border px-3 py-1.5 rounded-md text-gray-600 hover:bg-gray-200">
          🔄 Refresh
        </button>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Total Bills</p>
          <p className="text-xl font-bold text-purple-700">{filtered.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Net Revenue</p>
          <p className="text-xl font-bold text-green-700">₹{totalRevenue.toFixed(0)}</p>
          {totalDiscount > 0 && (
            <p className="text-[10px] text-gray-400">after ₹{totalDiscount.toFixed(0)} discount</p>
          )}
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Total Profit</p>
          <p className={`text-xl font-bold ${totalProfit >= 0 ? "text-blue-700" : "text-red-500"}`}>
            ₹{totalProfit.toFixed(0)}
          </p>
          <p className="text-[10px] text-gray-400">{avgMargin}% margin</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Udhar Pending</p>
          <p className="text-xl font-bold text-orange-600">₹{udharTotal.toFixed(0)}</p>
        </div>
      </div>

      {/* ─── DATE QUICK FILTERS ─── */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {[
          { label: "All Time", value: "all" },
          { label: "Today", value: "today" },
          { label: "This Week", value: "week" },
          { label: "This Month", value: "month" },
        ].map((d) => (
          <button key={d.value} onClick={() => setFilterDate(d.value)}
            className={`text-xs px-3 py-1 rounded-full border ${
              filterDate === d.value
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-gray-600 border-gray-300"
            }`}>
            {d.label}
          </button>
        ))}
      </div>

      {/* ─── SEARCH + STATUS FILTER ─── */}
      <div className="sticky top-0 z-30 py-2 -mx-4 px-4 md:-mx-6 md:px-6 flex gap-2">
        <div className="relative bg-gray-100 flex-1">
          <input type="text" placeholder="Search name, bill no, phone..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="border rounded-md p-2 w-full pr-8 text-sm" />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              ✕
            </button>
          )}
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-md p-2 text-sm bg-white">
          <option value="all">All</option>
          <option value="completed">Completed</option>
          <option value="udhar">Udhar</option>
          <option value="split">Split</option>
        </select>
      </div>

      {/* ─── BILL LIST ─── */}
      <div className="mt-3 space-y-2">
        {fetching ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white border rounded-lg p-3 flex gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-10">No bills found</div>
        ) : (
          filtered.map((bill) => {
            const expanded = expandedId === bill.id;
            const items = bill.items || [];
            const discount = Number(bill.discount || 0);
            const netTotal = Number(bill.total || 0) - discount;
            const billProfit = calcBillProfit(bill);
            const profitMargin = netTotal > 0
              ? ((billProfit / netTotal) * 100).toFixed(1) : 0;
            const date = new Date(bill.created_at).toLocaleString("en-IN", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            });

            return (
              <div key={bill.order_id}
                className="border rounded-lg overflow-hidden bg-white shadow-sm">

                {/* ROW */}
                <div
                  className="flex items-center px-3 py-2 gap-2 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(expanded ? null : bill.order_id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{bill.name || "Walk-in"}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        bill.status === "udhar" ? "bg-orange-100 text-orange-600" :
                        bill.status === "split" ? "bg-blue-100 text-blue-600" :
                        "bg-green-100 text-green-700"
                      }`}>{bill.status}</span>
                      {discount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-500 font-medium">
                          -₹{discount} off
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{bill.order_id} · {date}</p>
                    {bill.phone && <p className="text-xs text-gray-400">{bill.phone}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-purple-700">₹{netTotal.toFixed(0)}</p>
                    <p className={`text-xs font-medium ${billProfit >= 0 ? "text-blue-600" : "text-red-500"}`}>
                      {billProfit >= 0 ? "+" : ""}₹{billProfit.toFixed(0)} profit
                    </p>
                    <p className="text-[10px] text-gray-400">{profitMargin}% margin</p>
                  </div>
                  <span className="text-gray-400 text-xs ml-1">
                    {expandedId === bill.order_id ? "▲" : "▼"}
                  </span>
                </div>

                {/* EXPANDED */}
                {expandedId === bill.order_id && (
                  <div className="border-t bg-gray-50 px-3 py-3">
                    <table className="w-full text-xs mb-3">
                      <thead>
                        <tr className="text-gray-400 border-b">
                          <th className="text-left pb-1">Item</th>
                          <th className="text-right pb-1">Qty</th>
                          <th className="text-right pb-1">CP</th>
                          <th className="text-right pb-1">Rate</th>
                          <th className="text-right pb-1">Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, i) => {
                          const itemProfit = calcItemProfit(item);
                          const margin = calcItemMargin(item);
                          return (
                            <tr key={i} className="border-b border-gray-100">
                              <td className="py-1">
                                <p className="font-medium">{item.name}</p>
                                {item.selectedVariant && (
                                  <p className="text-gray-400">{item.selectedVariant}</p>
                                )}
                              </td>
                              <td className="text-right py-1">{item.qty}</td>
                              <td className="text-right py-1 text-gray-400">
                                {item.cp ? `₹${item.cp}` : "—"}
                              </td>
                              <td className="text-right py-1">₹{item.price}</td>
                              <td className="text-right py-1">
                                <p className={`font-medium ${itemProfit >= 0 ? "text-blue-600" : "text-red-500"}`}>
                                  {itemProfit >= 0 ? "+" : ""}₹{itemProfit.toFixed(0)}
                                </p>
                                {margin !== null && (
                                  <p className="text-gray-400">{margin}%</p>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t">
                          <td colSpan={3} className="pt-2 text-right text-gray-500">Subtotal</td>
                          <td className="pt-2 text-right font-medium">₹{bill.total}</td>
                          <td />
                        </tr>
                        {discount > 0 && (
                          <tr>
                            <td colSpan={3} className="text-right text-red-400">Discount</td>
                            <td className="text-right text-red-500 font-medium">-₹{discount}</td>
                            <td className="text-right text-red-400 text-[10px]">reduces profit</td>
                          </tr>
                        )}
                        <tr>
                          <td colSpan={3} className="pt-1 font-semibold text-right text-gray-700">Net Total</td>
                          <td className="pt-1 font-bold text-right text-purple-700">₹{netTotal.toFixed(0)}</td>
                          <td />
                        </tr>
                        <tr>
                          <td colSpan={3} className="pt-1 font-semibold text-right text-gray-700">Net Profit</td>
                          <td />
                          <td className={`pt-1 font-bold text-right ${billProfit >= 0 ? "text-blue-700" : "text-red-500"}`}>
                            {billProfit >= 0 ? "+" : ""}₹{billProfit.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Payment summary */}
                    <div className="bg-white border rounded-md px-3 py-2 text-xs space-y-1 text-gray-600">
                      <div className="flex justify-between">
                        <span>Payment Mode</span>
                        <span className="font-medium capitalize">
                          {bill.status === "udhar" ? "Udhar" :
                           bill.status === "split" ? "Split" : "Paid"}
                        </span>
                      </div>
                      {bill.status === "udhar" && (
                        <div className="flex justify-between text-orange-500 font-semibold">
                          <span>Udhar Amount</span>
                          <span>₹{netTotal.toFixed(0)}</span>
                        </div>
                      )}
                      {bill.status === "completed" && (
                        <div className="flex justify-between text-green-600 font-semibold">
                          <span>Paid</span>
                          <span>✅ ₹{netTotal.toFixed(0)}</span>
                        </div>
                      )}
                    </div>

                    {bill.customer_id && (
                      <button
                        onClick={() => window.open(`/customer-ledger?id=${bill.customer_id}`, "_blank")}
                        className="mt-3 w-full text-xs bg-purple-50 border border-purple-200 text-purple-700 py-1.5 rounded-md hover:bg-purple-100">
                        👤 View Customer Ledger →
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
