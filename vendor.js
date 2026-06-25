import { db, storage, auth } from "./firebase.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VENDOR_KEY = "easybuy_vendor_name";

let currentVendor = null;
let unsubscribeVendorProducts = null;

function getVendorName() {
  try { return localStorage.getItem(VENDOR_KEY); } catch { return ""; }
}

function setVendorName(name) {
  try { localStorage.setItem(VENDOR_KEY, name); } catch {}
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page !== "vendor") return;
  initVendorPage();
});

function initVendorPage() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "vendor-auth.html";
      return;
    }
    currentVendor = user;
    const saved = getVendorName();
    const nameInput = document.getElementById("vendor-name");
    if (saved && nameInput && !nameInput.value) {
      nameInput.value = saved;
    }
    watchVendorProducts(user.uid);
  });

  const logoutBtn = document.getElementById("vendor-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "vendor-auth.html";
    });
  }

  const form = document.getElementById("add-product-form");
  const imageInput = document.getElementById("product-image");
  const preview = document.getElementById("image-preview");
  const previewImg = document.getElementById("preview-img");
  const removeBtn = document.getElementById("remove-image");

  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      showAlert("Please upload a JPG, PNG, or WebP image.", "error");
      imageInput.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      showAlert("Image must be smaller than 5 MB.", "error");
      imageInput.value = "";
      return;
    }

    previewImg.src = URL.createObjectURL(file);
    preview.classList.remove("hidden");
    hideAlert();
  });

  removeBtn.addEventListener("click", () => {
    imageInput.value = "";
    previewImg.src = "";
    preview.classList.add("hidden");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentVendor) {
      showAlert("You must be logged in to list a product.", "error");
      return;
    }
    await submitProduct(form, imageInput);
  });

  const vendorProductsList = document.getElementById("vendor-products-list");
  if (vendorProductsList) {
    vendorProductsList.addEventListener("click", async (e) => {
      const deleteBtn = e.target.closest("[data-delete-product]");
      if (!deleteBtn) return;

      const productId = deleteBtn.dataset.deleteProduct;
      const storagePath = deleteBtn.dataset.storagePath || "";
      const name = deleteBtn.dataset.productName || "this product";
      const confirmed = window.confirm(`Delete ${name}? This removes it from the marketplace.`);
      if (!confirmed) return;

      await deleteVendorProduct(productId, storagePath, deleteBtn);
    });
  }
}

async function submitProduct(form, imageInput) {
  const submitBtn = document.getElementById("submit-btn");
  const submitText = document.getElementById("submit-text");
  const submitIcon = document.getElementById("submit-icon");
  const file = imageInput.files[0];

  if (!file) {
    showAlert("Please select a product image.", "error");
    return;
  }

  const formData = new FormData(form);
  const rawSpecs = (formData.get("specifications") || "").trim();
  const specifications = rawSpecs
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes(":"));
  const product = {
    name: formData.get("name").trim(),
    description: formData.get("description").trim(),
    price: Number(formData.get("price")),
    stock: Number(formData.get("stock")),
    category: formData.get("category"),
    vendorName: formData.get("vendorName").trim(),
    specifications,
  };

  if (!product.name || !product.description || !product.category || !product.vendorName) {
    showAlert("Please fill in all required fields.", "error");
    return;
  }

  if (product.price <= 0 || product.stock < 0) {
    showAlert("Enter a valid price and stock quantity.", "error");
    return;
  }

  setLoading(submitBtn, submitText, submitIcon, true);
  hideAlert();

  let imageUrl = "";
  let storagePath = "";

  try {
    const ext = file.name.split(".").pop() || "jpg";
    const safeName = product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    storagePath = `product-images/${Date.now()}_${safeName}.${ext}`;
    const storageRef = ref(storage, storagePath);
    const contentType = file.type || "image/jpeg";

    await uploadBytes(storageRef, file, { contentType });
    imageUrl = await getDownloadURL(storageRef);
  } catch (err) {
    console.error("Storage upload failed:", err);
    showAlert(getUploadError(err), "error");
    setLoading(submitBtn, submitText, submitIcon, false);
    return;
  }

  try {
    await addDoc(collection(db, "products"), {
      ...product,
      imageUrl,
      storagePath,
      vendorId: currentVendor.uid,
      vendorEmail: currentVendor.email || "",
      status: "active",
      createdAt: serverTimestamp(),
    });

    form.reset();
    document.getElementById("image-preview").classList.add("hidden");
    document.getElementById("preview-img").src = "";
    setVendorName(product.vendorName);
    showSuccess("Product published successfully! It is now live on the marketplace.");
  } catch (err) {
    console.error("Firestore save failed:", err);
    showAlert(getFirestoreError(err), "error");
  } finally {
    setLoading(submitBtn, submitText, submitIcon, false);
  }
}

function watchVendorProducts(vendorId) {
  const list = document.getElementById("vendor-products-list");
  if (!list) return;

  if (unsubscribeVendorProducts) unsubscribeVendorProducts();

  const vendorProductsQuery = query(collection(db, "products"), where("vendorId", "==", vendorId));
  unsubscribeVendorProducts = onSnapshot(
    vendorProductsQuery,
    (snapshot) => {
      const products = snapshot.docs
        .map((productDoc) => ({ id: productDoc.id, ...productDoc.data() }))
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      renderVendorProducts(products);
    },
    (err) => {
      console.error("Failed to load vendor products:", err);
      list.innerHTML = `<p class="text-center text-error font-body-sm py-6">${escapeHtml(getFirestoreError(err))}</p>`;
    }
  );
}

