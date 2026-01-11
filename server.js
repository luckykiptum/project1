// server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

/* ================= PostgreSQL / Supabase ================= */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.connect()
  .then(() => console.log("✅ Connected to Supabase/PostgreSQL"))
  .catch(err => console.error("❌ Supabase error:", err));

/* ================= Middleware ================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    name: "lubren.sid",
    secret: process.env.SESSION_SECRET || "fallback_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true }
  })
);

/* ================= Admin Credentials ================= */
const adminCredentials = {
  username: process.env.ADMIN_USER || "nerbul",
  password: process.env.ADMIN_PASS || "brenluck7968"
};

/* ================= Auth Middleware ================= */
function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) return next();
  return res.redirect("/admin-login");
}

/* ================= ROUTES ================= */

/* ROOT → LOGIN OR INVENTORY */
app.get("/", (req, res) => {
  if (req.session.isAuthenticated) return res.redirect("/inventory-page");
  res.redirect("/admin-login");
});

/* LOGIN PAGE */
app.get("/admin-login", (req, res) => {
  if (req.session.isAuthenticated) return res.redirect("/inventory-page");
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

/* LOGIN HANDLER */
app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;
  if (username === adminCredentials.username && password === adminCredentials.password) {
    req.session.isAuthenticated = true;
    return res.json({ success: true });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

/* LOGOUT */
app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("lubren.sid");
    res.json({ success: true });
  });
});

/* INVENTORY PAGE (PROTECTED) */
app.get("/inventory-page", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "inventory.html"));
});

/* ================= INVENTORY API ================= */

/* GET ALL PRODUCTS */
app.get("/inventory", isAuthenticated, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM inventory ORDER BY id ASC");
    const inventory = rows.map(r => ({
      _id: r.id,
      name: r.name,
      cost: Number(r.cost),
      price: Number(r.price),
      quantity: Number(r.quantity)
    }));
    res.json(inventory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

/* ADD NEW PRODUCT */
app.post("/inventory", isAuthenticated, async (req, res) => {
  const { name, cost, price, quantity } = req.body;
  if (!name || cost == null || price == null || quantity == null) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const duplicateCheck = await pool.query(
      "SELECT * FROM inventory WHERE LOWER(name) = LOWER($1)",
      [name]
    );
    if (duplicateCheck.rows.length) {
      return res.status(400).json({ error: "Product already exists" });
    }

    const { rows } = await pool.query(
      "INSERT INTO inventory (name, cost, price, quantity) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, cost, price, quantity]
    );

    res.json({
      _id: rows[0].id,
      name: rows[0].name,
      cost: Number(rows[0].cost),
      price: Number(rows[0].price),
      quantity: rows[0].quantity
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add product" });
  }
});

/* UPDATE PRODUCT */
app.patch("/inventory/:id", isAuthenticated, async (req, res) => {
  const { id } = req.params;
  const { name, cost, price, quantity } = req.body;

  try {
    if (name) {
      const duplicateCheck = await pool.query(
        "SELECT * FROM inventory WHERE LOWER(name) = LOWER($1) AND id <> $2",
        [name, id]
      );
      if (duplicateCheck.rows.length) {
        return res.status(400).json({ error: "Another product with this name already exists" });
      }
    }

    const { rows } = await pool.query(
      "UPDATE inventory SET name=$1, cost=$2, price=$3, quantity=$4 WHERE id=$5 RETURNING *",
      [name, cost, price, quantity, id]
    );

    if (!rows[0]) return res.status(404).json({ error: "Product not found" });

    res.json({
      _id: rows[0].id,
      name: rows[0].name,
      cost: Number(rows[0].cost),
      price: Number(rows[0].price),
      quantity: rows[0].quantity
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

/* ================= SALES API ================= */

/* CREATE SALE */
app.post("/sale", isAuthenticated, async (req, res) => {
  const { customer, items } = req.body;
  if (!customer || !items?.length) return res.status(400).json({ error: "Invalid sale data" });

  try {
    let total = 0, profit = 0;

    // Validate inventory & calculate totals
    for (const item of items) {
      const { rows } = await pool.query("SELECT * FROM inventory WHERE id=$1", [item.productId]);
      const product = rows[0];
      if (!product) return res.status(400).json({ error: `Product ${item.name} not found` });
      if (item.quantity > product.quantity) return res.status(400).json({ error: `Not enough stock for ${item.name}` });

      total += item.price * item.quantity;
      profit += (item.price - product.cost) * item.quantity;
      item.cost = product.cost;
    }

    // Insert sale
    const { rows: saleRows } = await pool.query(
      "INSERT INTO sales (customer, total, profit) VALUES ($1, $2, $3) RETURNING *",
      [customer, total, profit]
    );
    const sale = saleRows[0];

    // Insert sale items and update inventory
    for (const item of items) {
      await pool.query(
        "INSERT INTO sale_items (sale_id, product, quantity, price, cost, total, profit) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [sale.id, item.name, item.quantity, item.price, item.cost, item.price * item.quantity, (item.price - item.cost) * item.quantity]
      );

      await pool.query(
        "UPDATE inventory SET quantity = quantity - $1 WHERE id = $2",
        [item.quantity, item.productId]
      );
    }

    // Fetch sale items for response
    const { rows: saleItems } = await pool.query(
      "SELECT product, quantity, price, total, profit FROM sale_items WHERE sale_id=$1",
      [sale.id]
    );

    // Map to proper types
    const itemsMapped = saleItems.map(i => ({
      product: i.product,
      quantity: Number(i.quantity),
      price: Number(i.price),
      total: Number(i.total),
      profit: Number(i.profit)
    }));

    res.json({ success: true, sale: { ...sale, items: itemsMapped, total: Number(sale.total), profit: Number(sale.profit) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sale failed" });
  }
});

/* GET SALES WITH ITEMS */
app.get("/sales", isAuthenticated, async (req, res) => {
  try {
    const { rows: sales } = await pool.query("SELECT * FROM sales ORDER BY sold_at DESC");

    // Attach sale_items to each sale
    const salesWithItems = await Promise.all(
      sales.map(async sale => {
        const { rows: items } = await pool.query(
          "SELECT product, quantity, price, cost, total, profit FROM sale_items WHERE sale_id=$1",
          [sale.id]
        );

        const itemsMapped = items.map(i => ({
          product: i.product,
          quantity: Number(i.quantity),
          price: Number(i.price),
          cost: Number(i.cost),
          total: Number(i.total),
          profit: Number(i.profit)
        }));

        return {
          ...sale,
          total: Number(sale.total),
          profit: Number(sale.profit),
          items: itemsMapped
        };
      })
    );

    res.json(salesWithItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

/* ================= START SERVER ================= */
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
