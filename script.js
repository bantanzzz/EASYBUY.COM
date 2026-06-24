import {
  getCart,
  addToCart,
  removeFromCart,
  updateCartQty,
  getCartCount,
  getCartTotals,
  formatPrice,
  parseProductFromCard,
  startCartSync,
} from "./cart.js";
import { saveOrder } from "./orders.js";

const PAGES = {
  home: "index.html",
  browse: "Browse.html",
  product: "productlisting.html",
  cart: "cart.html",
  payment: "payment.html",
  orders: "orderTracking.html",
  vendor: "vendor.html",
};

document.addEventListener("DOMContentLoaded", () => {
  initMicroInteractions();
  initSearchFocus();
  initActionButtons();
  initProductCards();
  initGlobalButtons();
  updateCartBadges();
  startCartSync();

  const page = document.body.dataset.page;
  if (page === "browse") initBrowsePage();
  if (page === "cart") initCartPage();
  if (page === "payment") initPaymentPage();
  if (page === "orders") initOrdersPage();
  if (page === "product") initProductTabs();
});

window.addEventListener("cart-updated", updateCartBadges);

function go(href) {
  window.location.href = href;
}

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

function updateCartBadges() {
  const count = getCartCount();
  document.querySelectorAll("[data-cart-badge]").forEach((badge) => {
    badge.textContent = String(count);
    badge.classList.toggle("hidden", count === 0);
  });
}

function initMicroInteractions() {
  document.querySelectorAll("button, .group").forEach((el) => {
    el.addEventListener("mousedown", () => {
      el.style.transform = "scale(0.98)";
    });
    el.addEventListener("mouseup", () => {
      el.style.transform = "scale(1)";
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "scale(1)";
    });
  });
}

function initSearchFocus() {
  const searchInput = document.querySelector('input[type="text"]');
  if (!searchInput) return;
  searchInput.addEventListener("focus", () => {
    const wrapper = searchInput.closest(".search-wrapper") || searchInput.parentElement;
    wrapper.classList.add("ring-2", "ring-primary/20");
  });
  searchInput.addEventListener("blur", () => {
    const wrapper = searchInput.closest(".search-wrapper") || searchInput.parentElement;
    wrapper.classList.remove("ring-2", "ring-primary/20");
  });
}

function initActionButtons() {
  document.querySelectorAll("[data-action='back']").forEach((btn) => {
    btn.addEventListener("click", () => window.history.back());
  });

  document.querySelectorAll(".btn-shop-now, .btn-view-all").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (el.tagName === "A") return;
      e.preventDefault();
      go(PAGES.browse);
    });
  });

  document.querySelectorAll(".btn-continue-shopping").forEach((el) => {
    el.addEventListener("click", () => go(PAGES.browse));
  });

  document.querySelectorAll(".btn-add-cart").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const product = getActiveProductFromPage();
      if (product) {
        addToCart(product);
        showToast(`${product.name} added to cart`);
        updateCartBadges();
      }
    });
  });

  document.addEventListener("click", (e) => {
    const cartBtn = e.target.closest(".btn-cart-icon");
    if (!cartBtn) return;
    e.preventDefault();
    e.stopPropagation();
    const card = cartBtn.closest(".product-card");
    const product = parseProductFromCard(card);
    if (product && product.price > 0) {
      addToCart(product);
      showToast(`${product.name} added to cart`);
      updateCartBadges();
    }
    go(PAGES.cart);
  });

  document.querySelectorAll(".btn-buy-now").forEach((el) => {
    el.addEventListener("click", () => {
      const product = getActiveProductFromPage();
      if (product) {
        addToCart({ ...product, qty: 1 });
        updateCartBadges();
      }
      go(PAGES.payment);
    });
  });

  document.querySelectorAll(".btn-checkout").forEach((el) => {
    el.addEventListener("click", () => go(PAGES.payment));
  });

  document.querySelectorAll(".btn-pay-now").forEach((el) => {
    el.addEventListener("click", async () => {
      const methodRadio = document.querySelector("input[name='payment']:checked");
      const mobileInput = document.getElementById("mobile-money-number");
      const paymentInfo = {
        method: methodRadio ? methodRadio.id : "cash",
        mobileNumber: mobileInput ? mobileInput.value.trim() : "",
      };
      await saveOrder(paymentInfo);
      go(PAGES.orders);
    });
  });

  document.querySelectorAll("[data-nav='cart']").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (el.tagName === "A") return;
      e.preventDefault();
      go(PAGES.cart);
    });
  });
}

