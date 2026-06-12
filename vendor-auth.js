import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const VENDOR_KEY = "easybuy_vendor";

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page !== "vendor-auth") return;
  initAuthPage();
});

function initAuthPage() {
  const loginTab = document.getElementById("tab-login");
  const registerTab = document.getElementById("tab-register");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  loginTab.addEventListener("click", () => switchTab("login"));
  registerTab.addEventListener("click", () => switchTab("register"));

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleLogin(loginForm);
  });

  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleRegister(registerForm);
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      redirectToVendor();
    }
  });
}

function switchTab(tab) {
  const loginTab = document.getElementById("tab-login");
  const registerTab = document.getElementById("tab-register");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  if (tab === "login") {
    loginTab.classList.add("text-primary", "border-primary");
    loginTab.classList.remove("text-on-surface-variant", "border-transparent");
    registerTab.classList.remove("text-primary", "border-primary");
    registerTab.classList.add("text-on-surface-variant", "border-transparent");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
  } else {
    registerTab.classList.add("text-primary", "border-primary");
    registerTab.classList.remove("text-on-surface-variant", "border-transparent");
    loginTab.classList.remove("text-primary", "border-primary");
    loginTab.classList.add("text-on-surface-variant", "border-transparent");
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
  }
}

async function handleLogin(form) {
  const btn = form.querySelector("button[type='submit']");
  const text = document.getElementById("login-text");
  const icon = document.getElementById("login-icon");

  setLoading(btn, text, icon, true);
  hideAlert();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showSuccess("Logged in successfully!");
  } catch (err) {
    console.error("Login failed:", err);
    if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
      showAlert("Invalid email or password.", "error");
    } else if (err.code === "auth/too-many-requests") {
      showAlert("Too many attempts. Please try again later.", "error");
    } else {
      showAlert(getAuthError(err), "error");
    }
  } finally {
    setLoading(btn, text, icon, false);
  }
}

async function handleRegister(form) {
  const btn = form.querySelector("button[type='submit']");
  const text = document.getElementById("register-text");
  const icon = document.getElementById("register-icon");

  setLoading(btn, text, icon, true);
  hideAlert();

  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    localStorage.setItem(VENDOR_KEY, JSON.stringify({ uid: cred.user.uid, name, email }));
    showSuccess("Account created! Redirecting to vendor dashboard...");
    setTimeout(redirectToVendor, 1200);
  } catch (err) {
    console.error("Registration failed:", err);
    if (err.code === "auth/email-already-in-use") {
      showAlert("An account with this email already exists. Please log in.", "error");
      switchTab("login");
      document.getElementById("login-email").value = email;
    } else if (err.code === "auth/weak-password") {
      showAlert("Password must be at least 6 characters.", "error");
    } else {
      showAlert(getAuthError(err), "error");
    }
  } finally {
    setLoading(btn, text, icon, false);
  }
}

function redirectToVendor() {
  window.location.href = "vendor.html";
}

function setLoading(btn, textEl, iconEl, loading) {
  btn.disabled = loading;
  const isLogin = btn.form && btn.form.id === "login-form";
  textEl.textContent = loading ? "Please wait..." : (isLogin ? "Log In" : "Create Account");
  iconEl.textContent = loading ? "hourglass_top" : (isLogin ? "login" : "person_add");
}

function showAlert(message, type) {
  const alert = document.getElementById("auth-alert");
  alert.textContent = message;
  alert.classList.remove("hidden", "bg-error-container", "text-on-error-container", "border-error/30", "bg-secondary-container", "text-on-secondary-container", "border-secondary/30");
  if (type === "success") {
    alert.classList.add("bg-secondary-container", "text-on-secondary-container", "border-secondary/30");
  } else {
    alert.classList.add("bg-error-container", "text-on-error-container", "border-error/30");
  }
}

function showSuccess(message) {
  const alert = document.getElementById("auth-alert");
  alert.classList.remove("hidden", "bg-error-container", "text-on-error-container", "border-error/30");
  alert.classList.add("bg-secondary-container", "text-on-secondary-container", "border-secondary/30");
  alert.innerHTML = `${escapeHtml(message)}`;
}

function hideAlert() {
  document.getElementById("auth-alert").classList.add("hidden");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function getAuthError(err) {
  return `Authentication error: ${err.message || "Unknown error"}`;
}
