import { db, storage, auth } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-storage.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VENDOR_KEY = "easybuy_vendor_name";

let currentVendor = null;

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
      <a href="index.html" class="text-primary font-semibold hover:underline">Go to home page</a>
    </span>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
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
    return "Firestore permission denied. In Firebase Console go to Firestore → Rules, paste the rules from firestore.rules, and click Publish.";
  }
  return `Could not save product: ${err.message || "Unknown error"}`;
}

function hideAlert() {
  document.getElementById("vendor-alert").classList.add("hidden");
}