function getActiveProductFromPage() {
  const { currentProductId, currentProductName, currentProductPrice, currentProductImage, currentProductCategory } =
    document.body.dataset;
  if (!currentProductId) return null;
  return {
    id: currentProductId,
    name: currentProductName || "Product",
    price: Number(currentProductPrice || 0),
    imageUrl: currentProductImage || "",
    category: currentProductCategory || "",
    qty: 1,
  };
}

function initProductCards() {
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".product-card");
    if (!card) return;
    if (e.target.closest("button, .btn-add-cart, .btn-cart-icon, .btn-favorite")) return;
    const productId = card.dataset.productId;
    go(productId ? `${PAGES.product}?id=${productId}` : PAGES.product);
  });
}

function initGlobalButtons() {
  document.addEventListener("click", (e) => {
    const favoriteBtn = e.target.closest(".btn-favorite");
    if (favoriteBtn) {
      e.preventDefault();
      e.stopPropagation();
      favoriteBtn.classList.toggle("text-error");
      const icon = favoriteBtn.querySelector(".material-symbols-outlined");
      if (icon) icon.classList.toggle("icon-filled");
      showToast(favoriteBtn.classList.contains("text-error") ? "Added to wishlist" : "Removed from wishlist");
      return;
    }

    const notifyBtn = e.target.closest('[data-icon="notifications"]');
    if (notifyBtn && notifyBtn.tagName === "BUTTON") {
      showToast("No new notifications");
      return;
    }

    const newsletterBtn = e.target.closest(".btn-newsletter");
    if (newsletterBtn) {
      e.preventDefault();
      const input = newsletterBtn.closest(".flex")?.querySelector('input[type="email"]');
      const email = input?.value.trim();
      if (!email || !email.includes("@")) {
        showToast("Please enter a valid email address");
        return;
      }
      showToast("Thanks for subscribing!");
      if (input) input.value = "";
      return;
    }

    const clearBtn = e.target.closest(".btn-clear-filters");
    if (clearBtn) {
      document.querySelectorAll("[data-category-filter]").forEach((cb) => {
        cb.checked = false;
      });
      document.querySelectorAll("[data-category-filter]").forEach((cb) => cb.dispatchEvent(new Event("change")));
      showToast("Filters cleared");
      return;
    }

    const chatBtn = e.target.closest(".btn-support-chat");
    if (chatBtn) {
      showToast("Support chat is available Mon–Sat, 8am–6pm");
      return;
    }

    const changeBtn = e.target.closest(".btn-change-address");
    if (changeBtn) {
      showToast("Delivery address updated");
      return;
    }

    const reviewsBtn = e.target.closest(".btn-view-reviews");
    if (reviewsBtn) {
      showToast("Loading all reviews...");
      return;
    }

    const addAddressBtn = e.target.closest(".btn-add-address");
    if (addAddressBtn) {
      showToast("Address book coming soon");
    }
  });

  document.querySelectorAll('[data-icon="send"]').forEach((btn) => {
    if (btn.closest("footer")) {
      btn.classList.add("btn-newsletter");
      btn.type = "button";
    }
  });

  document.querySelectorAll("footer .flex.gap-2 button, footer .flex button.bg-primary").forEach((btn) => {
    if (!btn.textContent.includes("Join") && btn.dataset.icon !== "send") return;
    btn.classList.add("btn-newsletter");
    btn.type = "button";
  });
}

function initBrowsePage() {
  document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      /* handled by products.js */
    });
  });

  const searchInput = document.querySelector('input[type="text"]');
  if (searchInput && searchInput.parentElement) {
    searchInput.parentElement.classList.add("search-focus-scale");
  }
}

function initCartPage() {
  renderCartPage();

  const list = document.getElementById("cart-items-list");
  if (!list) return;

  list.addEventListener("click", (e) => {
    const removeBtn = e.target.closest("[data-action='remove']");
    if (removeBtn) {
      removeFromCart(removeBtn.dataset.itemId);
      renderCartPage();
      showToast("Item removed from cart");
      return;
    }

    const qtyBtn = e.target.closest("[data-qty]");
    if (!qtyBtn) return;
    const itemId = qtyBtn.closest("[data-cart-item]")?.dataset.cartItem;
    if (!itemId) return;
    const item = getCart().find((entry) => entry.id === itemId);
    if (!item) return;

    if (qtyBtn.dataset.qty === "increment") {
      updateCartQty(itemId, item.qty + 1);
    } else {
      updateCartQty(itemId, item.qty - 1);
    }
    renderCartPage();
  });
}

