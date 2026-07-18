"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "🧾 POS" },
  { href: "/billing-history", label: "📜 Bill History" },
  { href: "/customer-ledger", label: "👤 Ledger" },
  { href: "/shift", label: "🏦 Shift" },
  { href: "/admin/cashiers", label: "🔑 Cashiers" },
];

export default function AppNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-gray-950 border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-3 py-2 flex items-center justify-between">
        <Link href="/pos" className="font-bold text-white text-sm flex items-center gap-1">
          🛒 KiranaNeeds
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                  active
                    ? "bg-cyan-600 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-white text-lg px-2"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-800 px-3 py-2 flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`text-sm px-3 py-2 rounded-lg font-medium ${
                  active ? "bg-cyan-600 text-white" : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}