export const printInvoiceFromBill = async (bill) => {
  const { default: jsPDF } = await import("jspdf");

  const formatDate = (date) => {
    const d = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" }).toLowerCase();
    const y = String(date.getFullYear()).slice(-2);
    const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${d}-${month}-${y}, ${time}`;
  };

  const items = bill.items || [];
  const finalDiscount = Number(bill.discount || 0);
  const paymentMode = bill.status === "udhar" ? "udhar" : bill.status === "split" ? "split" : "cash";
  const customerName = bill.name || "";
  const customerMobile = bill.phone || "";

  const TOP_MARGIN = 8;
  const BOTTOM_MARGIN = 2;

  // ─── PASS 1: CALCULATE REQUIRED HEIGHT ─────────────────────
  let estimatedY = TOP_MARGIN;
  estimatedY += 5;
  estimatedY += 4.5 * 3;
  estimatedY += 2;
  estimatedY += 5;
  estimatedY += 5;
  if (customerName) estimatedY += 5;
  if (customerMobile) estimatedY += 5;
  estimatedY += 3 + 6;
  estimatedY += 4;
  estimatedY += 3 + 5;

  items.forEach((item) => {
    estimatedY += 6;
    const mrp = Number(item.mrp || item.price || 0);
    const price = Number(item.price || 0);
    if (mrp > price) estimatedY += 5.5;
    if (item.selectedVariant && item.selectedVariant !== "Custom") estimatedY += 3.5;
  });

  estimatedY += 3 + 6;
  estimatedY += 5.5;
  if (finalDiscount > 0) estimatedY += 5.5 * 2;
  estimatedY += 5.5;
  if (paymentMode !== "udhar") estimatedY += 5.5;
  estimatedY += 3 + 6;
  estimatedY += 5.5 * 2;
  estimatedY += BOTTOM_MARGIN;

  const pageHeight = Math.max(estimatedY, 60);

  // ─── CREATE DOC ──────────────────────────────────────────
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, pageHeight] });
  let y = TOP_MARGIN;

  doc.setFont("courier", "bold"); doc.setFontSize(15);
  doc.text("KiranaNeeds Store", 40, y, { align: "center" }); y += 5;

  doc.setFont("courier", "normal"); doc.setFontSize(9);
  doc.text("Har Ghar Ka Bharosa", 40, y, { align: "center" }); y += 4.5;
  doc.text("Prithviganj Bazaar, Patti Pratapgarh", 40, y, { align: "center" }); y += 4.5;
  doc.text("Call/WhatsApp: 9670495191", 40, y, { align: "center" }); y += 6.5;

  doc.setFontSize(10);
  doc.text(`Bill No : ${bill.order_id}`, 2, y); y += 5;
  doc.text(`Date    : ${formatDate(new Date(bill.created_at))}`, 2, y); y += 5;
  if (customerName) { doc.text(`Customer: ${customerName}`, 2, y); y += 5; }
  if (customerMobile) { doc.text(`Mobile  : ${customerMobile}`, 2, y); y += 5; }

  doc.setFontSize(9);
  doc.text("----------------------------------------", 0, y); y += 6;
  doc.setFont("courier", "bold");
  doc.text(
    `${"Item".padEnd(16)}${"Qty".padStart(3)}${"Rate".padStart(6)}${"Disc".padStart(5)}${"Total".padStart(7)}`,
    2, y
  );
  y += 4;
  doc.setFont("courier", "normal");
  doc.text("----------------------------------------", 0, y); y += 5;

  items.forEach((item) => {
    const itemDiscount = Number(item.itemDiscount || 0);
    const netItemTotal = item.total - itemDiscount;
    const name = item.name.length > 14 ? item.name.slice(0, 14) : item.name;
    const mrp = Number(item.mrp || item.price || 0);
    const price = Number(item.price || 0);

    doc.setFontSize(9);
    doc.setLineHeightFactor(0.9);
    doc.text(
      `${name.padEnd(14)}${String(item.qty).padStart(4)}${price.toFixed(0).padStart(6)}${itemDiscount.toFixed(0).padStart(4)}${netItemTotal.toFixed(0).padStart(7)}`,
      2, y
    );
    y += 6;

    if (mrp > price) {
      doc.setFontSize(7.5);
      doc.text(`  MRP: Rs.${mrp.toFixed(2)}  (Save Rs.${(mrp - price).toFixed(2)})`, 2, y);
      y += 5.5;
    }

    if (item.selectedVariant && item.selectedVariant !== "Custom") {
      doc.setFontSize(7.5);
      doc.text(`  (${item.selectedVariant})`, 0, y);
      y += 3.5;
    }
  });

  doc.setFontSize(9);
  doc.text("----------------------------------------", 0, y); y += 6;

  doc.setFont("courier", "bold"); doc.setFontSize(10);

  const subtotal = Number(bill.total || 0);
  const netTotal = subtotal - finalDiscount;

  doc.setFont("courier", "normal");
  doc.text(`Subtotal     :`, 2, y);
  doc.text(`Rs.${subtotal.toFixed(2)}`, 76, y, { align: "right" }); y += 5.5;

  if (finalDiscount > 0) {
    doc.text(`Discount     :`, 2, y);
    doc.text(`-Rs.${finalDiscount.toFixed(2)}`, 76, y, { align: "right" }); y += 5.5;
    doc.setFont("courier", "bold");
    doc.text(`Net Total    :`, 2, y);
    doc.text(`Rs.${netTotal.toFixed(2)}`, 76, y, { align: "right" }); y += 5.5;
    doc.setFont("courier", "normal");
  }

  doc.text(`Payment Mode :`, 2, y);
  doc.text(paymentMode.toUpperCase(), 76, y, { align: "right" }); y += 5.5;

  if (paymentMode !== "udhar") {
    doc.text(`Paid Amount  :`, 2, y);
    doc.text(`Rs.${netTotal.toFixed(2)}`, 76, y, { align: "right" }); y += 5.5;
  }

  doc.setFontSize(9);
  doc.text("----------------------------------------", 0, y); y += 6;

  doc.setFont("courier", "bold"); doc.setFontSize(10);
  doc.text("Thank you for shopping!", 40, y, { align: "center" }); y += 5.5;
  doc.setFont("courier", "normal"); doc.setFontSize(9);
  doc.text("Visit Again !", 40, y, { align: "center" });

  doc.save(`${customerName || "Guest"}_${bill.order_id}.pdf`);
};