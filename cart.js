import { auth, db } from "./firebase.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const CART_KEY = "easybuy_cart";
const DELIVERY_FEE = 150;
const VAT_RATE = 0.15;
const CART_DEBOUNCE_MS = 300;

let currentUserUid = null;
let syncInFlight = false;
let writeTimer = null;

export function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) {
      localStorage.setItem(CART_KEY, "[]");
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("cart-updated"));
}

export function addToCart(item) {
  const cart = getCart();
  const existing = cart.find((entry) => entry.id === item.id);
  if (existing) {
    existing.qty += item.qty || 1;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      variant: item.variant || item.category || "",
      price: Number(item.price),
      qty: item.qty || 1,
      imageUrl: item.imageUrl || "",
    });
  }
  saveCart(cart);
  scheduleSync();
  return cart;
}

export function removeFromCart(id) {
  const cart = getCart().filter((entry) => entry.id !== id);
  saveCart(cart);
  scheduleSync();
  return cart;
}

export function updateCartQty(id, qty) {
  const cart = getCart();
  const item = cart.find((entry) => entry.id === id);
  if (!item) return cart;
  if (qty <= 0) return removeFromCart(id);
  item.qty = qty;
  saveCart(cart);
  scheduleSync();
  return cart;
}

export function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

export function getCartTotals() {
  const subtotal = getCart().reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = Math.round(subtotal * VAT_RATE);
  const total = subtotal + DELIVERY_FEE + tax;
  return { subtotal, delivery: DELIVERY_FEE, tax, total };
}

export function formatPrice(amount) {
  return `Le ${Number(amount).toLocaleString()}`;
}

export function parseProductFromCard(card) {
  if (!card) return null;
  try {
    if (card.dataset.product) {
      return JSON.parse(decodeURIComponent(card.dataset.product));
    }
  } catch {
    /* fall through */
  }
  if (!card.dataset.productId) return null;
  return {
    id: card.dataset.productId,
    name: card.dataset.productName || "Product",
    price: Number(card.dataset.productPrice || 0),
    imageUrl: card.dataset.productImage || "",
    category: card.dataset.productCategory || "",
  };
}

async function loadCartFromRemote(uid) {
  if (syncInFlight) return;
  syncInFlight = true;
  try {
    const ref = doc(db, "carts", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.items)) {
        saveCart(data.items);
      }
    }
  } catch (err) {
    console.warn("Failed to load cart from Firestore:", err);
  } finally {
    syncInFlight = false;
  }
}

async function pushCartToRemote(uid, items) {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(async () => {
    if (syncInFlight) return;
    syncInFlight = true;
    try {
      const ref = doc(db, "carts", uid);
      await setDoc(ref, { items, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn("Failed to sync cart to Firestore:", err);
    } finally {
      syncInFlight = false;
    }
  }, CART_DEBOUNCE_MS);
}
    }
  } catch (err) {
    console.warn("Failed to load cart from Firestore:", err);
  } finally {
    syncInFlight = false;
  }
}

async function pushCartToRemote(uid, items) {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(async () => {
    if (syncInFlight) return;
    syncInFlight = true;
    try {
      const ref = doc(db, "carts", uid);
      await setDoc(ref, { items, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.warn("Failed to sync cart to Firestore:", err);
    } finally {
      syncInFlight = false;
    }
  }, CART_DEBOUNCE_MS);
}

function scheduleSync() {
  if (!currentUserUid) return;
  const items = getCart();
  pushCartToRemote(currentUserUid, items);
}

export function startCartSync() {
  if (!auth.currentUser) {
    currentUserUid = null;
    return;
  }
  const uid = auth.currentUser.uid;
  if (currentUserUid !== uid) {
    currentUserUid = uid;
    loadCartFromRemote(uid);
  }
}
