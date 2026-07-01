"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/app/utils/supabase";

export default function BillingHistory() {
  const [bills, setBills] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("all"); // today | week | month | all
  const [showUdharOnly, setShowUdharOnly] = useState(false);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("address", "POS")
      .order("created_at", { ascending: false });
    if (!error) setBills(data || []);
    setFetching(false);
  };

  // ─── DATE FILTER ────────────────────────────────────────
  const isInDateRange = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    if (filterDate === "today") {
      return date.toDateString() === now.toDateString();
    }
    if (filterDate === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return date >= weekAgo;
    }
    if (filterDate === "month") {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
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
  const totalDiscount = filtered.reduce((sum, b) => sum + Number(b.discount || 0), 0);
  const udharTotal = filtered
    .filter((b) => b.status === "udhar")
    .reduce((sum, b) => sum + Number(b.total || 0) - Number(b.discount || 0), 0);
  const totalBills = filtered.length;
  const completedBills = filtered.filter((b) => b.status === "completed").length;

  return (
    <div className="md:p-6 mx-auto max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">🧾 Billing History</h1>
        <button
          onClick={fetchBills}
          className="text-xs bg-gray-100 border px-3 py-1.5 rounded-md text-gray-600 hover:bg-gray-200"
        >
          🔄 Refresh
        </button>
      </div>

      {/* ─── SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Total Bills</p>
          <p className="text-lg font-bold text-purple-700">{totalBills}</p>
          <p className="text-[10px] text-gray-400">{completedBills} completed</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Net Revenue</p>
          <p className="text-lg font-bold text-green-700">₹{totalRevenue.toFixed(2)}</p>
          {totalDiscount > 0 && (
            <p className="text-[10px] text-gray-400">after ₹{totalDiscount.toFixed(2)} discount</p>
          )}
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Udhar Pending</p>
          <p className="text-lg font-bold text-orange-600">₹{udharTotal.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">Total Discounts</p>
          <p className="text-lg font-bold text-red-500">₹{totalDiscount.toFixed(2)}</p>
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
          <button
            key={d.value}
            onClick={() => setFilterDate(d.value)}
            className={`text-xs px-3 py-1 rounded-full border ${
              filterDate === d.value
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-gray-600 border-gray-300"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* ─── SEARCH + STATUS FILTER ─── */}
      <div className="sticky top-0 z-30 py-2 -mx-4 px-4 md:-mx-6 md:px-6 flex gap-2">
        <div className="relative bg-gray-100 flex-1">
          <input
            type="text"
            placeholder="Search name, bill no, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-md p-2 w-full pr-8 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-md p-2 text-sm bg-white"
        >
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
            const date = new Date(bill.created_at).toLocaleString("en-IN", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            });

            return (
              <div key={bill.id} className="border rounded-lg overflow-hidden bg-white shadow-sm">

                {/* ─── ROW ─── */}
                <div
                  className="flex items-center px-3 py-2 gap-2 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(expanded ? null : bill.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{bill.name || "Walk-in"}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        bill.status === "udhar"
                          ? "bg-orange-100 text-orange-600"
                          : bill.status === "split"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-green-100 text-green-700"
                      }`}>
                        {bill.status}
                      </span>
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
                    <p className="font-bold text-purple-700">₹{netTotal.toFixed(2)}</p>
                    {discount > 0 && (
                      <p className="text-xs text-gray-400 line-through">₹{bill.total}</p>
                    )}
                    <p className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? "s" : ""}</p>
                  </div>
                  <span className="text-gray-400 text-xs ml-1">{expanded ? "▲" : "▼"}</span>
                </div>

                {/* ─── EXPANDED ─── */}
                {expanded && (
                  <div className="border-t bg-gray-50 px-3 py-3">

                    {/* Items table */}
                    <table className="w-full text-xs mb-3">
                      <thead>
                        <tr className="text-gray-400 border-b">
                          <th className="text-left pb-1">Item</th>
                          <th className="text-right pb-1">Qty</th>
                          <th className="text-right pb-1">Rate</th>
                          <th className="text-right pb-1">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="py-1">
                              <p className="font-medium">{item.name}</p>
                              {item.selectedVariant && (
                                <p className="text-gray-400">{item.selectedVariant}</p>
                              )}
                            </td>
                            <td className="text-right py-1">{item.qty}</td>
                            <td className="text-right py-1">₹{item.price}</td>
                            <td className="text-right py-1 font-medium">₹{item.total}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} className="pt-2 text-right text-gray-500 text-xs">Subtotal</td>
                          <td className="pt-2 text-right text-gray-700 font-medium">₹{bill.total}</td>
                        </tr>
                        {discount > 0 && (
                          <tr>
                            <td colSpan={3} className="text-right text-red-400 text-xs">Discount</td>
                            <td className="text-right text-red-500 font-medium">-₹{discount.toFixed(2)}</td>
                          </tr>
                        )}
                        <tr>
                          <td colSpan={3} className="pt-1 font-semibold text-right text-gray-700">Net Total</td>
                          <td className="pt-1 font-bold text-right text-purple-700">₹{netTotal.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>

                    {/* Payment summary */}
                    <div className="bg-white border rounded-md px-3 py-2 text-xs space-y-1 text-gray-600">
                      <div className="flex justify-between">
                        <span>Payment Mode</span>
                        <span className="font-medium capitalize">{bill.status === "udhar" ? "Udhar" : bill.status === "split" ? "Split" : "Paid"}</span>
                      </div>
                      {bill.status === "udhar" && (
                        <div className="flex justify-between text-orange-500 font-semibold">
                          <span>Udhar Amount</span>
                          <span>₹{netTotal.toFixed(2)}</span>
                        </div>
                      )}
                      {bill.status === "split" && (
                        <>
                          <div className="flex justify-between text-green-600">
                            <span>Paid Now</span>
                            <span>₹{Number(bill.paid_amount || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-orange-500">
                            <span>Udhar Remaining</span>
                            <span>₹{(netTotal - Number(bill.paid_amount || 0)).toFixed(2)}</span>
                          </div>
                        </>
                      )}
                      {bill.status === "completed" && (
                        <div className="flex justify-between text-green-600 font-semibold">
                          <span>Paid</span>
                          <span>✅ ₹{netTotal.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Ledger link if customer exists */}
                    {bill.customer_id && (
                      <button
                        onClick={() => window.open(`/customer-ledger?id=${bill.customer_id}`, "_blank")}
                        className="mt-3 w-full text-xs bg-purple-50 border border-purple-200 text-purple-700 py-1.5 rounded-md hover:bg-purple-100"
                      >
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