function renderVendorProducts(products) {
  const list = document.getElementById("vendor-products-list");
  if (!list) return;

  if (products.length === 0) {
    list.innerHTML = `<p class="text-center text-on-surface-variant font-body-sm py-6">No products added from this account yet.</p>`;
    return;
  }

  list.innerHTML = products.map(renderVendorProductItem).join("");
}

function renderVendorProductItem(product) {
  const imageUrl = product.imageUrl || "";
  const status = product.status || "active";
  return `
    <article class="flex items-center gap-4 rounded-xl border border-outline-variant/40 bg-surface-container-low p-3">
      <div class="w-16 h-16 rounded-lg overflow-hidden bg-surface-container-highest flex-shrink-0">
        ${imageUrl
          ? `<img class="w-full h-full object-cover" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(product.name)}"/>`
          : `<div class="w-full h-full flex items-center justify-center text-outline"><span class="material-symbols-outlined">image</span></div>`}
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="font-label-md text-label-md text-on-surface truncate">${escapeHtml(product.name)}</h3>
        <p class="font-body-sm text-body-sm text-on-surface-variant">${formatPrice(product.price)} &middot; ${escapeHtml(product.category || "Uncategorized")} &middot; ${escapeHtml(status)}</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-error hover:bg-error-container/30 font-label-sm text-label-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        data-delete-product="${escapeHtml(product.id)}"
        data-storage-path="${escapeHtml(product.storagePath || "")}"
        data-product-name="${escapeHtml(product.name)}"
      >
        <span class="material-symbols-outlined text-[18px]">delete</span>
        Delete
      </button>
    </article>`;
}

async function deleteVendorProduct(productId, storagePath, button) {
  if (!productId) return;

  const originalHtml = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<span class="material-symbols-outlined text-[18px]">hourglass_top</span>Deleting`;
  hideAlert();

  try {
    await deleteDoc(doc(db, "products", productId));
    if (storagePath) {
      try {
        await deleteObject(ref(storage, storagePath));
      } catch (err) {
        console.warn("Product image deletion skipped:", err);
      }
    }
    showAlert("Product deleted from the marketplace.", "success");
  } catch (err) {
    console.error("Product delete failed:", err);
    showAlert(getFirestoreError(err), "error");
    button.disabled = false;
    button.innerHTML = originalHtml;
  }
}

function setLoading(btn, textEl, iconEl, loading) {
  btn.disabled = loading;
  textEl.textContent = loading ? "Publishing..." : "Publish Product";
  iconEl.textContent = loading ? "hourglass_top" : "publish";
}

function showAlert(message, type) {
  const alert = document.getElementById("vendor-alert");
  alert.textContent = message;
  alert.classList.remove("hidden", "bg-error-container", "text-on-error-container", "border-error/30", "bg-secondary-container", "text-on-secondary-container", "border-secondary/30");

  if (type === "success") {
    alert.classList.add("bg-secondary-container", "text-on-secondary-container", "border-secondary/30");
  } else {
    alert.classList.add("bg-error-container", "text-on-error-container", "border-error/30");
  }
}

function showSuccess(message) {
  const alert = document.getElementById("vendor-alert");
  alert.classList.remove("hidden", "bg-error-container", "text-on-error-container", "border-error/30");
  alert.classList.add("bg-secondary-container", "text-on-secondary-container", "border-secondary/30");
  alert.innerHTML = `${escapeHtml(message)}
    <span class="block mt-2">
      <a href="Browse.html" class="text-primary font-semibold hover:underline">View on marketplace</a>
      ·
      <a href="home.html" class="text-primary font-semibold hover:underline">Go to home page</a>
    </span>`;
}

function escapeHtml(str) {
  if (str == null) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatPrice(price) {
  return `Le ${Number(price || 0).toLocaleString()}`;
}

function toMillis(timestamp) {
  if (!timestamp) return 0;
  if (timestamp.toMillis) return timestamp.toMillis();
  if (timestamp.seconds) return timestamp.seconds * 1000;
  return new Date(timestamp).getTime() || 0;
}

function getUploadError(err) {
  if (err.code === "permission-denied" || err.code === "storage/unauthorized") {
    return "Storage permission denied. In Firebase Console go to Storage → Rules, paste the rules from storage.rules, and click Publish.";
  }
  if (err.code === "storage/unauthenticated") {
    return "Storage requires authentication. Check your Firebase Storage rules.";
  }
  return `Image upload failed: ${err.message || "Unknown error"}`;
}

function getFirestoreError(err) {
  if (err.code === "permission-denied") {
    return "Firestore permission denied. In Firebase Console go to Firestore > Rules, paste the rules from firestore.rules, and click Publish.";
  }
  return `Could not complete product action: ${err.message || "Unknown error"}`;
}

function hideAlert() {
  document.getElementById("vendor-alert").classList.add("hidden");
}
