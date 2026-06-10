import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const CATEGORIES = ["Electronics", "Fashion", "Home", "Groceries"];

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "home") initHomeProducts();
  if (page === "browse") initBrowseProducts();
  if (page === "product") initProductDetail();
});

function initHomeProducts() {
  const container = document.getElementById("featured-products");
  if (!container) return;

  watchProducts(
    (products) => {
      if (products.length === 0) {
        container.innerHTML = emptyState("No products yet. Vendors can list items from the Sell page.", true);
        return;
      }
      container.innerHTML = products.map(renderHomeCard).join("");
    },
    { limitCount: 4, onError: () => {
      container.innerHTML = emptyState("Could not load products. Enable Firestore and apply security rules in Firebase Console.", false);
    }}
  );
}

let allBrowseProducts = [];

function initBrowseProducts() {
  const container = document.getElementById("browse-products");
  const countEl = document.getElementById("browse-count");
  if (!container) return;

  initBrowseFilters();
  const categoryParam = new URLSearchParams(window.location.search).get("category");
  if (categoryParam && CATEGORIES.includes(categoryParam)) {
    document.querySelectorAll("[data-category-filter]").forEach((cb) => {
      cb.checked = cb.dataset.categoryFilter === categoryParam;
    });
  }

  watchProducts(
    (products) => {
      allBrowseProducts = products;
      applyBrowseFilters();
    },
    { onError: () => {
      container.innerHTML = emptyState("Could not load products. Enable Firestore and apply security rules in Firebase Console.", false);
      if (countEl) countEl.textContent = "Unable to load products";
    }}
  );
}

function initBrowseFilters() {
  const checkboxes = document.querySelectorAll("[data-category-filter]");
  checkboxes.forEach((cb) => {
    cb.addEventListener("change", applyBrowseFilters);
  });

  const sortSelect = document.getElementById("browse-sort");
  if (sortSelect) {
    sortSelect.addEventListener("change", applyBrowseFilters);
  }
}

