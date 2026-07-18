"use client";
import { useState, useEffect } from "react";
import { getProducts, savePurchase, getPurchases, getActiveCashier } from "@/app/utils/storage";
import { toast } from "react-toastify";
import AppNav from "@/app/components/AppNav";

export default function PurchasesPage() {
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [fetching, setFetching] = useState(true);

  const [supplierName, setSupplierName] = useState("");
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [amountPaid, setAmountPaid] = useState("");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantLabel, setSelectedVariantLabel] = useState("");

  // ✅ mode toggle
  const [purchaseMode, setPurchaseMode] = useState("simple"); // "simple" | "bulk"

  // simple mode fields
  const [qty, setQty] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");

  // bulk mode fields
  const [purchaseUnitQty, setPurchaseUnitQty] = useState("");     // e.g. "1" (bag)
  const [unitsPerPurchase, setUnitsPerPurchase] = useState("");   // e.g. "30" (kg per bag)
  const [purchaseUnitLabel, setPurchaseUnitLabel] = useState(""); // e.g. "bag", "box", "carton"
  const [totalCostForBulk, setTotalCostForBulk] = useState("");   // e.g. "2700" for the whole bag

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setFetching(true);
    const [prod, purch] = await Promise.all([getProducts(), getPurchases()]);
    setProducts(prod || []);
    setPurchases(purch || []);
    setFetching(false);
  };

  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const resetItemFields = () => {
    setQty(""); setCostPerUnit("");
    setPurchaseUnitQty(""); setUnitsPerPurchase(""); setPurchaseUnitLabel(""); setTotalCostForBulk("");
    setSelectedProductId(""); setSelectedVariantLabel(""); setSearch("");
  };

  const addItemToPurchase = () => {
    // ✅ variant only required in simple mode — bulk purchases add to raw stock, not a specific variant
    if (!selectedProductId) {
      toast.error("Select product");
      return;
    }
    if (purchaseMode === "simple" && !selectedVariantLabel) {
      toast.error("Select variant");
      return;
    }

    const product = products.find((p) => p.id === selectedProductId);
    let finalQty, finalCostPerUnit, finalTotal, extra = {};

    if (purchaseMode === "simple") {
      if (!qty || !costPerUnit) { toast.error("Enter qty and cost per unit"); return; }
      finalQty = Number(qty);
      finalCostPerUnit = Number(costPerUnit);
      finalTotal = finalQty * finalCostPerUnit;
    } else {
      if (!purchaseUnitQty || !unitsPerPurchase || !totalCostForBulk) {
        toast.error("Fill all bulk purchase details");
        return;
      }
      const bulkUnits = Number(purchaseUnitQty);           // e.g. 2 bags
      const perBulkUnitQty = Number(unitsPerPurchase);      // e.g. 30 kg per bag
      finalQty = bulkUnits * perBulkUnitQty;                // e.g. 60 kg total raw stock added
      finalTotal = Number(totalCostForBulk);                // total ₹ paid for all bulk units
      finalCostPerUnit = finalTotal / finalQty;             // e.g. ₹90/kg
      extra = {
        purchase_unit_label: purchaseUnitLabel || "unit",
        purchase_unit_qty: bulkUnits,
        units_per_purchase: perBulkUnitQty,
      };
    }

    const newItem = {
      product_id: selectedProductId,
      product_name: product?.name,
      variant_label: purchaseMode === "simple" ? selectedVariantLabel : null, // ✅ no variant tied for bulk/raw purchases
      qty: finalQty,               // this is what updates stock (or raw stock, for bulk)
      cost_per_unit: finalCostPerUnit, // this is what updates cp
      total: finalTotal,
      ...extra,
    };

    setItems((prev) => [...prev, newItem]);
    resetItemFields();
  };

  const removeItem = (index) => setItems((prev) => prev.filter((_, i) => i !== index));

  const totalAmount = items.reduce((sum, i) => sum + i.total, 0);

  const handleSavePurchase = async () => {
    if (!supplierName.trim()) { toast.error("Enter supplier name"); return; }
    if (items.length === 0) { toast.error("Add at least one item"); return; }

    const cashier = getActiveCashier();
    const purchase = {
      supplier_name: supplierName.trim(),
      items,
      total_amount: totalAmount,
      amount_paid: paymentStatus === "paid" ? totalAmount
                 : paymentStatus === "pending" ? 0
                 : Number(amountPaid || 0),
      payment_status: paymentStatus,
      cashier_id: cashier?.id || null,
      cashier_name: cashier?.name || "Unknown",
    };

    await savePurchase(purchase);
    toast.success("Purchase recorded ✅");

    setSupplierName("");
    setItems([]);
    setPaymentStatus("paid");
    setAmountPaid("");
    loadAll();
  };

  return (
    <>
      <AppNav />
      <div className="md:p-6 mx-auto max-w-2xl p-4">
        <h1 className="text-xl font-bold mb-4">📥 Purchase Entry</h1>

        {/* SUPPLIER */}
        <input
          placeholder="Supplier Name"
          value={supplierName}
          onChange={(e) => setSupplierName(e.target.value)}
          className="border rounded-lg p-2 w-full mb-3 text-sm"
        />

        {/* ADD ITEM */}
        <div className="bg-gray-50 border rounded-lg p-3 mb-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500">Add Item</p>

          <div className="relative">
            <input
              placeholder="Search product..."
              value={selectedProduct ? selectedProduct.name : search}
              onChange={(e) => { setSearch(e.target.value); setSelectedProductId(""); }}
              className="border rounded-lg p-2 w-full text-sm"
            />
            {search && !selectedProductId && filteredProducts.length > 0 && (
              <ul className="absolute z-10 bg-white border rounded-lg w-full mt-1 max-h-48 overflow-y-auto shadow">
                {filteredProducts.slice(0, 8).map((p) => (
                  <li key={p.id}
                    onClick={() => { setSelectedProductId(p.id); setSearch(p.name); setSelectedVariantLabel(""); }}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100">
                    {p.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ✅ Mode toggle — moved above variant select so variant field can react to it */}
          <div className="flex gap-2">
            <button type="button" onClick={() => setPurchaseMode("simple")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${
                purchaseMode === "simple" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"
              }`}>
              Simple (per unit)
            </button>
            <button type="button" onClick={() => { setPurchaseMode("bulk"); setSelectedVariantLabel(""); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${
                purchaseMode === "bulk" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"
              }`}>
              Bulk (bag/box)
            </button>
          </div>

          {/* ✅ Variant select — only shown in simple mode */}
          {selectedProduct && purchaseMode === "simple" && (
            <select
              value={selectedVariantLabel}
              onChange={(e) => setSelectedVariantLabel(e.target.value)}
              className="border rounded-lg p-2 w-full text-sm"
            >
              <option value="">Select variant</option>
              {(selectedProduct.variants || []).map((v, i) => (
                <option key={i} value={v.label}>{v.label} (current stock: {v.stock ?? 0})</option>
              ))}
            </select>
          )}

          {/* ✅ Bulk mode note — no variant tied, this is raw/loose stock */}
          {selectedProduct && purchaseMode === "bulk" && (
            <p className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
              ℹ️ This adds raw stock for <strong>{selectedProduct.name}</strong> (not tied to a specific packet size). You'll divide it into variants (1kg, 500g, etc.) separately when you package it.
            </p>
          )}

          {purchaseMode === "simple" ? (
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="Qty purchased" value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="border rounded-lg p-2 text-sm" />
              <input type="number" placeholder="Cost per unit ₹" value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value)}
                className="border rounded-lg p-2 text-sm" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="How many (e.g. 2)" value={purchaseUnitQty}
                  onChange={(e) => setPurchaseUnitQty(e.target.value)}
                  className="border rounded-lg p-2 text-sm" />
                <input placeholder="Unit type (bag/box/carton)" value={purchaseUnitLabel}
                  onChange={(e) => setPurchaseUnitLabel(e.target.value)}
                  className="border rounded-lg p-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder={`Units per ${purchaseUnitLabel || "bag"}`} value={unitsPerPurchase}
                  onChange={(e) => setUnitsPerPurchase(e.target.value)}
                  className="border rounded-lg p-2 text-sm" />
                <input type="number" placeholder="Total cost paid ₹" value={totalCostForBulk}
                  onChange={(e) => setTotalCostForBulk(e.target.value)}
                  className="border rounded-lg p-2 text-sm" />
              </div>
              {purchaseUnitQty && unitsPerPurchase && totalCostForBulk && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-xs text-purple-700">
                  Adds {(Number(purchaseUnitQty) * Number(unitsPerPurchase)).toFixed(0)} units to raw stock
                  at ₹{(Number(totalCostForBulk) / (Number(purchaseUnitQty) * Number(unitsPerPurchase))).toFixed(2)}/unit
                </div>
              )}
            </>
          )}

          <button onClick={addItemToPurchase}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">
            + Add to Purchase
          </button>
        </div>

        {/* ITEMS LIST */}
        {items.length > 0 && (
          <div className="border rounded-lg p-3 mb-3 space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                <div>
                  <p className="font-medium">
                    {item.product_name}{item.variant_label ? ` (${item.variant_label})` : " (raw stock)"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {item.purchase_unit_label
                      ? `${item.purchase_unit_qty} ${item.purchase_unit_label}${item.purchase_unit_qty > 1 ? "s" : ""} × ${item.units_per_purchase} units = ${item.qty} units @ ₹${item.cost_per_unit.toFixed(2)}/unit`
                      : `${item.qty} × ₹${item.cost_per_unit.toFixed(2)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">₹{item.total.toFixed(0)}</span>
                  <button onClick={() => removeItem(i)} className="text-red-400">✕</button>
                </div>
              </div>
            ))}
            <div className="flex justify-between font-bold text-sm pt-1">
              <span>Total</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* PAYMENT STATUS */}
        <div className="flex gap-2 mb-3">
          {["paid", "pending", "partial"].map((status) => (
            <button key={status}
              onClick={() => setPaymentStatus(status)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium capitalize border ${
                paymentStatus === status ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-300"
              }`}>
              {status}
            </button>
          ))}
        </div>

        {paymentStatus === "partial" && (
          <input type="number" placeholder="Amount paid now ₹" value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            className="border rounded-lg p-2 w-full mb-3 text-sm" />
        )}

        <button onClick={handleSavePurchase}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold mb-6">
          💾 Save Purchase
        </button>

        {/* PURCHASE HISTORY */}
        <h2 className="text-sm font-semibold text-gray-500 mb-2">Recent Purchases</h2>
        {fetching ? (
          <p className="text-center text-gray-400 py-6 text-sm">Loading...</p>
        ) : purchases.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">No purchases recorded yet</p>
        ) : (
          <div className="space-y-2">
            {purchases.map((p) => (
              <div key={p.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <p className="font-medium text-sm">{p.supplier_name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(p.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-purple-700">₹{Number(p.total_amount).toFixed(0)}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      p.payment_status === "paid" ? "bg-green-100 text-green-700"
                      : p.payment_status === "pending" ? "bg-red-100 text-red-600"
                      : "bg-orange-100 text-orange-600"
                    }`}>
                      {p.payment_status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  {p.items.map((i) => `${i.product_name}${i.variant_label ? ` (${i.variant_label})` : ""} x${i.qty}`).join(", ")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}