function renderCartPage() {
  const list = document.getElementById("cart-items-list");
  const title = document.getElementById("cart-title");
  const empty = document.getElementById("cart-empty");
  const summary = document.getElementById("cart-summary");
  if (!list) return;

  const cart = getCart();
  const itemCount = getCartCount();

  if (title) {
    title.textContent = itemCount
      ? `Your Cart (${itemCount} Item${itemCount === 1 ? "" : "s"})`
      : "Your Cart";
  }

  if (cart.length === 0) {
    list.innerHTML = "";
    empty?.classList.remove("hidden");
    summary?.classList.add("hidden");
    return;
  }

  empty?.classList.add("hidden");
  summary?.classList.remove("hidden");

  list.innerHTML = cart.map(renderCartItem).join("");
  updateCartSummary();
}

function renderCartItem(item) {
  return `
    <div class="cart-card-hover bg-surface-container-lowest custom-shadow rounded-xl p-4 flex flex-col md:flex-row gap-4 border border-outline-variant/30" data-cart-item="${escapeHtml(item.id)}">
      <div class="w-full md:w-32 h-32 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container">
        <img alt="${escapeHtml(item.name)}" class="w-full h-full object-cover" src="${escapeHtml(item.imageUrl)}"/>
      </div>
      <div class="flex flex-col justify-between flex-grow">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-headline-md text-body-lg font-bold text-on-surface">${escapeHtml(item.name)}</h3>
            ${item.variant ? `<p class="text-on-surface-variant font-body-sm text-body-sm mt-1">${escapeHtml(item.variant)}</p>` : ""}
          </div>
          <p class="font-headline-md text-primary text-body-lg font-bold">${formatPrice(item.price * item.qty)}</p>
        </div>
        <div class="flex items-center justify-between mt-4">
          <div class="flex items-center border border-outline-variant rounded-lg overflow-hidden bg-surface-container-low">
            <button type="button" class="px-3 py-2 hover:bg-surface-variant transition-colors text-on-surface" data-qty="decrement">
              <span class="material-symbols-outlined text-[18px]" data-icon="remove">remove</span>
            </button>
            <span class="px-4 py-2 font-label-md text-label-md border-x border-outline-variant bg-white">${item.qty}</span>
            <button type="button" class="px-3 py-2 hover:bg-surface-variant transition-colors text-on-surface" data-qty="increment">
              <span class="material-symbols-outlined text-[18px]" data-icon="add">add</span>
            </button>
          </div>
          <button type="button" class="text-error font-label-md text-label-md flex items-center gap-1 hover:bg-error-container/20 px-3 py-2 rounded-lg transition-colors" data-action="remove" data-item-id="${escapeHtml(item.id)}">
            <span class="material-symbols-outlined text-[18px]" data-icon="delete">delete</span>
            Remove
          </button>
        </div>
      </div>
    </div>`;
}

function updateCartSummary() {
  const { subtotal, delivery, tax, total } = getCartTotals();
  setText("cart-subtotal", formatPrice(subtotal));
  setText("cart-delivery", formatPrice(delivery));
  setText("cart-tax", formatPrice(tax));
  setText("cart-total", formatPrice(total));
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function escapeHtml(str) {
  if (str == null) return "";
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

function initPaymentPage() {
  document.querySelectorAll('input[name="payment"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const inputSection = document.getElementById("mobile-money-input");
      if (!inputSection) return;
      const label = inputSection.querySelector("label");

      if (e.target.id === "bank") {
        inputSection.classList.add("opacity-50", "pointer-events-none");
      } else {
        inputSection.classList.remove("opacity-50", "pointer-events-none");
        if (label) {
          label.textContent =
            e.target.id === "orange"
              ? "Enter Orange Money Number"
              : "Enter Africell Money Number";
        }
      }
    });
  });
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

function initProductTabs() {
  const tabs = document.querySelectorAll("[data-product-tab]");
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => {
        t.classList.remove("border-primary", "text-primary");
        t.classList.add("border-transparent", "text-on-surface-variant");
      });
      tab.classList.add("border-primary", "text-primary");
      tab.classList.remove("border-transparent", "text-on-surface-variant");
      showToast(`Showing ${tab.textContent.trim()}`);
    });
  });
}