function applyBrowseFilters() {
  const activeCategories = [...document.querySelectorAll("[data-category-filter]:checked")].map(
    (cb) => cb.dataset.categoryFilter
  );

  let filtered = allBrowseProducts.filter((p) => activeCategories.includes(p.category));

  const sort = document.getElementById("browse-sort")?.value;
  if (sort === "price-asc") filtered = [...filtered].sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") filtered = [...filtered].sort((a, b) => b.price - a.price);
  else filtered = [...filtered].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

  renderBrowseGrid(filtered);

  const countEl = document.getElementById("browse-count");
  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} product${filtered.length === 1 ? "" : "s"}`;
  }
}

function renderBrowseGrid(products) {
  const container = document.getElementById("browse-products");
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = emptyState("No products match your filters.");
    return;
  }
  container.innerHTML = products.map(renderBrowseCard).join("");
}

async function initProductDetail() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");
  if (!productId) {
    showProductError("No product selected.");
    return;
  }

  try {
    const snap = await getDoc(doc(db, "products", productId));
    if (!snap.exists()) {
      showProductError("Product not found.");
      return;
    }
    renderProductDetail({ id: snap.id, ...snap.data() });
  } catch (err) {
    console.error("Failed to load product:", err);
    showProductError("Could not load product details.");
  }
}

function showProductError(message) {
  const main = document.getElementById("product-detail");
  if (main) {
    main.innerHTML = `<div class="text-center py-16"><p class="font-body-md text-on-surface-variant mb-4">${escapeHtml(message)}</p><a href="Browse.html" class="text-primary font-label-md hover:underline">Browse all products</a></div>`;
  }
}

function renderProductDetail(product) {
  document.title = `${product.name} | Easy Buy`;

  document.body.dataset.currentProductId = product.id;
  document.body.dataset.currentProductName = product.name;
  document.body.dataset.currentProductPrice = String(product.price);
  document.body.dataset.currentProductImage = product.imageUrl || "";
  document.body.dataset.currentProductCategory = product.category || "";

  setText("product-breadcrumb-category", product.category);
  setText("product-breadcrumb-name", product.name);
  setAttr("product-breadcrumb-category-link", "href", `Browse.html?category=${encodeURIComponent(product.category)}`);

  const img = document.getElementById("product-image");
  if (img) {
    img.src = product.imageUrl;
    img.alt = product.name;
  }

  setText("product-category-label", product.category);
  setText("product-name", product.name);
  setText("product-price", formatPrice(product.price));
  setText("product-vendor", product.vendorName || "Easy Buy Vendor");
  setText("product-stock", product.stock > 0 ? `${product.stock} in stock` : "Out of stock");
  setText("product-description", product.description);

  const stockEl = document.getElementById("product-stock");
  if (stockEl) {
    stockEl.classList.toggle("text-error", product.stock <= 0);
    stockEl.classList.toggle("text-secondary", product.stock > 0);
  }

  const thumbs = document.getElementById("product-thumbnails");
  if (thumbs) thumbs.classList.add("hidden");
}

function watchProducts(callback, { limitCount, onError } = {}) {
  let q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  if (limitCount) q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(limitCount));

  return onSnapshot(
    q,
    (snapshot) => callback(mapProductDocs(snapshot.docs)),
    async (err) => {
      console.warn("Live product feed unavailable, using fallback:", err);
      try {
        const products = await fetchProductsFallback({ limitCount });
        callback(products);
      } catch (fallbackErr) {
        console.error("Failed to load products:", fallbackErr);
        if (onError) onError(fallbackErr);
      }
    }
  );
}

async function fetchProducts({ limitCount } = {}) {
  try {
    let q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    if (limitCount) q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(limitCount));
    const snapshot = await getDocs(q);
    return mapProductDocs(snapshot.docs);
  } catch {
    return fetchProductsFallback({ limitCount });
  }
}

async function fetchProductsFallback({ limitCount } = {}) {
  const snapshot = await getDocs(collection(db, "products"));
  let products = mapProductDocs(snapshot.docs);
  products.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  if (limitCount) products = products.slice(0, limitCount);
  return products;
}

function mapProductDocs(docs) {
  return docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.status !== "inactive" && p.name && p.imageUrl);
}

function encodeProductData(product) {
  return encodeURIComponent(
    JSON.stringify({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
    })
  );
}

function renderHomeCard(product) {
  const isNew = isRecentlyAdded(product.createdAt);
  return `
    <div class="product-card bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_4px_12px_rgba(0,0,0,0.05)] flex flex-col group cursor-pointer border border-outline-variant/30 hover:shadow-lg transition-shadow" data-product-id="${product.id}" data-product="${encodeProductData(product)}">
      <div class="relative aspect-square">
        <img class="w-full h-full object-cover" alt="${escapeHtml(product.name)}" src="${escapeHtml(product.imageUrl)}"/>
        ${isNew ? '<span class="absolute top-2 left-2 bg-tertiary text-white font-label-sm text-label-sm px-2 py-1 rounded">New</span>' : ""}
        <button type="button" class="btn-favorite absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-on-surface hover:text-error transition-colors">
          <span class="material-symbols-outlined icon-md" data-icon="favorite">favorite</span>
        </button>
      </div>
      <div class="p-3 md:p-4">
        <h3 class="font-body-md text-body-md line-clamp-1 mb-1">${escapeHtml(product.name)}</h3>
        <div class="flex items-center gap-1 mb-2">
          <span class="font-label-sm text-label-sm text-on-surface-variant">${escapeHtml(product.category)}</span>
        </div>
        <div class="flex items-center justify-between mt-auto">
          <span class="font-headline-md text-headline-md text-primary font-bold">${formatPrice(product.price)}</span>
          <button type="button" class="btn-cart-icon w-8 h-8 md:w-10 md:h-10 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary-container transition-colors">
            <span class="material-symbols-outlined" data-icon="add_shopping_cart">add_shopping_cart</span>
          </button>
        </div>
      </div>
    </div>`;
}

function renderBrowseCard(product) {
  const isNew = isRecentlyAdded(product.createdAt);
  return `
    <div class="product-card group bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant hover:shadow-lg transition-all duration-300 cursor-pointer" data-product-id="${product.id}" data-product="${encodeProductData(product)}">
      <div class="relative h-48 bg-surface-container-highest overflow-hidden">
        <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="${escapeHtml(product.name)}" src="${escapeHtml(product.imageUrl)}"/>
        <button type="button" class="btn-favorite absolute top-3 right-3 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-white transition-colors">
          <span class="material-symbols-outlined">favorite</span>
        </button>
      </div>
      <div class="p-4 space-y-2">
        <div class="flex items-center gap-2">
          ${isNew ? '<span class="px-2 py-0.5 bg-secondary-container text-on-secondary-container text-label-sm font-label-sm rounded-full">New</span>' : ""}
          <span class="text-label-sm font-label-sm text-outline">${escapeHtml(product.category)}</span>
        </div>
        <h3 class="font-headline-md text-[18px] text-on-surface line-clamp-1 group-hover:text-primary transition-colors">${escapeHtml(product.name)}</h3>
        <div class="flex items-center gap-1">
          <span class="font-body-sm text-on-surface-variant">${escapeHtml(product.vendorName || "Easy Buy")}</span>
        </div>
        <div class="flex items-center justify-between pt-2">
          <span class="font-headline-md text-primary text-[20px]">${formatPrice(product.price)}</span>
          <button type="button" class="btn-cart-icon bg-primary text-on-primary p-2 rounded-lg hover:bg-primary-container transition-all active:scale-95">
            <span class="material-symbols-outlined">shopping_cart</span>
          </button>
        </div>
      </div>
    </div>`;
}

function emptyState(message, showVendorLink = true) {
  const vendorLink = showVendorLink
    ? ` <a href="vendor.html" class="text-primary hover:underline">Add a product</a>`
    : "";
  return `<p class="col-span-full text-center text-on-surface-variant font-body-md py-12">${escapeHtml(message)}${vendorLink}</p>`;
}

function formatPrice(price) {
  return `Le ${Number(price).toLocaleString()}`;
}

function isRecentlyAdded(createdAt) {
  if (!createdAt) return true;
  const ms = toMillis(createdAt);
  return Date.now() - ms < 7 * 24 * 60 * 60 * 1000;
}

function toMillis(timestamp) {
  if (!timestamp) return 0;
  if (timestamp.toMillis) return timestamp.toMillis();
  if (timestamp.seconds) return timestamp.seconds * 1000;
  return new Date(timestamp).getTime() || 0;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setAttr(id, attr, value) {
  const el = document.getElementById(id);
  if (el) el.setAttribute(attr, value);
}

function escapeHtml(str) {
  if (str == null) return "";
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

export { fetchProducts, CATEGORIES };
