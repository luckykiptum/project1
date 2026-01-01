// server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

const inventorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, min: 0, required: true },
  cost: { type: Number, min: 0, required: true },
  quantity: { type: Number, min: 0, required: true }
});
const Inventory = mongoose.model("Inventory", inventorySchema);

const salesSchema = new mongoose.Schema({
  customer: { type: String, required: true },
  items: [
    {
      product: String,
      quantity: Number,
      price: Number,
      cost: Number,
      total: Number,
      profit: Number
    }
  ],
  total: Number,
  profit: Number,
  soldAt: { type: Date, default: Date.now }
});
const Sale = mongoose.model("Sale", salesSchema);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback_secret",
    resave: false,
    saveUninitialized: false
  })
);

const adminCredentials = {
  username: process.env.ADMIN_USER || "admin",
  password: process.env.ADMIN_PASS || "password"
};

function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) return next();
  return res.redirect("/admin-login");
}

app.get("/", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "inventory.html"));
});

app.get("/admin-login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

app.post("/admin-login", (req, res) => {
  const { username, password } = req.body;
  if (username === adminCredentials.username && password === adminCredentials.password) {
    req.session.isAuthenticated = true;
    return res.redirect("/");
  }
  res.redirect("/admin-login");
});

app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.json({ success: true });
  });
});

app.get("/inventory", isAuthenticated, async (req, res) => {
  try {
    const items = await Inventory.find();
    res.json(items);
  } catch {
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

app.post("/inventory", isAuthenticated, async (req, res) => {
  try {
    const item = new Inventory(req.body);
    await item.save();
    res.json(item);
  } catch {
    res.status(500).json({ error: "Failed to add product" });
  }
});

app.patch("/inventory/:id", isAuthenticated, async (req, res) => {
  try {
    const updated = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update product" });
  }
});

app.post("/sale", isAuthenticated, async (req, res) => {
  const { customer, items } = req.body;
  if (!customer || !items?.length) return res.status(400).json({ error: "Invalid sale data" });

  try {
    let total = 0;
    let profit = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await Inventory.findById(item.productId);
      if (!product || item.quantity <= 0 || item.quantity > product.quantity) {
        return res.status(400).json({ error: "Invalid stock quantity" });
      }

      product.quantity -= item.quantity;
      await product.save();

      const lineTotal = product.price * item.quantity;
      const lineProfit = (product.price - product.cost) * item.quantity;

      total += lineTotal;
      profit += lineProfit;

      saleItems.push({
        product: product.name,
        quantity: item.quantity,
        price: product.price,
        cost: product.cost,
        total: lineTotal,
        profit: lineProfit
      });
    }

    const sale = new Sale({ customer, items: saleItems, total, profit });
    await sale.save();
    res.json({ success: true, sale });
  } catch {
    res.status(500).json({ error: "Sale failed" });
  }
});

app.get("/sales", isAuthenticated, async (req, res) => {
  try {
    const sales = await Sale.find().sort({ soldAt: -1 });
    res.json(sales);
  } catch {
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
