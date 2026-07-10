"use client";
import { useState, useEffect, Suspense,useRef } from "react";
import { useSearchParams } from "next/navigation";
import { getCustomers, getOrders, getAllUdharPayments, getAllManualUdhar, pullLedgerData  } from "@/app/utils/storage";
import CustomerAccount from "@/app/components/CustomerAccount";

function CustomerLedgerContent() {
  const autoOpenedRef = useRef(null);
  const searchParams = useSearchParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filterUdhar, setFilterUdhar] = useState(false);

  
  useEffect(() => { loadLedger(); }, []);

  // auto-open customer if ?id= passed from billing history
 useEffect(() => {
    const id = searchParams.get("id");
    if (id && rows.length > 0 && autoOpenedRef.current !== id) { // ✅ guard
      const found = rows.find((r) => r.id === id);
      if (found) {
        setSelected(found);
        autoOpenedRef.current = id; // ✅ mark as handled
      }
    }
  }, [searchParams, rows]);

 const loadLedger = async () => {
  setLoading(true);

  await pullLedgerData(); // ✅ pull latest from Supabase first, if online

  const [customers, orders, payments, manualUdhar] = await Promise.all([
    getCustomers(),
    getOrders(),
    getAllUdharPayments(),
    getAllManualUdhar(),
  ]);

  const summary = customers.map((c) => {
    const custOrders = orders.filter((o) => o.customer_id === c.id);
    const custPayments = payments.filter((p) => p.customer_id === c.id);
    const custManualUdhar = manualUdhar.filter((m) => m.customer_id === c.id); // ✅ new

    const totalBilled = custOrders.reduce(
      (sum, o) => sum + Number(o.total || 0) - Number(o.discount || 0), 0
    );
    const totalUdharGiven = custOrders
      .filter((o) => o.status === "udhar" || o.status === "split")
      .reduce((sum, o) => sum + Number(o.total || 0) - Number(o.discount || 0), 0);
    const totalManualUdharGiven = custManualUdhar.reduce(
      (sum, m) => sum + Number(m.amount || 0), 0
    ); // ✅ new
    const totalUdharPaidBack = custPayments.reduce(
      (sum, p) => sum + Number(p.amount || 0), 0
    );
    const totalProfit = custOrders.reduce((sum, o) => {
      const gross = (o.items || []).reduce((s, item) => {
        const cp = Number(item.cp || 0);
        if (cp <= 0) return s; // ✅ skip items with no CP entered
        const price = Number(item.price || 0);
        const qty = Number(item.qty || 1);
        return s + (price - cp) * qty;
      }, 0);
      return sum + gross - Number(o.discount || 0);
    }, 0);
    const lastOrder = custOrders[0];

    return {
      ...c,
      totalOrders: custOrders.length,
      totalBilled,
      totalProfit,
      udharRemaining: totalUdharGiven + totalManualUdharGiven - totalUdharPaidBack, // ✅ updated
      lastOrderDate: lastOrder?.created_at || null,
    };
  });

  summary.sort(
    (a, b) => b.udharRemaining - a.udharRemaining || b.totalBilled - a.totalBilled
  );

  setRows(summary);
  setLoading(false);
};

  const filtered = rows.filter((r) => {
    const matchSearch =
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.mobile?.includes(search);
    const matchUdhar = filterUdhar ? r.udharRemaining > 0 : true;
    return matchSearch && matchUdhar;
  });

  // overall stats
  const totalUdharPending = rows.reduce(
    (sum, r) => sum + (r.udharRemaining > 0 ? r.udharRemaining : 0), 0
  );
  const totalRevenue = rows.reduce((sum, r) => sum + r.totalBilled, 0);
  const totalProfit = rows.reduce((sum, r) => sum + r.totalProfit, 0);
  const customersWithUdhar = rows.filter((r) => r.udharRemaining > 0).length;

  return (
    <div className="md:p-6 p-3 mx-auto max-w-2xl">
      <>

        {/* HEADER */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Customer Ledger</h1>
            <p className="text-xs text-gray-400 mt-0.5">{rows.length} customers total</p>
          </div>
          <button onClick={loadLedger}
            className="text-xs bg-white border px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 shadow-sm">
            🔄 Refresh
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white border rounded-xl p-3 text-center shadow-sm">
            <p className="text-xs text-gray-400">Total Customers</p>
            <p className="text-xl font-bold text-purple-700">{rows.length}</p>
          </div>
          <div className="bg-white border rounded-xl p-3 text-center shadow-sm">
            <p className="text-xs text-gray-400">Total Revenue</p>
            <p className="text-xl font-bold text-green-600">₹{totalRevenue.toFixed(0)}</p>
          </div>
          <div className="bg-white border rounded-xl p-3 text-center shadow-sm">
            <p className="text-xs text-gray-400">Total Profit</p>
            <p className={`text-xl font-bold ${totalProfit >= 0 ? "text-blue-600" : "text-red-500"}`}>
              ₹{totalProfit.toFixed(0)}
            </p>
          </div>
          <div className="bg-white border border-orange-200 rounded-xl p-3 text-center shadow-sm">
            <p className="text-xs text-gray-400">Udhar Pending</p>
            <p className="text-xl font-bold text-orange-600">₹{totalUdharPending.toFixed(0)}</p>
            <p className="text-[10px] text-gray-400">{customersWithUdhar} customers</p>
          </div>
        </div>

        {/* SEARCH + FILTER */}
        <div className="flex gap-2 mb-4 sticky top-0 z-20 bg-white py-2 -mx-4 px-4">
          <div className="relative flex-1">
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or mobile..."
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 pr-8 shadow-sm" />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                ✕
              </button>
            )}
          </div>

          <button onClick={() => setFilterUdhar(!filterUdhar)}
            className={`text-xs px-3 py-2 rounded-lg border font-medium shadow-sm ${
              filterUdhar
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white text-gray-600 border-gray-300"
            }`}>
            Udhar Only
          </button>
        </div>

        {/* CUSTOMER LIST */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white border rounded-xl p-4 flex gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12 text-sm">
            {filterUdhar ? "No customers with pending udhar 🎉" : "No customers found"}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const initials = r.name?.split(" ")
                .map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              const lastDate = r.lastOrderDate
                ? new Date(r.lastOrderDate).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "short",
                  })
                : null;

              return (
                <div key={r.id} onClick={() => setSelected(r)}
                  className="bg-white border rounded-xl px-2 py-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm flex-shrink-0">
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="capitalize gap-2">
                      <p className="font-semibold text-sm text-gray-800">{r.name}</p>
                      <p className="font-semibold text-xs md:text-sm text-gray-800">{r.address}</p>
                      <div className="flex self-center gap-3">
                        {r.mobile && <p className="text-xs font-semibold text-gray-400">{r.mobile}</p>}
                      {r.udharRemaining > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full font-medium flex-shrink-0">
                          udhar
                        </span>
                      )}
