document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addForm");

  /* ===== Load Inventory ===== */
  function loadInventory() {
    fetch("/inventory")
      .then(res => res.json())
      .then(renderInventory)
      .catch(err => console.error("Error loading inventory:", err));
  }

  /* ===== Render Inventory Table ===== */
  function renderInventory(items) {
    const tbody = document.querySelector("#inventoryTable tbody");
    tbody.innerHTML = "";  // Clear the current table

    items.forEach(item => {
      const price = Number(item.price || 0);
      const cost = Number(item.cost || 0);
      const quantity = Number(item.quantity || 0);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item._id}</td>
        <td>${item.name}</td>
        <td>KES ${cost.toFixed(2)}</td>
        <td>KES ${price.toFixed(2)}</td>
        <td>${quantity}</td>
        <td><button class="edit-btn">Edit</button></td>
      `;

      // Append the row to the table body
      tbody.appendChild(tr);

      // Add an event listener to the edit button
      tr.querySelector(".edit-btn").addEventListener("click", () => editProduct(item));
    });
  }

  /* ===== Edit Product ===== */
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
        cost: Number(newCost),  // Ensure the correct type
        price: Number(newPrice),
        quantity: Number(newQty)
      })
    })
      .then(res => res.json())
      .then(loadInventory)
      .catch(err => console.error("Error updating product:", err));
  }

  /* ===== Add Product Form Submission ===== */
  form.addEventListener("submit", e => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const cost = Number(document.getElementById("costPrice").value);
    const price = Number(document.getElementById("price").value);
    const quantity = Number(document.getElementById("quantity").value);

    // Basic form validation
    if (!name) return alert("Enter product name");
    if (isNaN(cost) || cost < 0) return alert("Invalid cost price");
    if (isNaN(price) || price < 0) return alert("Invalid selling price");
    if (isNaN(quantity) || quantity < 0) return alert("Invalid quantity");

    // POST the new product to the server
    fetch("/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        cost,     // Send as number, matches backend expectation
        price,
        quantity
      })
    })
      .then(res => res.json())
      .then(() => {
        form.reset();  // Reset the form
        loadInventory();  // Reload inventory
      })
      .catch(err => console.error("Error adding product:", err));
  });

  // Load inventory on initial page load
  loadInventory();
});
