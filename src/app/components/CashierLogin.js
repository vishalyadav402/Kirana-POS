"use client";
import { useState, useEffect, useRef } from "react";
import { verifyCashierPin, setActiveCashier } from "../utils/storage";
import { toast } from "react-toastify";

export default function CashierLogin({ onLogin }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleDigit = (d) => {
    if (pin.length >= 4 || loading) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) submitPin(next);
  };

  const handleBackspace = () => setPin((p) => p.slice(0, -1));

  const submitPin = async (fullPin) => {
    setLoading(true);
    const cashier = await verifyCashierPin(fullPin);
    if (cashier) {
      setActiveCashier(cashier);
      toast.success(`Welcome, ${cashier.name} ✅`);
      onLogin(cashier);
    } else {
      toast.error("Incorrect PIN");
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setPin("");
    }
    setLoading(false);
  };

  // allow physical keyboard number entry too
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key >= "0" && e.key <= "9") handleDigit(e.key);
      if (e.key === "Backspace") handleBackspace();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [pin, loading]);

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-[100]">
      <h1 className="text-white text-2xl font-bold mb-2">🔒 POS Login</h1>
      <p className="text-gray-400 text-sm mb-6">Enter your 4-digit PIN</p>

      {/* PIN dots */}
      <div className={`flex gap-3 mb-8 ${shake ? "animate-pulse" : ""}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 ${
              i < pin.length ? "bg-cyan-400 border-cyan-400" : "border-gray-600"
            } ${shake ? "border-red-500" : ""}`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {["1","2","3","4","5","6","7","8","9"].map((n) => (
          <button
            key={n}
            onClick={() => handleDigit(n)}
            disabled={loading}
            className="h-16 rounded-xl bg-gray-800 text-white text-xl font-semibold hover:bg-gray-700 active:bg-gray-600"
          >
            {n}
          </button>
        ))}
        <div />
        <button
          onClick={() => handleDigit("0")}
          disabled={loading}
          className="h-16 rounded-xl bg-gray-800 text-white text-xl font-semibold hover:bg-gray-700 active:bg-gray-600"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          disabled={loading}
          className="h-16 rounded-xl bg-gray-800 text-gray-400 text-xl font-semibold hover:bg-gray-700 active:bg-gray-600"
        >
          ⌫
        </button>
      </div>

      {loading && <p className="text-gray-400 text-xs mt-4">Checking...</p>}
    </div>
  );
}