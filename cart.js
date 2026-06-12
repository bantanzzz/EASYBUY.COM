const CART_KEY = "easybuy_cart";
const DELIVERY_FEE = 150;
const VAT_RATE = 0.15;

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
  return cart;
}

export function removeFromCart(id) {
  const cart = getCart().filter((entry) => entry.id !== id);
  saveCart(cart);
  return cart;
}

export function updateCartQty(id, qty) {
  const cart = getCart();
  const item = cart.find((entry) => entry.id === id);
  if (!item) return cart;
  if (qty <= 0) return removeFromCart(id);
  item.qty = qty;
  saveCart(cart);
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
