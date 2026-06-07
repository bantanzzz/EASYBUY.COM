import { db, storage } from "./firebase.js";
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

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page !== "vendor") return;
  initVendorPage();
});

function initVendorPage() {
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
  const product = {
    name: formData.get("name").trim(),
    description: formData.get("description").trim(),
    price: Number(formData.get("price")),
    stock: Number(formData.get("stock")),
    category: formData.get("category"),
    vendorName: formData.get("vendorName").trim(),
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

  try {
    const ext = file.name.split(".").pop() || "jpg";
    const safeName = product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const storagePath = `product-images/${Date.now()}_${safeName}.${ext}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, file);
    const imageUrl = await getDownloadURL(storageRef);

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
    showAlert("Product published successfully! It will appear in the marketplace shortly.", "success");
  } catch (err) {
    console.error("Failed to add product:", err);
    const message =
      err.code === "permission-denied"
        ? "Permission denied. Enable Firestore & Storage in Firebase Console and apply the security rules."
        : "Failed to publish product. Check your connection and try again.";
    showAlert(message, "error");
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

function hideAlert() {
  document.getElementById("vendor-alert").classList.add("hidden");
}
