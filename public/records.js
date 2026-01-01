document.addEventListener("DOMContentLoaded", () => {
  const datePicker = document.getElementById("datePicker");
  const customerSearchInput = document.getElementById("customerSearchInput");
  const searchBtn = document.getElementById("searchBtn");
  const resetBtn = document.getElementById("resetBtn");
  const salesDataEl = document.getElementById("salesData");
  const totalProfitEl = document.getElementById("totalProfit");

  let allSales = [];

  // Load sales from server
  async function loadSales() {
    try {
      const res = await fetch("/sales");
      const sales = await res.json();
      allSales = sales;
      renderSales(allSales);
    } catch (err) {
      console.error("Error fetching sales:", err);
    }
  }

  // Render sales grouped by date
  function renderSales(sales) {
    salesDataEl.innerHTML = "";
    if (!sales.length) {
      salesDataEl.innerHTML = "<tr><td colspan='5'>No sales found.</td></tr>";
      totalProfitEl.textContent = "Total Profit: KES 0.00";
      return;
    }

    // Group sales by date
    const grouped = {};
    let overallProfit = 0;

    sales.forEach(sale => {
      const dateKey = new Date(sale.soldAt).toISOString().split("T")[0];
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(sale);
      overallProfit += sale.profit;
    });

    // Render each day
    Object.keys(grouped).sort().forEach(date => {
      const daySales = grouped[date];

      // Calculate totals for the day
      const dayTotalSale = daySales.reduce((sum, s) => sum + s.total, 0);
      const dayProfit = daySales.reduce((sum, s) => sum + s.profit, 0);

      // Day header row
      const dayHeader = document.createElement("tr");
      dayHeader.innerHTML = `
        <td colspan="3" style="font-weight:bold; background:#eee;">${date}</td>
        <td style="font-weight:bold; background:#eee;">${dayTotalSale.toFixed(2)}</td>
        <td style="font-weight:bold; background:#eee;">${dayProfit.toFixed(2)}</td>
      `;
      salesDataEl.appendChild(dayHeader);

      // Individual sales for that day
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

  // Filter sales by date or customer
  function filterSales() {
    const dateValue = datePicker.value;
    const customerValue = customerSearchInput.value.trim().toLowerCase();

    let filtered = allSales;

    if (dateValue) {
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.soldAt).toISOString().split("T")[0];
        return saleDate === dateValue;
      });
    }

    if (customerValue) {
      filtered = filtered.filter(sale =>
        sale.customer.toLowerCase().includes(customerValue)
      );
    }

    renderSales(filtered);
  }

  searchBtn?.addEventListener("click", filterSales);
  resetBtn?.addEventListener("click", () => {
    datePicker.value = "";
    customerSearchInput.value = "";
    renderSales(allSales);
  });

  loadSales();
});
