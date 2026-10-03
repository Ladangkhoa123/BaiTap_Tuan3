"use strict";

const cartKey = "khoa-store-demo-cart";
const productGrid = document.querySelector(".product-grid");
const catalogCards = [...productGrid.querySelectorAll("[data-product-id]")];
const allProductCards = [...document.querySelectorAll("[data-product-id]")];
const productById = new Map(
  allProductCards.map((card) => [
    card.dataset.productId,
    {
      id: card.dataset.productId,
      name: card.querySelector(".product-copy h2, .best-seller-front h2").textContent.trim(),
      price: Number(card.dataset.price),
    },
  ]),
);
const cartDialog = document.querySelector("#cart-dialog");
const cartItems = document.querySelector("#cart-items");
const cartCount = document.querySelector("#cart-count");
const cartEmpty = document.querySelector("#cart-empty");
const cartSummary = document.querySelector("#cart-summary");
const cartSubtotal = document.querySelector("#cart-subtotal");
const cartStatus = document.querySelector("#cart-status");
const checkoutForm = document.querySelector("#checkout-form");
const toast = document.querySelector("#shop-toast");

function loadCart() {
  try {
    const savedCart = localStorage.getItem(cartKey);
    if (!savedCart) return [];

    const parsedCart = JSON.parse(savedCart);
    if (!Array.isArray(parsedCart)) {
      throw new TypeError("Giỏ hàng đã lưu không đúng định dạng.");
    }

    return parsedCart
      .filter((item) => productById.has(item.id) && Number.isInteger(item.quantity) && item.quantity > 0)
      .map(({ id, quantity }) => ({ id, quantity }));
  } catch (error) {
    console.error("Không thể khôi phục giỏ hàng đã lưu.", error);
    return [];
  }
}

let cart = loadCart();
let toastTimeout;

function formatPrice(amount) {
  return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}

function saveCart() {
  try {
    localStorage.setItem(cartKey, JSON.stringify(cart));
  } catch (error) {
    console.error("Không thể lưu giỏ hàng trên trình duyệt.", error);
    cartStatus.textContent = "Không lưu được giỏ hàng trên thiết bị này.";
  }
}

function updateCart() {
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = cart.reduce(
    (total, item) => total + productById.get(item.id).price * item.quantity,
    0,
  );

  cartCount.textContent = String(itemCount);
  cartCount.setAttribute(
    "aria-label",
    `${itemCount} ${itemCount === 1 ? "sản phẩm" : "sản phẩm"} trong giỏ`,
  );
  cartEmpty.hidden = itemCount > 0;
  cartSummary.hidden = itemCount === 0;
  cartItems.replaceChildren();

  for (const item of cart) {
    const product = productById.get(item.id);
    const row = document.createElement("li");
    row.className = "cart-item";

    const details = document.createElement("div");
    details.className = "cart-item-details";
    const name = document.createElement("strong");
    name.textContent = product.name;
    const price = document.createElement("span");
    price.textContent = formatPrice(product.price);
    details.append(name, price);

    const controls = document.createElement("div");
    controls.className = "cart-item-controls";
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.dataset.cartAction = "decrease";
    decrease.dataset.productId = product.id;
    decrease.setAttribute("aria-label", `Giảm số lượng ${product.name}`);
    decrease.textContent = "−";
    const quantity = document.createElement("span");
    quantity.textContent = String(item.quantity);
    quantity.setAttribute("aria-label", `Số lượng ${item.quantity}`);
    const increase = document.createElement("button");
    increase.type = "button";
    increase.dataset.cartAction = "increase";
    increase.dataset.productId = product.id;
    increase.setAttribute("aria-label", `Tăng số lượng ${product.name}`);
    increase.textContent = "+";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "cart-remove";
    remove.dataset.cartAction = "remove";
    remove.dataset.productId = product.id;
    remove.textContent = "Xóa";
    controls.append(decrease, quantity, increase, remove);

    row.append(details, controls);
    cartItems.append(row);
  }

  cartSubtotal.textContent = formatPrice(subtotal);
  saveCart();
}

function announce(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function filterProducts() {
  const search = document.querySelector("#product-search").value.trim().toLocaleLowerCase("vi");
  const category = document.querySelector("#category-filter").value;
  let visibleCount = 0;

  for (const card of allProductCards) {
    const matchesSearch = card.textContent.toLocaleLowerCase("vi").includes(search);
    const matchesCategory = category === "all" || card.dataset.category === category;
    card.hidden = !(matchesSearch && matchesCategory);
    if (!card.hidden) visibleCount += 1;
  }

  document.querySelector("#catalog-result").textContent =
    visibleCount === 0 ? "Không tìm thấy sản phẩm phù hợp." : `Đang hiển thị ${visibleCount} sản phẩm`;
}

document.querySelector("#open-cart").addEventListener("click", () => {
  cartDialog.showModal();
});

document.querySelector("#continue-shopping").addEventListener("click", () => {
  cartDialog.close();
});

document.querySelector("#product-search").addEventListener("input", filterProducts);
document.querySelector("#category-filter").addEventListener("change", filterProducts);

document.querySelector("#sort-products").addEventListener("change", (event) => {
  const direction = event.currentTarget.value;
  const sortedCards = [...catalogCards];

  if (direction === "price-asc") {
    sortedCards.sort((a, b) => Number(a.dataset.price) - Number(b.dataset.price));
  } else if (direction === "price-desc") {
    sortedCards.sort((a, b) => Number(b.dataset.price) - Number(a.dataset.price));
  }

  productGrid.append(...sortedCards);
});

document.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-to-cart]");
  if (addButton) {
    const card = addButton.closest("[data-product-id]");
    const product = productById.get(card.dataset.productId);
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) existingItem.quantity += 1;
    else cart.push({ id: product.id, quantity: 1 });

    updateCart();
    announce(`Đã thêm ${product.name} vào giỏ hàng.`);
    return;
  }

  const actionButton = event.target.closest("[data-cart-action]");
  if (!actionButton) return;

  const item = cart.find((entry) => entry.id === actionButton.dataset.productId);
  if (!item) return;

  if (actionButton.dataset.cartAction === "increase") item.quantity += 1;
  if (actionButton.dataset.cartAction === "decrease") item.quantity -= 1;
  if (actionButton.dataset.cartAction === "remove" || item.quantity <= 0) {
    cart = cart.filter((entry) => entry.id !== item.id);
  }
  updateCart();
});

document.querySelector("#checkout-trigger").addEventListener("click", () => {
  checkoutForm.hidden = false;
  checkoutForm.querySelector("input").focus();
});

checkoutForm.addEventListener("submit", (event) => {
  event.preventDefault();
  cartStatus.textContent =
    "Đây là bản demo: thông tin chưa được gửi và đơn hàng chưa được tạo. Hãy liên hệ cửa hàng để đặt hàng thật.";
});

cartDialog.addEventListener("close", () => {
  checkoutForm.hidden = true;
  cartStatus.textContent = "";
});

updateCart();
filterProducts();
