tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "tertiary-fixed-dim": "#ffb692",
        "primary-fixed-dim": "#b7c4ff",
        "inverse-surface": "#2f3133",
        "primary-container": "#0052ff",
        background: "#f9f9fc",
        surface: "#f9f9fc",
        "surface-container-highest": "#e2e2e5",
        "on-primary-container": "#dfe3ff",
        secondary: "#006e2a",
        "on-error": "#ffffff",
        "surface-dim": "#dadadc",
        "on-error-container": "#93000a",
        "on-tertiary": "#ffffff",
        "on-background": "#1a1c1e",
        "outline-variant": "#c3c5d9",
        "secondary-fixed-dim": "#3ce36a",
        "on-surface-variant": "#434656",
        "tertiary-fixed": "#ffdbcb",
        "primary-fixed": "#dde1ff",
        "on-tertiary-container": "#ffded0",
        "surface-tint": "#004ced",
        "on-primary": "#ffffff",
        "on-tertiary-fixed-variant": "#7a3000",
        "surface-bright": "#f9f9fc",
        tertiary: "#853600",
        "on-secondary": "#ffffff",
        "surface-container-low": "#f3f3f6",
        "inverse-on-surface": "#f0f0f3",
        "secondary-fixed": "#69ff87",
        outline: "#737688",
        error: "#ba1a1a",
        "on-secondary-container": "#00732c",
        primary: "#003ec7",
        "secondary-container": "#5cfd80",
        "on-tertiary-fixed": "#341100",
        "on-primary-fixed-variant": "#0038b6",
        "surface-variant": "#e2e2e5",
        "surface-container-high": "#e8e8ea",
        "surface-container-lowest": "#ffffff",
        "on-secondary-fixed": "#002108",
        "on-primary-fixed": "#001452",
        "inverse-primary": "#b7c4ff",
        "tertiary-container": "#ac4700",
        "surface-container": "#eeeef0",
        "on-secondary-fixed-variant": "#00531e",
        "error-container": "#ffdad6",
        "on-surface": "#1a1c1e",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      spacing: {
        "margin-mobile": "16px",
        "max-width-desktop": "1200px",
        "margin-desktop": "auto",
        "gutter-mobile": "16px",
        "gutter-desktop": "24px",
        base: "8px",
      },
      fontFamily: {
        "body-lg": ["Hanken Grotesk"],
        "body-md": ["Hanken Grotesk"],
        "headline-xl": ["Hanken Grotesk"],
        "headline-md": ["Hanken Grotesk"],
        "body-sm": ["Hanken Grotesk"],
        "label-sm": ["Hanken Grotesk"],
        "label-md": ["Hanken Grotesk"],
        "headline-lg": ["Hanken Grotesk"],
        "headline-lg-mobile": ["Hanken Grotesk"],
      },
      fontSize: {
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "headline-xl": ["40px", { lineHeight: "48px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "body-sm": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-sm": ["12px", { lineHeight: "14px", fontWeight: "500" }],
        "label-md": ["14px", { lineHeight: "16px", letterSpacing: "0.01em", fontWeight: "600" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-lg-mobile": ["24px", { lineHeight: "32px", fontWeight: "700" }],
      },
    },
  },
};

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

  const page = document.body.dataset.page;
  if (page === "browse") initBrowsePage();
  if (page === "cart") initCartPage();
  if (page === "payment") initPaymentPage();
  if (page === "orders") initOrdersPage();
});

function go(href) {
  window.location.href = href;
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
    el.addEventListener("click", () => go(PAGES.browse));
  });

  document.querySelectorAll(".btn-continue-shopping").forEach((el) => {
    el.addEventListener("click", () => go(PAGES.browse));
  });

  document.querySelectorAll(".btn-add-cart, .btn-cart-icon").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      go(PAGES.cart);
    });
  });

  document.querySelectorAll(".btn-buy-now").forEach((el) => {
    el.addEventListener("click", () => go(PAGES.payment));
  });

  document.querySelectorAll(".btn-checkout").forEach((el) => {
    el.addEventListener("click", () => go(PAGES.payment));
  });

  document.querySelectorAll(".btn-pay-now").forEach((el) => {
    el.addEventListener("click", () => go(PAGES.orders));
  });

  document.querySelectorAll("[data-nav='cart']").forEach((el) => {
    el.addEventListener("click", () => go(PAGES.cart));
  });
}

function initProductCards() {
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".product-card");
    if (!card) return;
    if (e.target.closest("button, .btn-add-cart, .btn-cart-icon")) return;
    const productId = card.dataset.productId;
    go(productId ? `${PAGES.product}?id=${productId}` : PAGES.product);
  });
}

function initBrowsePage() {
  document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      console.log("Filtering items...");
    });
  });

  const searchInput = document.querySelector('input[type="text"]');
  if (searchInput && searchInput.parentElement) {
    searchInput.parentElement.classList.add("search-focus-scale");
  }
}

function initCartPage() {
  document.querySelectorAll('[data-qty="increment"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const span = btn.previousElementSibling;
      if (span) span.textContent = String(parseInt(span.textContent, 10) + 1);
    });
  });

  document.querySelectorAll('[data-qty="decrement"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const span = btn.nextElementSibling;
      if (!span) return;
      const val = parseInt(span.textContent, 10);
      if (val > 1) span.textContent = String(val - 1);
    });
  });
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
  document.querySelectorAll(".animate-pulse").forEach((step) => {
    step.addEventListener("click", () => {
      step.classList.add("scale-110");
      setTimeout(() => step.classList.remove("scale-110"), 200);
    });
  });
}
