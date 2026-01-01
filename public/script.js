document.addEventListener("DOMContentLoaded", () => {

  /* ===== LOGOUT BUTTON ===== */
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

  /* ===== INVENTORY PAGE ===== */
  const addForm = document.getElementById("addForm");
  if (addForm) {
    const tbody = document.querySelector("#inventoryTable tbody");

    async function loadInventory() {
      try {
        const res = await fetch("/inventory");
        const items = await res.json();
        renderInventory(items);
      } catch (err) {
        console.error("Error loading inventory:", err);
      }
    }

    function renderInventory(items) {
      tbody.innerHTML = "";
      items.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${item._id}</td>
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
      .then(loadInventory)
      .catch(err => console.error("Error updating product:", err));
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

      fetch("/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, cost, price, quantity })
      })
      .then(res => res.json())
      .then(() => {
        addForm.reset();
        loadInventory();
      })
      .catch(err => console.error("Error adding product:", err));
    });

    loadInventory();
  }

  /* ===== CHECKOUT PAGE ===== */
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
    const receiptTotal = document.getElementById("receiptTotal");
    const receiptCloseBtn = document.getElementById("closeReceiptBtn");

    let inventory = [];
    let cart = [];

    function loadInventory() {
      fetch("/inventory")
        .then(res => res.json())
        .then(data => {
          inventory = data;
          productsList.innerHTML = "";
          inventory.forEach(i => {
            const option = document.createElement("option");
            option.value = i.name;
            productsList.appendChild(option);
          });
          updateProductDetails();
        })
        .catch(err => console.error("Error loading inventory:", err));
    }

    function updateProductDetails() {
      const product = inventory.find(p => p.name === productInput.value);
      if (product) {
        productPrice.textContent = product.price.toFixed(2);
        availableQty.textContent = product.quantity;
        sellQty.max = product.quantity;
      } else {
        productPrice.textContent = "0.00";
        availableQty.textContent = "0";
        sellQty.max = 0;
      }
    }

    productInput.addEventListener("input", updateProductDetails);

    addToCartBtn.addEventListener("click", () => {
      const product = inventory.find(p => p.name === productInput.value);
      const qty = Number(sellQty.value);

      if (!product) return alert("Select a valid product");
      if (qty <= 0 || qty > product.quantity) return alert("Invalid quantity");

      const existing = cart.find(i => i.productId === product._id);
      if (existing) {
        existing.quantity += qty;
      } else {
        cart.push({
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: qty
        });
      }

      productInput.value = "";
      sellQty.value = "";
      updateProductDetails();
      renderCart();
    });

    function renderCart() {
      cartContainer.innerHTML = "";
      if (!cart.length) {
        cartContainer.innerHTML = "<p>Cart is empty.</p>";
        totalAmountEl.textContent = "0.00";
        return;
      }

      let total = 0;
      const table = document.createElement("table");
      table.innerHTML = `
        <thead>
          <tr>
            <th>Product</th><th>Qty</th><th>Price</th><th>Total</th><th></th>
          </tr>
        </thead>
      `;
      const tbody = document.createElement("tbody");

      cart.forEach((item, idx) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>KES ${item.price.toFixed(2)}</td>
          <td>KES ${itemTotal.toFixed(2)}</td>
          <td><button class="remove-btn">✕</button></td>
        `;
        tr.querySelector(".remove-btn").onclick = () => {
          cart.splice(idx, 1);
          renderCart();
        };
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      cartContainer.appendChild(table);
      totalAmountEl.textContent = total.toFixed(2);
    }

    checkoutForm.addEventListener("submit", e => {
      e.preventDefault();
      if (!customerInput.value.trim()) return alert("Enter customer name");
      if (!cart.length) return alert("Cart is empty");

      const saleData = {
        customer: customerInput.value.trim(),
        items: cart.map(i => ({ productId: i.productId, quantity: i.quantity }))
      };

      fetch("/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData)
      })
      .then(res => res.json())
      .then(data => {
        if (data.error) return alert(data.error);
        showReceipt(data.sale);
        cart = [];
        renderCart();
        checkoutForm.reset();
        loadInventory();
      })
      .catch(err => console.error("Error completing sale:", err));
    });

    function showReceipt(sale) {
      if (!sale) return;
      receiptCustomer.textContent = sale.customer || "";
      receiptDate.textContent = new Date(sale.soldAt).toLocaleString();
      receiptItems.innerHTML = "";

      let total = 0;
      sale.items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        receiptItems.innerHTML += `
          <tr>
            <td>${item.product}</td>
            <td>${item.quantity}</td>
            <td>KES ${item.price.toFixed(2)}</td>
            <td>KES ${itemTotal.toFixed(2)}</td>
          </tr>
        `;
      });

      receiptTotal.textContent = total.toFixed(2);
      receiptPopup.style.display = "block";
      setTimeout(() => window.print(), 200);
    }

    receiptCloseBtn?.addEventListener("click", () => {
      receiptPopup.style.display = "none";
    });

    loadInventory();
    renderCart();
  }

  /* ===== RECORDS PAGE ===== */
  const salesDataEl = document.getElementById("salesData");
  if (salesDataEl) {
    const datePickerR = document.getElementById("datePicker");
    const customerSearchInputR = document.getElementById("customerSearchInput");
    const searchBtnR = document.getElementById("searchBtn");
    const resetBtnR = document.getElementById("resetBtn");
    const totalProfitEl = document.getElementById("totalProfit");

    let allSales = [];

    async function loadSales() {
      try {
        const res = await fetch("/sales");
        allSales = await res.json();
        renderSales(allSales);
      } catch (err) {
        console.error("Error fetching sales:", err);
      }
    }

    function renderSales(sales) {
      salesDataEl.innerHTML = "";
      if (!sales.length) {
        salesDataEl.innerHTML = "<tr><td colspan='5'>No sales found.</td></tr>";
        totalProfitEl.textContent = "Total Profit: KES 0.00";
        return;
      }

      const grouped = {};
      let overallProfit = 0;
      sales.forEach(sale => {
        const dateKey = new Date(sale.soldAt).toISOString().split("T")[0];
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(sale);
        overallProfit += sale.profit;
      });

      Object.keys(grouped).sort().forEach(date => {
        const daySales = grouped[date];
        const dayTotalSale = daySales.reduce((sum, s) => sum + s.total, 0);
        const dayProfit = daySales.reduce((sum, s) => sum + s.profit, 0);

        const dayHeader = document.createElement("tr");
        dayHeader.innerHTML = `
          <td colspan="3" class="day-header">${date}</td>
          <td>${dayTotalSale.toFixed(2)}</td>
          <td>${dayProfit.toFixed(2)}</td>
        `;
        salesDataEl.appendChild(dayHeader);

        daySales.forEach(sale => {
          const tr = document.createElement("tr");
          const productsList = sale.items.map(i => `${i.product} (x${i.quantity})`).join(", ");
          tr.innerHTML = `
            <td>${new Date(sale.soldAt).toLocaleTimeString()}</td>
            <td>${sale.customer}</td>
            <td>${productsList}</td>
            <td>${sale.total.toFixed(2)}</td>
            <td>${sale.profit.toFixed(2)}</td>
          `;
          salesDataEl.appendChild(tr);
        });
      });

      totalProfitEl.textContent = `Total Profit: KES ${overallProfit.toFixed(2)}`;
    }

    function filterSales() {
      const dateValue = datePickerR.value;
      const customerValue = customerSearchInputR.value.trim().toLowerCase();

      let filtered = allSales;
      if (dateValue) filtered = filtered.filter(sale => sale.soldAt.slice(0, 10) === dateValue);
      if (customerValue) filtered = filtered.filter(sale => sale.customer.toLowerCase().includes(customerValue));

      renderSales(filtered);
    }

    searchBtnR?.addEventListener("click", filterSales);
    resetBtnR?.addEventListener("click", () => {
      datePickerR.value = "";
      customerSearchInputR.value = "";
      renderSales(allSales);
    });

    loadSales();
  }

  /* ===== SALES PAGE ===== */
  const salesContainer = document.getElementById("salesContainer");
  if (salesContainer) {
    const datePickerS = document.getElementById("datePicker");
    const customerSearchInputS = document.getElementById("customerSearchInput");
    const searchBtnS = document.getElementById("searchBtn");
    const resetBtnS = document.getElementById("resetBtn");

    let allSales = [];
    if (datePickerS) datePickerS.valueAsDate = new Date();

    function loadSales() {
      fetch("/sales")
        .then(res => res.json())
        .then(data => {
          allSales = data.sort((a, b) => new Date(b.soldAt) - new Date(a.soldAt));
          filterAndRender();
        })
        .catch(err => console.error("Error loading sales:", err));
    }

    function filterSalesByDate(sales, dateStr) {
      if (!dateStr) return sales;
      return sales.filter(sale => sale.soldAt && sale.soldAt.slice(0, 10) === dateStr);
    }

    function renderSales(sales) {
      salesContainer.innerHTML = "";
      if (!sales.length) {
        salesContainer.innerHTML = "<p>No sales found.</p>";
        return;
      }

      sales.forEach(sale => {
        let saleTotal = 0;
        let itemsHTML = "";
        sale.items.forEach(item => {
          const qty = Number(item.quantity) || 0;
          const price = Number(item.price) || 0;
          const total = qty * price;
          saleTotal += total;
          itemsHTML += `
            <tr>
              <td>${item.product}</td>
              <td>${qty}</td>
              <td>KES ${price.toFixed(2)}</td>
              <td>KES ${total.toFixed(2)}</td>
            </tr>
          `;
        });

        const div = document.createElement("div");
        div.className = "sale-card";
        div.innerHTML = `
          <h3>Customer: ${sale.customer}</h3>
          <p>Date: ${new Date(sale.soldAt).toLocaleString()}</p>
          <table class="sales-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
          </table>
          <p><strong>Sale Total:</strong> KES ${saleTotal.toFixed(2)}</p>
        `;
        salesContainer.appendChild(div);
      });
    }

    function filterAndRender() {
      let filtered = filterSalesByDate(allSales, datePickerS.value);
      const query = customerSearchInputS.value.trim().toLowerCase();
      if (query) filtered = filtered.filter(s => (s.customer || "").toLowerCase().includes(query));
      renderSales(filtered);
    }

    datePickerS.addEventListener("change", filterAndRender);
    searchBtnS.addEventListener("click", filterAndRender);
    resetBtnS.addEventListener("click", () => {
      customerSearchInputS.value = "";
      filterAndRender();
    });

    loadSales();
  }

});
