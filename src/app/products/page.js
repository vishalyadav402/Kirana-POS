"use client";
import { useState, useEffect } from "react";
import { getProducts, saveProducts, getCategories, saveCategory } from "../utils/storage";


export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    name: "",
    barcode: "",
    purchase_price: "",
    retail_price: "",
    wholesale_price: "",
    stock: "",
    low_stock: "",
    unit: "",
    item_type: "",
    category: "",
    expiry_date: ""
  });

  useEffect(() => {
    setProducts(getProducts());
    setCategories(getCategories());   // ⭐ load categories
  }, []);

  const resetForm = () => {
    setForm({
      name: "",
      barcode: "",
      purchase_price: "",
      retail_price: "",
      wholesale_price: "",
      stock: "",
      low_stock: "",
      unit: "",
      item_type: "",
      category: "",
      expiry_date: ""
    });
  };

  const filteredProducts = products.filter((p) => {
  const matchesSearch = `${p.name} ${p.barcode}`
    .toLowerCase()
    .includes(search.toLowerCase());

  const isLowStock = Number(p.stock) <= Number(p.low_stock || 0);

  if (showLowStockOnly) {
    return matchesSearch && isLowStock;
  }

  return matchesSearch;
});


  const today = new Date();

  const lowStockItems = products.filter(
    (p) => Number(p.stock) <= Number(p.low_stock || 0)
  );

  const expiryProducts = products.filter(
    (p) => p.expiry_date && new Date(p.expiry_date) < today
  );

  const expiringSoonProducts = products.filter((p) => {
    if (!p.expiry_date) return false;
    const diff =
      (new Date(p.expiry_date) - today) / (1000 * 60 * 60 * 24);
    return diff <= 7 && diff >= 0;
  });

  const getProfit = (p) => {
    const profit = Number(p.retail_price) - Number(p.purchase_price);
    const margin = (profit / Number(p.retail_price)) * 100 || 0;
    return { profit: profit.toFixed(2), margin: margin.toFixed(1) };
  };

  const handleSave = () => {
    if (!form.name || !form.retail_price || !form.stock) return;

    let updated = [...products];

    if (editIndex !== null) {
      updated[editIndex] = form;
      setEditIndex(null);
    } else {
      updated.push(form);
    }

    saveCategory(form.category);   // ⭐ save new category automatically
    setProducts(updated);
    saveProducts(updated);
    setCategories(getCategories()); // refresh dropdown
    resetForm();
    setShowModal(false);
  };

  const handleEdit = (index) => {
    setForm(products[index]);
    setEditIndex(index);
    setShowModal(true);
  };

  const handleDelete = (index) => {
    const updated = products.filter((_, i) => i !== index);
    setProducts(updated);
    saveProducts(updated);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">📦 Product Master</h1>

        <div className="flex gap-2">
          <input
            placeholder="Search product or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border px-3 py-2 rounded"
          />

          <button
            onClick={() => {
              resetForm();
              setEditIndex(null);
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            + Add Product
          </button>
        </div>
      </div>

{showLowStockOnly && (
  <div className="mb-3 text-sm text-red-600 font-semibold">
    Showing Low Stock Products Only
  </div>
)}

      {/* ALERTS */}
      {lowStockItems.length > 0 && (
  <div className="mb-3 bg-red-100 text-red-700 p-3 rounded flex justify-between items-center">
    <span>⚠️ {lowStockItems.length} products are LOW on stock</span>

    <div className="flex gap-2">
      <button
        onClick={() => setShowLowStockOnly(true)}
        className="bg-red-600 text-white px-3 py-1 rounded"
      >
        View Report
      </button>

      {showLowStockOnly && (
        <button
          onClick={() => setShowLowStockOnly(false)}
          className="bg-gray-500 text-white px-3 py-1 rounded"
        >
          Clear
        </button>
      )}
    </div>
  </div>
)}

      {expiryProducts.length > 0 && (
        <div className="mb-3 bg-red-200 text-red-800 p-3 rounded">
          ❌ {expiryProducts.length} products EXPIRED
        </div>
      )}
      {expiringSoonProducts.length > 0 && (
        <div className="mb-4 bg-yellow-100 text-yellow-800 p-3 rounded">
          ⏳ {expiringSoonProducts.length} expiring in 7 days
        </div>
      )}

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">#</th>
              <th className="border p-2">Name</th>
              <th className="border p-2">Barcode</th>
              <th className="border p-2">Purchase</th>
              <th className="border p-2">Retail</th>
              <th className="border p-2">Wholesale</th>
              <th className="border p-2">Profit</th>
              <th className="border p-2">Margin %</th>
              <th className="border p-2">Stock</th>
              <th className="border p-2">Unit</th>
              <th className="border p-2">Type</th>
              <th className="border p-2">Category</th>
              <th className="border p-2">Expiry</th>
              <th className="border p-2">Alert</th>
              <th className="border p-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts.map((p, i) => (
              <tr
                key={i}
                className={
                  Number(p.stock) <= Number(p.low_stock || 0)
                    ? "bg-red-50"
                    : ""
                }
              >
                <td className="border p-2">{i + 1}</td>
                <td className="border p-2">{p.name}</td>
                <td className="border p-2">{p.barcode || "-"}</td>
                <td className="border p-2">₹{p.purchase_price}</td>
                <td className="border p-2">₹{p.retail_price}</td>
                <td className="border p-2">₹{p.wholesale_price}</td>
                <td className="border p-2 text-green-700">
                  ₹{getProfit(p).profit}
                </td>
                <td className="border p-2 text-blue-700">
                  {getProfit(p).margin}%
                </td>
                <td className="border p-2">{p.stock}</td>
                <td className="border p-2">{p.unit}</td>
                <td className="border p-2">{p.item_type}</td>
                <td className="border p-2">{p.category}</td>

                <td className="border p-2">
                  {!p.expiry_date && "-"}
                  {p.expiry_date &&
                    new Date(p.expiry_date) < today && (
                      <span className="text-red-600">Expired</span>
                    )}
                  {p.expiry_date &&
                    new Date(p.expiry_date) >= today &&
                    (new Date(p.expiry_date) - today) /
                      (1000 * 60 * 60 * 24) <=
                      7 && (
                      <span className="text-yellow-600">
                        Expiring Soon
                      </span>
                    )}
                  {p.expiry_date &&
                    (new Date(p.expiry_date) - today) /
                      (1000 * 60 * 60 * 24) >
                      7 && <span className="text-green-600">OK</span>}
                </td>

                <td className="border p-2">
                  {Number(p.stock) <= Number(p.low_stock || 0) ? (
                    <span className="text-red-600 font-semibold">
                      Low Stock
                    </span>
                  ) : (
                    <span className="text-green-600">OK</span>
                  )}
                </td>

                <td className="border p-2 whitespace-nowrap">
                  <button
                    onClick={() => handleEdit(i)}
                    className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(i)}
                    className="bg-red-600 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 m-2 rounded-xl w-[650px] shadow-xl">
            <h2 className="text-xl font-bold mb-4">
              {editIndex !== null ? "Edit Product" : "Add Product"}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Product Name" value={form.name}
                onChange={(e)=>setForm({...form,name:e.target.value})}
                className="border p-2 rounded col-span-2"/>

              <input placeholder="Barcode" value={form.barcode}
                onChange={(e)=>setForm({...form,barcode:e.target.value})}
                className="border p-2 rounded col-span-2"/>

              <input type="number" placeholder="Purchase Price"
                value={form.purchase_price}
                onChange={(e)=>setForm({...form,purchase_price:e.target.value})}
                className="border p-2 rounded"/>

              <input type="number" placeholder="Retail Price"
                value={form.retail_price}
                onChange={(e)=>setForm({...form,retail_price:e.target.value})}
                className="border p-2 rounded"/>

              <input type="number" placeholder="Wholesale Price"
                value={form.wholesale_price}
                onChange={(e)=>setForm({...form,wholesale_price:e.target.value})}
                className="border p-2 rounded"/>

              <input type="number" placeholder="Stock"
                value={form.stock}
                onChange={(e)=>setForm({...form,stock:e.target.value})}
                className="border p-2 rounded"/>

              <select value={form.unit}
                onChange={(e)=>setForm({...form,unit:e.target.value})}
                className="border p-2 rounded">
                <option value="Unit">Unit</option>
                <option value="pcs">Pieces</option>
                <option value="kg">Kg</option>
                <option value="gm">Gram</option>
                <option value="ltr">Litre</option>
              </select>

              <input type="number" placeholder="Low Stock Alert"
                value={form.low_stock}
                onChange={(e)=>setForm({...form,low_stock:e.target.value})}
                className="border p-2 rounded"/>

              <input type="date" value={form.expiry_date}
                onChange={(e)=>setForm({...form,expiry_date:e.target.value})}
                className="border p-2 rounded"/>

              

              <select value={form.item_type}
                onChange={(e)=>setForm({...form,item_type:e.target.value})}
                className="border p-2 rounded">
                <option value="">Item Type</option>
                <option value="Loose">Loose</option>
                <option value="Packed">Packed</option>
              </select>

             <div className="col-span-2">
  <select
    value={form.category}
    onChange={(e)=>setForm({...form,category:e.target.value})}
    className="border p-2 rounded w-full mb-2"
  >
    <option value="">Select Category</option>
    {categories.map((cat,i)=>(
      <option key={i} value={cat}>{cat}</option>
    ))}
  </select>

  <input
    placeholder="Or type new category"
    value={form.category}
    onChange={(e)=>setForm({...form,category:e.target.value})}
    className="border p-2 rounded w-full"
  />
</div>

            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={()=>setShowModal(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded">
                Cancel
              </button>
              <button onClick={handleSave}
                className={`px-4 py-2 text-white rounded ${
                  editIndex !== null ? "bg-yellow-600" : "bg-blue-600"
                }`}>
                {editIndex !== null ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