</div>

                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {r.totalOrders > 0 && (
                        <p className="text-xs font-semibold text-gray-500">· {r.totalOrders} Orders</p>
                      )}
                      {lastDate && (
                        <p className="text-xs text-gray-500 font-thin">· last {lastDate}</p>
                      )}
                    </div>
                  </div>

                  {/* Right */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-purple-700">₹{r.totalBilled.toFixed(0)}</p>
                    <p className={`text-xs font-medium ${r.totalProfit >= 0 ? "text-blue-500" : "text-red-400"}`}>
                      ₹{r.totalProfit.toFixed(0)} profit
                    </p>
                    {r.udharRemaining > 0 ? (
                      <p className="text-md text-orange-500 font-semibold">
                        ₹{r.udharRemaining.toFixed(0)} Due
                      </p>
                    ) : (
                      <p className="text-xs text-green-500">No Dues ✅</p>
                    )}
                  </div>

                  <span className="text-gray-300 text-sm">›</span>
                </div>
              );
            })}
          </div>
        )}
      </>

      {/* CUSTOMER ACCOUNT MODAL */}
      {selected && (
        <CustomerAccount
          isOpen={!!selected}
          customerId={selected.id}
          name={selected.name}
          address={selected.address}
          phone={selected.mobile}
          onClose={() => {
      setSelected(null);
      loadLedger();
    }}
        />
      )}
    </div>
  );
}

export default function CustomerLedgerPage() {
  return (
    <Suspense fallback={
      <div className="p-6 text-gray-400 text-sm">Loading ledger...</div>
    }>
      <CustomerLedgerContent />
    </Suspense>
  );
}
