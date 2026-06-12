import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  limit,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import {
  getCart,
  getCartTotals,
  formatPrice,
} from "./cart.js";

const ORDERS_COLLECTION = "orders";

export function saveOrder(paymentInfo = {}) {
  const cart = getCart();
  if (cart.length === 0) return null;

  const { subtotal, delivery, tax } = getCartTotals();
  const serviceFee = Math.round(subtotal * 0.01);
  const total = subtotal + delivery + tax + serviceFee;

  return addDoc(collection(db, ORDERS_COLLECTION), {
    items: cart.map((item) => ({
      id: item.id,
      name: item.name,
      variant: item.variant || "",
      price: Number(item.price),
      qty: item.qty,
      imageUrl: item.imageUrl || "",
    })),
    subtotal,
    delivery,
    tax,
    serviceFee,
    total,
    paymentMethod: paymentInfo.method || "cash",
    mobileNumber: paymentInfo.mobileNumber || "",
    status: "placed",
    createdAt: serverTimestamp(),
  });
}

export function watchOrders(callback) {
  const q = query(collection(db, ORDERS_COLLECTION), orderBy("createdAt", "desc"), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(orders);
    },
    async () => {
      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(orders);
    }
  );
}

export { ORDERS_COLLECTION };
