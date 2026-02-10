import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { pool } from "./db";
import * as storage from "./storage";
import {
  insertUserSchema,
  loginSchema,
  insertCategorySchema,
  insertProductSchema,
  insertCartItemSchema,
  insertOrderSchema,
} from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

async function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const user = await storage.getUserById(req.session.userId);
  if (!user?.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  const PgStore = connectPg(session);
  app.use(
    session({
      store: new PgStore({ pool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "garment-shop-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "none",
      },
    })
  );

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByEmail(parsed.email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }
      const hashedPassword = await bcrypt.hash(parsed.password, 10);
      const user = await storage.createUser({ ...parsed, password: hashedPassword });
      req.session.userId = user.id;
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(parsed.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const valid = await bcrypt.compare(parsed.password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      req.session.userId = user.id;
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Login failed" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/categories", async (_req: Request, res: Response) => {
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.get("/api/products", async (_req: Request, res: Response) => {
    const prods = await storage.getProducts();
    res.json(prods);
  });

  app.get("/api/products/featured", async (_req: Request, res: Response) => {
    const prods = await storage.getFeaturedProducts();
    res.json(prods);
  });

  app.get("/api/products/category/:categoryId", async (req: Request, res: Response) => {
    const prods = await storage.getProductsByCategory(parseInt(req.params.categoryId));
    res.json(prods);
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    const product = await storage.getProductById(parseInt(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.get("/api/cart", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getCartItems(req.session.userId!);
    res.json(items);
  });

  app.post("/api/cart", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = insertCartItemSchema.parse(req.body);
      const item = await storage.addToCart(req.session.userId!, parsed);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/cart/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { quantity } = req.body;
      const item = await storage.updateCartItem(parseInt(req.params.id), quantity);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/cart/:id", requireAuth, async (req: Request, res: Response) => {
    await storage.removeCartItem(parseInt(req.params.id));
    res.json({ message: "Removed" });
  });

  app.post("/api/orders", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = insertOrderSchema.parse(req.body);
      const cartItems = await storage.getCartItems(req.session.userId!);
      if (cartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }
      const total = cartItems.reduce((sum, item) => sum + parseFloat(item.product.price) * item.quantity, 0);
      const orderItemsData = cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.product.price,
        size: item.size || undefined,
        color: item.color || undefined,
      }));
      const order = await storage.createOrder(req.session.userId!, total.toFixed(2), parsed.shippingAddress, orderItemsData);
      await storage.clearCart(req.session.userId!);
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/orders", requireAuth, async (req: Request, res: Response) => {
    const userOrders = await storage.getOrdersByUser(req.session.userId!);
    res.json(userOrders);
  });

  app.get("/api/orders/:id", requireAuth, async (req: Request, res: Response) => {
    const order = await storage.getOrderById(parseInt(req.params.id));
    if (!order) return res.status(404).json({ message: "Order not found" });
    const items = await storage.getOrderItems(order.id);
    res.json({ ...order, items });
  });

  app.get("/api/admin/stats", requireAdmin, async (_req: Request, res: Response) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.get("/api/admin/users", requireAdmin, async (_req: Request, res: Response) => {
    const allUsers = await storage.getAllUsers();
    res.json(allUsers.map(({ password, ...u }) => u));
  });

  app.get("/api/admin/orders", requireAdmin, async (_req: Request, res: Response) => {
    const allOrders = await storage.getAllOrders();
    res.json(allOrders.map((o) => ({ ...o, user: o.user ? { id: o.user.id, name: o.user.name, email: o.user.email } : null })));
  });

  app.put("/api/admin/orders/:id/status", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const order = await storage.updateOrderStatus(parseInt(req.params.id), status);
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/admin/categories", requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = insertCategorySchema.parse(req.body);
      const cat = await storage.createCategory(parsed);
      res.json(cat);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/categories/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const cat = await storage.updateCategory(parseInt(req.params.id), req.body);
      res.json(cat);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/categories/:id", requireAdmin, async (req: Request, res: Response) => {
    await storage.deleteCategory(parseInt(req.params.id));
    res.json({ message: "Deleted" });
  });

  app.post("/api/admin/products", requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(parsed);
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/products/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const product = await storage.updateProduct(parseInt(req.params.id), req.body);
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/admin/products/:id", requireAdmin, async (req: Request, res: Response) => {
    await storage.deleteProduct(parseInt(req.params.id));
    res.json({ message: "Deleted" });
  });

  app.get("/api/wishlist", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getWishlistItems(req.session.userId!);
    res.json(items);
  });

  app.get("/api/wishlist/check/:productId", requireAuth, async (req: Request, res: Response) => {
    const inWishlist = await storage.isInWishlist(req.session.userId!, parseInt(req.params.productId));
    res.json({ inWishlist });
  });

  app.post("/api/wishlist", requireAuth, async (req: Request, res: Response) => {
    try {
      const { productId } = req.body;
      const item = await storage.addToWishlist(req.session.userId!, productId);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/wishlist/:productId", requireAuth, async (req: Request, res: Response) => {
    await storage.removeFromWishlist(req.session.userId!, parseInt(req.params.productId));
    res.json({ message: "Removed" });
  });

  app.get("/admin", (_req: Request, res: Response) => {
    res.sendFile("admin.html", { root: "server/templates" });
  });

  app.get("/customize/:id", (_req: Request, res: Response) => {
    res.sendFile("customize.html", { root: "server/templates" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
