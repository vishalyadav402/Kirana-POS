"use client";
import { useState, useEffect } from "react";
import {
  getActiveCashier,
  getOpenShift,
  openShift,
  closeShift,
  getCashReceivedSince,
} from "@/app/utils/storage";
import { supabase } from "@/app/utils/supabase";
import { toast } from "react-toastify";
import AppNav from "../components/AppNav";

export default function ShiftPage() {
  const [cashier, setCashier] = useState(null);
  const [openShiftData, setOpenShiftData] = useState(null);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openingBalanceInput, setOpeningBalanceInput] = useState("");
  const [closingBalanceInput, setClosingBalanceInput] = useState("");
  const [expectedClosing, setExpectedClosing] = useState(0);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [cashReceived, setCashReceived] = useState(0);

  useEffect(() => {
    const c = getActiveCashier();
    setCashier(c);
    loadShiftData();
  }, []);

  const loadShiftData = async () => {
    setLoading(true);
    const shift = await getOpenShift();
    setOpenShiftData(shift);

    const { data } = await supabase
      .from("shift_sessions")
      .select("*")
      .eq("status", "closed")
      .order("closed_at", { ascending: false })
      .limit(20);
    setShiftHistory(data || []);
    setLoading(false);
  };

  const handleOpenShift = async () => {
    if (!cashier) { toast.error("No cashier logged in — please log in via POS first"); return; }
    if (openingBalanceInput === "") { toast.error("Enter opening cash amount"); return; }

    const shift = await openShift(cashier, openingBalanceInput);
    if (shift) {
      setOpenShiftData(shift);
      setOpeningBalanceInput("");
      toast.success("Shift started ✅");
    } else {
      toast.error("Failed to start shift");
    }
  };

  const handlePrepareClose = async () => {
    const cash = await getCashReceivedSince(openShiftData.opened_at);
    setCashReceived(cash);
    const expected = Number(openShiftData.opening_balance) + cash;
    setExpectedClosing(expected);
    setShowCloseConfirm(true);
  };

  const handleConfirmClose = async () => {
    if (closingBalanceInput === "") { toast.error("Enter counted cash amount"); return; }
    const closed = await closeShift(openShiftData.id, closingBalanceInput, expectedClosing);
    if (closed) {
      const v = closed.variance;
      toast.success(
        v === 0 ? "Shift closed — cash matches ✅"
          : v > 0 ? `Shift closed — ₹${v.toFixed(2)} extra in drawer`
          : `Shift closed — ₹${Math.abs(v).toFixed(2)} short`
      );
      setOpenShiftData(null);
      setShowCloseConfirm(false);
      setClosingBalanceInput("");
      loadShiftData();
    } else {
      toast.error("Failed to close shift");
    }
  };

  const shiftDuration = (opened, closed) => {
    const ms = new Date(closed) - new Date(opened);
    const hrs = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hrs}h ${mins}m`;
  };

  return (
    <>
    <AppNav/>
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold">🏦 Shift Management</h1>
            {cashier && (
              <p className="text-xs text-gray-400 mt-0.5">Logged in as {cashier.name}</p>
            )}
          </div>
          <button onClick={loadShiftData}
            className="text-xs bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-lg text-gray-300 hover:bg-gray-700">
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-10">Loading...</div>
        ) : (
          <>
            {/* CURRENT SHIFT STATUS */}
            {openShiftData ? (
              <div className="bg-gray-800 border border-cyan-700 rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-cyan-400">🟢 Shift Open</span>
                  <span className="text-xs text-gray-400">
                    Started {new Date(openShiftData.opened_at).toLocaleString("en-IN", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-900 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-400">Opened By</p>
                    <p className="font-semibold">{openShiftData.cashier_name}</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-400">Opening Cash</p>
                    <p className="font-semibold text-cyan-400">₹{Number(openShiftData.opening_balance).toFixed(2)}</p>
                  </div>
                </div>
                <button onClick={handlePrepareClose}
                  className="w-full bg-orange-600 hover:bg-orange-700 py-2.5 rounded-lg text-sm font-semibold">
                  Close Shift
                </button>
              </div>
            ) : (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-5">
                <p className="text-sm font-semibold text-gray-300 mb-3">No shift currently open</p>
                <input type="number" value={openingBalanceInput}
                  onChange={(e) => setOpeningBalanceInput(e.target.value)}
                  placeholder="Opening cash (₹)"
                  className="bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 w-full text-sm mb-3" />
                <button onClick={handleOpenShift}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 py-2.5 rounded-lg text-sm font-semibold">
                  Start Shift
                </button>
              </div>
            )}

            {/* CLOSE CONFIRM PANEL */}
            {showCloseConfirm && (
              <div className="bg-gray-800 border border-orange-700 rounded-xl p-4 mb-5">
                <h3 className="text-sm font-semibold text-orange-400 mb-3">Confirm Shift Close</h3>
                <div className="bg-gray-900 rounded-lg p-3 mb-3 text-sm space-y-1.5">
                  <div className="flex justify-between"><span className="text-gray-400">Opening Cash</span><span>₹{Number(openShiftData.opening_balance).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Cash Sales</span><span>₹{cashReceived.toFixed(2)}</span></div>
                  <div className="flex justify-between font-semibold border-t border-gray-700 pt-1.5"><span className="text-gray-300">Expected in Drawer</span><span className="text-cyan-400">₹{expectedClosing.toFixed(2)}</span></div>
                </div>
                <input type="number" value={closingBalanceInput}
                  onChange={(e) => setClosingBalanceInput(e.target.value)}
                  placeholder="Actual cash counted (₹)"
                  className="bg-gray-900 border border-gray-600 text-white rounded-lg px-3 py-2 w-full text-sm mb-3" />
                {closingBalanceInput !== "" && (
                  <p className={`text-xs mb-3 font-medium ${
                    Number(closingBalanceInput) - expectedClosing === 0 ? "text-green-400"
                    : Number(closingBalanceInput) - expectedClosing > 0 ? "text-blue-400" : "text-red-400"
                  }`}>
                    {Number(closingBalanceInput) - expectedClosing === 0
                      ? "✅ Matches exactly"
                      : Number(closingBalanceInput) - expectedClosing > 0
                        ? `+₹${(Number(closingBalanceInput) - expectedClosing).toFixed(2)} extra in drawer`
                        : `⚠️ ₹${Math.abs(Number(closingBalanceInput) - expectedClosing).toFixed(2)} short`}
                  </p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setShowCloseConfirm(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm">Cancel</button>
                  <button onClick={handleConfirmClose}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 py-2 rounded-lg text-sm font-semibold">Confirm & Close</button>
                </div>
              </div>
            )}

            {/* SHIFT HISTORY */}
            <h2 className="text-sm font-semibold text-gray-300 mb-2">Past Shifts</h2>
            {shiftHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-8 text-sm">No closed shifts yet</div>
            ) : (
              <div className="space-y-2">
                {shiftHistory.map((s) => (
                  <div key={s.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{s.cashier_name}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(s.opened_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        {" · "}{shiftDuration(s.opened_at, s.closed_at)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Opening</p>
                        <p className="font-medium">₹{Number(s.opening_balance).toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Expected</p>
                        <p className="font-medium">₹{Number(s.expected_closing).toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Counted</p>
                        <p className="font-medium">₹{Number(s.closing_balance).toFixed(0)}</p>
                      </div>
                    </div>
                    <div className={`mt-2 text-xs font-semibold ${
                      s.variance === 0 ? "text-green-400" : s.variance > 0 ? "text-blue-400" : "text-red-400"
                    }`}>
                      {s.variance === 0 ? "✅ Matched exactly"
                        : s.variance > 0 ? `+₹${Number(s.variance).toFixed(2)} extra`
                        : `⚠️ ₹${Math.abs(Number(s.variance)).toFixed(2)} short`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
}