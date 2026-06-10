const CART_KEY = "easybuy_cart";
const DELIVERY_FEE = 150;
const VAT_RATE = 0.15;

const DEFAULT_CART = [
  {
    id: "demo-1",
    name: "Swift Pro Runner X1",
    variant: "Size: 42 | Color: Electric Red",
    price: 1250,
    qty: 1,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDPURAFyc8y4aRIr777eAsCeVBN2koMJV3M1aKXfltapogFENu8XO6GHGb_twqb877b73kZqf8Eoo1PdgcrKZbFbciKil9NCQNVZJ_EW_AKTFZn9oMR9wuelrCYFZmLUMVMuczpxi50TrPjiSjs9GqFVTIN8Nu0Zb5PygfpmX6wpiKv79eKFGAEwGwH2rEsL5toDf7MI1_t1tJZ08fXBsIY2Ys18maJQIVvjJcc640pv4geL_aMuCcJh0d-g0AjVv_a41V3YT2wRXJl",
  },
  {
    id: "demo-2",
    name: "SonicWave Noise Cancelling",
    variant: "Color: Midnight Black",
    price: 2100,
    qty: 1,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuACi2yAFxUmMEtndH9gWiyGgbrPgOLd8_L7K9DT-zjUC0AvLw_4392IJ9TB_EWZXBmJPJVd-qegQuIQP-dVDwsdqvzT9Au6ibhNKVdXwJGSvjYh89PoaWPQ0m-vzv6zGM7SlWIW_Ia_bohWqseVVMyyXGmsqHJ-Nu7tsvL8WosDxkSpsWZQ3xhVm1nrPkDzLMj93LaQTTFXuwI2JIu0lB22YJGg0O68-0t5hU-QqM50JAnsZNbRITlqUzjGPLYhnJjO2ICxC3elt3qM",
  },
  {
    id: "demo-3",
    name: "OmniWatch Series 7",
    variant: "Strap: Arctic White",
    price: 3450,
    qty: 1,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD1UXk4gNQyWS-EIssTTwBKyItQEnZDA72n7gsakpTRkS4Wp7w2xM00xEXbpkAFYMXa6Soe3vvK_pPTcy4UAv2jBGwju529-2CvaoibdPmO42XeqscJ0fLY6S2g_ez3BuS9pvhFlwCtvvHfaKod_s4cy7ONYk5wEZo1xAsn2FxAD5JzMwn-mQCq6nw3KPXSN6oO8UbLu9rBUkY9TOk66Y5R3-TTMUUL8saV5XpYUzFf3_9r2Z-EC9VqURg2wrhb7eYfx3tIuOG-foy5",
  },
];

export function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) {
      saveCart(DEFAULT_CART);
      return [...DEFAULT_CART];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [...DEFAULT_CART];
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
