function showToast(message) {
  let toast = document.getElementById("easybuy-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "easybuy-toast";
    toast.className =
      "fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-xl shadow-lg font-body-sm text-body-sm opacity-0 pointer-events-none transition-opacity duration-300";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove("opacity-0", "pointer-events-none");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.classList.add("opacity-0", "pointer-events-none");
  }, 2800);
}

function escapeHtml(str) {
  if (str == null) return "";
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

function initOrdersPage() {
  document.addEventListener("click", (e) => {
    const invoiceBtn = e.target.closest("[data-action='invoice']");
    if (invoiceBtn) {
      const card = invoiceBtn.closest("[data-order-card]");
      const orderId = invoiceBtn.dataset.orderId;
      const dateEl = card?.querySelector(".text-on-surface-variant");
      const items = card?.querySelectorAll("[data-order-item]");
      const totalEl = card?.querySelector(".text-primary.font-bold");
      const dateText = dateEl?.textContent || "N/A";
      const orderItems = items
        ? Array.from(items).map((el) => {
            const nameEl = el.querySelector(".truncate");
            const qtyEl = el.querySelector(".text-on-surface-variant");
            const priceEl = el.querySelector(".text-primary");
            const name = nameEl?.textContent || "Item";
            const qtyText = qtyEl?.textContent || "";
            const qty = parseInt(qtyText.match(/Qty:\s*(\d+)/)?.[1] || "1", 10);
            const priceText = priceEl?.textContent || "Le 0";
            return { name, qty, priceText };
          })
        : [];
      generateInvoice(orderId, dateText, orderItems, totalEl?.textContent || "Le 0");
      return;
    }
    const helpBtn = e.target.closest("[data-action='help']");
    if (helpBtn) {
      showToast("Support team will contact you shortly");
      return;
    }
  });
}

function generateInvoice(orderId, dateText, items, totalText) {
  const invoiceId = "EB-" + orderId.slice(0, 8).toUpperCase();
  const subtotal = items.reduce((sum, item) => {
    const num = parseFloat((item.priceText || "0").replace(/[^0-9.]/g, "").replace(/,/g, "")) || 0;
    return sum + num * (item.qty || 1);
  }, 0);
  const deliveryFee = subtotal > 0 ? 45000 : 0;
  const serviceFee = Math.round(subtotal * 0.01);
  const tax = Math.round(subtotal * 0.15);
  const grandTotal = subtotal + deliveryFee + serviceFee + tax;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Invoice ${invoiceId}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Hanken Grotesk', sans-serif; background: #fafaf9; color: #1c1917; padding: 40px; }
  .invoice-box { max-width: 800px; margin: auto; background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .brand { }
  .brand-name { font-size: 28px; font-weight: 700; color: #1e40af; }
  .brand-sub { font-size: 13px; color: #57534e; margin-top: 4px; }
  .invoice-meta { text-align: right; }
  .invoice-meta h2 { font-size: 20px; font-weight: 700; color: #1c1917; }
  .invoice-meta p { font-size: 13px; color: #57534e; margin-top: 4px; }
  .status-badge { display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: #d1fae5; color: #064e3b; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .info-block h4 { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #a8a29e; margin-bottom: 8px; }
  .info-block p { font-size: 14px; color: #1c1917; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #f5f5f4; padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #57534e; border-bottom: 2px solid #e7e5e4; }
  td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #f5f5f4; }
  td.price, th.price { text-align: right; }
  td.total-cell, th.total-cell { text-align: right; font-weight: 600; }
  .totals { display: flex; justify-content: flex-end; }
  .totals-table { width: 320px; }
  .totals-table td { padding: 8px 0; border: none; }
  .totals-table .grand-total td { font-size: 18px; font-weight: 700; color: #1e40af; border-top: 2px solid #1e40af; padding-top: 12px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e7e5e4; text-align: center; font-size: 12px; color: #a8a29e; }
  .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #1e40af; color: #fff; border: none; border-radius: 8px; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  .print-btn:hover { background: #1d4ed8; }
  @media print { .print-btn { display: none; } body { padding: 0; } .invoice-box { box-shadow: none; } }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">Print / Save PDF</button>
<div class="invoice-box">
  <div class="header">
    <div class="brand">
      <div class="brand-name">Easy Buy</div>
      <div class="brand-sub">Sierra Leone's Trusted Marketplace</div>
      <div class="brand-sub">support@easybuy.sl | +232 76 123 456</div>
    </div>
    <div class="invoice-meta">
      <h2>INVOICE</h2>
      <p>${invoiceId}</p>
      <p>${dateText}</p>
      <span class="status-badge">Paid</span>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-block">
      <h4>Bill To</h4>
      <p>Samuel Bangura<br/>42 Siaka Stevens Street<br/>Freetown, Western Area<br/>Sierra Leone<br/>+232 76 555 123</p>
    </div>
    <div class="info-block">
      <h4>Payment Method</h4>
      <p>Orange Money<br/>Mobile: +232 76 *** ***<br/>Transaction: ${invoiceId}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="price">Price</th>
        <th class="price">Qty</th>
        <th class="total-cell">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td class="price">${item.priceText}</td>
          <td class="price">${item.qty}</td>
          <td class="total-cell">${item.priceText}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="totals">
    <table class="totals-table">
      <tr><td>Subtotal</td><td style="text-align:right">Le ${subtotal.toLocaleString()}</td></tr>
      <tr><td>Delivery Fee</td><td style="text-align:right">Le ${deliveryFee.toLocaleString()}</td></tr>
      <tr><td>Service Fee</td><td style="text-align:right">Le ${serviceFee.toLocaleString()}</td></tr>
      <tr><td>Tax (15%)</td><td style="text-align:right">Le ${tax.toLocaleString()}</td></tr>
      <tr class="grand-total"><td>Total</td><td style="text-align:right">${totalText}</td></tr>
    </table>
  </div>

  <div class="footer">
    <p>Thank you for shopping with Easy Buy! | Managed Marketplace | Sierra Leone</p>
    <p style="margin-top:4px">For support, contact support@easybuy.sl or call +232 76 123 456</p>
  </div>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.focus();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } else {
    showToast("Please allow popups to download invoices");
  }
}
