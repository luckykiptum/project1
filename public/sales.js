document.addEventListener("DOMContentLoaded", () => {
  const salesContainer = document.getElementById("salesContainer");
  const datePicker = document.getElementById("datePicker");

  const customerSearchInput = document.getElementById("customerSearchInput");
  const searchBtn = document.getElementById("searchBtn");
  const resetBtn = document.getElementById("resetBtn");

  let allSales = [];

  // Set date picker to today
  datePicker.valueAsDate = new Date();

  // Load sales from server
  function loadSales() {
    fetch("/sales")
      .then(res => res.json())
      .then(data => {
        allSales = data.sort(
          (a, b) => new Date(b.soldAt) - new Date(a.soldAt)
        );
        filterAndRender();
      })
      .catch(err => console.error("Error loading sales:", err));
  }

  // Filter sales by date
  function filterSalesByDate(sales, dateStr) {
    if (!dateStr) return sales;
    return sales.filter(sale =>
      sale.soldAt && sale.soldAt.slice(0, 10) === dateStr
    );
  }

  // Render sales list
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

  // Filter by date and customer
  function filterAndRender() {
    let filtered = filterSalesByDate(allSales, datePicker.value);
    const query = customerSearchInput.value.trim().toLowerCase();

    if (query) {
      filtered = filtered.filter(s =>
        (s.customer || "").toLowerCase().includes(query)
      );
    }

    renderSales(filtered);
  }

  datePicker.addEventListener("change", filterAndRender);
  searchBtn.addEventListener("click", filterAndRender);
  resetBtn.addEventListener("click", () => {
    customerSearchInput.value = "";
    filterAndRender();
  });

  loadSales();
});
