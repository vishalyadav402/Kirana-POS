"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/app/utils/supabase";

export default function BillingHistory() {
  const [bills, setBills] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("address", "POS") // ✅ only POS orders, not KiranaNeeds delivery orders
      .order("created_at", { ascending: false });
    if (!error) setBills(data || []);
    setFetching(false);
  };

  const filtered = bills.filter((b) => {
    const matchSearch =
      b.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.order_id?.toLowerCase().includes(search.toLowerCase()) ||
      b.phone?.includes(search);
    const matchStatus = filterStatus === "all" || b.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalRevenue = filtered.reduce((sum, b) => sum + Number(b.total || 0), 0);
  const udharTotal = filtered
    .filter((b) => b.status === "udhar")
    .reduce((sum, b) => sum + Number(b.total || 0), 0);

  return (
    <>
      <div className="md:p-6 mx-auto max-w-2xl">
        <h1 className="text-xl font-bold mb-4">🧾 Billing History</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Total Bills</p>
            <p className="text-lg font-bold text-purple-700">{filtered.length}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Revenue</p>
            <p className="text-lg font-bold text-green-700">₹{totalRevenue}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Udhar</p>
            <p className="text-lg font-bold text-orange-600">₹{udharTotal}</p>
          </div>
        </div>

        {/* Search + Filter */}
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
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-100 text-gray-400 hover:text-gray-600"
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

        {/* Bill List */}
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
              const date = new Date(bill.created_at).toLocaleString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
              });

              return (
                <div key={bill.id} className="border rounded-lg overflow-hidden bg-white">
                  {/* Row */}
                  <div
                    className="flex items-center px-3 py-2 gap-2 cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : bill.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {bill.name || "Walk-in"}
                        </p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          bill.status === "udhar"
                            ? "bg-orange-100 text-orange-600"
                            : bill.status === "split"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-green-100 text-green-700"
                        }`}>
                          {bill.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{bill.order_id} · {date}</p>
                      {bill.phone && (
                        <p className="text-xs text-gray-400">{bill.phone}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-purple-700">₹{bill.total}</p>
                      <p className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? "s" : ""}</p>
                    </div>
                    <span className="text-gray-400 text-xs ml-1">{expanded ? "▲" : "▼"}</span>
                  </div>

                  {/* Expanded */}
                  {expanded && (
                    <div className="border-t bg-gray-50 px-3 py-3">
                      <table className="w-full text-xs">
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
                            <td colSpan={3} className="pt-2 font-semibold text-right text-gray-700">Grand Total</td>
                            <td className="pt-2 font-bold text-right text-purple-700">₹{bill.total}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
