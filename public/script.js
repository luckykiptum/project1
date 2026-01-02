document.addEventListener("DOMContentLoaded", () => {

  /* ================= LOGOUT ================= */
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch("/logout", { method: "POST" });
        window.location.href = "/admin-login";
      } catch (err) {
        console.error("Logout failed:", err);
      }
    });
  }

  /* ================= INVENTORY PAGE ================= */
  const addForm = document.getElementById("addForm");
  if (addForm) {
    const tbody = document.querySelector("#inventoryTable tbody");
    let inventory = [];

    async function loadInventory() {
      try {
        const res = await fetch("/inventory");
        const items = await res.json();
        if (!Array.isArray(items)) throw new Error("Inventory not an array");

        inventory = items.map(i => ({
          ...i,
          cost: Number(i.cost),
          price: Number(i.price),
          quantity: Number(i.quantity)
        }));

        renderInventory(inventory);
      } catch (err) {
        console.error("Error loading inventory:", err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="color:red;">Failed to load inventory</td></tr>`;
      }
    }

    function renderInventory(items) {
      if (!tbody) return;
      tbody.innerHTML = "";
      if (!items.length) {
        tbody.innerHTML = "<tr><td colspan='5'>No products found</td></tr>";
        return;
      }

      items.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${item.name}</td>
          <td>KES ${Number(item.cost).toFixed(2)}</td>
          <td>KES ${Number(item.price).toFixed(2)}</td>
          <td>${Number(item.quantity)}</td>
          <td><button class="edit-btn">Edit</button></td>
        `;
        tbody.appendChild(tr);

        tr.querySelector(".edit-btn").addEventListener("click", () => editProduct(item));
      });
    }

    function editProduct(product) {
      const newName = prompt("Product name:", product.name);
      if (newName === null) return;

      if (inventory.some(i => i.name.toLowerCase() === newName.toLowerCase() && i._id !== product._id)) {
        return alert("Product with this name already exists");
      }

      const newCost = prompt("Cost price:", product.cost);
      if (newCost === null) return;

      const newPrice = prompt("Selling price:", product.price);
      if (newPrice === null) return;

      const newQty = prompt("Quantity:", product.quantity);
      if (newQty === null) return;

      fetch(`/inventory/${product._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          cost: Number(newCost),
          price: Number(newPrice),
          quantity: Number(newQty)
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.error) return alert(data.error);
        loadInventory();
      })
      .catch(err => alert("Error updating product: " + err.message));
    }

    addForm.addEventListener("submit", e => {
      e.preventDefault();
      const name = document.getElementById("name").value.trim();
      const cost = Number(document.getElementById("costPrice").value);
      const price = Number(document.getElementById("price").value);
      const quantity = Number(document.getElementById("quantity").value);

      if (!name || cost < 0 || price < 0 || quantity < 0) {
        return alert("Invalid input values");
      }

      if (inventory.some(item => item.name.toLowerCase() === name.toLowerCase())) {
        return alert("Product with this name already exists");
      }

      fetch("/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, cost, price, quantity })
      })
      .then(res => res.json())
      .then(data => {
        if (data.error) return alert(data.error);
        addForm.reset();
        loadInventory();
      })
      .catch(err => console.error("Error adding product:", err));
    });

    loadInventory();
  }

  /* ================= CHECKOUT PAGE ================= */
  const checkoutForm = document.getElementById("checkoutForm");
  if (checkoutForm) {
    const productInput = document.getElementById("productInput");
    const productsList = document.getElementById("productsList");
    const productPrice = document.getElementById("productPrice");
    const availableQty = document.getElementById("availableQty");
    const sellQty = document.getElementById("sellQty");
    const customerInput = document.getElementById("customerName");
    const addToCartBtn = document.getElementById("addToCartBtn");
    const cartContainer = document.getElementById("cartContainer");
    const totalAmountEl = document.getElementById("totalAmount");

    const receiptPopup = document.getElementById("receiptPopup");
    const receiptCustomer = document.getElementById("receiptCustomer");
    const receiptDate = document.getElementById("receiptDate");
    const receiptItems = document.getElementById("receiptItems");
    const receiptCloseBtn = document.getElementById("closeReceiptBtn");

    let inventory = [];
    let cart = [];

    async function loadInventoryCheckout() {
      try {
        const res = await fetch("/inventory");
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Inventory not an array");

        inventory = data.map(i => ({
          ...i,
          price: Number(i.price),
          quantity: Number(i.quantity),
          cost: Number(i.cost)
        }));

        productsList.innerHTML = "";
        inventory.forEach(i => {
          const option = document.createElement("option");
          option.value = i.name;
          productsList.appendChild(option);
        });

        updateProductDetails();
      } catch (err) {
        console.error("Error loading inventory:", err);
      }
    }

    function updateProductDetails() {
      const product = inventory.find(p => p.name === productInput.value);
      if (product) {
        productPrice.textContent = Number(product.price).toFixed(2);
        availableQty.textContent = Number(product.quantity);
        sellQty.max = product.quantity;
        sellQty.value = "";
      } else {
        productPrice.textContent = "0.00";
        availableQty.textContent = "0";
        sellQty.max = 0;
        sellQty.value = "";
      }
    }

    productInput.addEventListener("input", updateProductDetails);

    addToCartBtn.addEventListener("click", () => {
      const product = inventory.find(p => p.name === productInput.value);
      const qty = Number(sellQty.value);

      if (!product) return alert("Select a valid product");
      if (!qty || qty <= 0 || qty > product.quantity) return alert("Invalid quantity");

      cart.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: qty
      });

      productInput.value = "";
      sellQty.value = "";
      updateProductDetails();
      renderCart();
    });

    function renderCart() {
      if (!cartContainer) return;
      cartContainer.innerHTML = "";
      if (!cart.length) {
        cartContainer.innerHTML = "<p style='color:#fff;text-align:center;'>Cart is empty.</p>";
        totalAmountEl.textContent = "0.00";
        return;
      }

      let total = 0;
      const table = document.createElement("table");
      table.innerHTML = `
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
            <th>Action</th>
          </tr>
        </thead>
      `;
      const tbody = document.createElement("tbody");

      cart.forEach((item, idx) => {
        const itemTotal = Number(item.price) * Number(item.quantity);
        total += itemTotal;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>KES ${Number(item.price).toFixed(2)}</td>
          <td>KES ${itemTotal.toFixed(2)}</td>
          <td><button class="remove-btn">✕</button></td>
        `;
        tr.querySelector(".remove-btn").addEventListener("click", () => {
          cart.splice(idx, 1);
          renderCart();
        });
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      cartContainer.appendChild(table);
      totalAmountEl.textContent = total.toFixed(2);
    }

    checkoutForm.addEventListener("submit", async e => {
      e.preventDefault();

      if (!customerInput.value.trim()) return alert("Enter customer name");
      if (!cart.length) return alert("Cart is empty");

      const saleData = {
        customer: customerInput.value.trim(),
        items: cart.map(i => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity
        }))
      };

      try {
        const res = await fetch("/sale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saleData)
        });

        const data = await res.json();
        if (!res.ok) return alert(data.error || "Sale failed");

        const sale = data.sale;
        sale.items = saleData.items; // ensure items are available for receipt
        showReceipt(sale);

        cart = [];
        renderCart();
        checkoutForm.reset();
        loadInventoryCheckout();
      } catch (err) {
        console.error("Error completing sale:", err);
        alert("Sale could not be completed");
      }
    });

    function showReceipt(sale) {
      if (!sale) return;

      receiptCustomer.textContent = sale.customer || "";
      receiptDate.textContent = new Date(sale.sold_at || sale.soldAt || Date.now()).toLocaleString();
      receiptItems.innerHTML = "";

      let total = 0;
      sale.items.forEach(item => {
        const itemTotal = Number(item.price) * Number(item.quantity);
        total += itemTotal;

        receiptItems.innerHTML += `
          <tr>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>KES ${Number(item.price).toFixed(2)}</td>
            <td>KES ${itemTotal.toFixed(2)}</td>
          </tr>
        `;
      });

      receiptPopup.style.display = "block";
      setTimeout(() => window.print(), 200);
    }

    receiptCloseBtn?.addEventListener("click", () => {
      receiptPopup.style.display = "none";
    });

    loadInventoryCheckout();
    renderCart();
  }

});
