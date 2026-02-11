import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, categories, products, cartItems, orders, orderItems, wishlistItems } from "@shared/schema";
import {
  CATEGORIES,
  PRODUCTS,
  INITIAL_CART,
  INITIAL_ORDERS,
  INITIAL_WISHLIST,
  DUMMY_USER,
} from "../lib/dummy-data";

async function seed() {
  console.log("Seeding database with dummy data...");

  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) {
    console.log("Database already seeded, skipping...");
    process.exit(0);
  }

  // 1. Users: Dummy user first (id=1), then Admin
  const dummyPassword = await bcrypt.hash("user123", 10);
  await db.insert(users).values({
    email: DUMMY_USER.email,
    password: dummyPassword,
    name: DUMMY_USER.name,
    phone: DUMMY_USER.phone,
    address: DUMMY_USER.address,
    isAdmin: false,
  });

  const adminPassword = await bcrypt.hash("admin123", 10);
  await db.insert(users).values({
    email: "admin@store.com",
    password: adminPassword,
    name: "Admin",
    isAdmin: true,
  });

  // 2. Categories (same order as dummy-data for id mapping)
  for (const cat of CATEGORIES) {
    await db.insert(categories).values({
      name: cat.name,
      image: cat.image,
    });
  }

  // 3. Products (categoryId 1-6 maps to inserted categories)
  for (const p of PRODUCTS) {
    await db.insert(products).values({
      name: p.name,
      description: p.description,
      price: p.price,
      image: p.image,
      imageBack: p.imageBack,
      categoryId: p.categoryId,
      sizes: p.sizes,
      colors: p.colors,
      stock: p.stock,
      featured: p.featured,
    });
  }

  // 4. Cart items for user 1
  for (const item of INITIAL_CART) {
    await db.insert(cartItems).values({
      userId: 1,
      productId: item.productId,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
    });
  }

  // 5. Orders and order items for user 1
  for (const order of INITIAL_ORDERS) {
    const [insertedOrder] = await db
      .insert(orders)
      .values({
        userId: 1,
        total: order.total,
        status: order.status,
        shippingAddress: order.shippingAddress,
      })
      .returning();
    if (insertedOrder) {
      for (const oi of order.items) {
        await db.insert(orderItems).values({
          orderId: insertedOrder.id,
          productId: oi.productId,
          quantity: oi.quantity,
          price: oi.price,
          size: oi.size,
          color: oi.color,
        });
      }
    }
  }

  // 6. Wishlist items for user 1
  for (const item of INITIAL_WISHLIST) {
    await db.insert(wishlistItems).values({
      userId: 1,
      productId: item.productId,
    });
  }

  console.log("Seeding complete!");
  console.log("  - Users: Style User (user@duwunkyal.com / user123), Admin (admin@store.com / admin123)");
  console.log("  - Categories:", CATEGORIES.length);
  console.log("  - Products:", PRODUCTS.length);
  console.log("  - Cart items:", INITIAL_CART.length);
  console.log("  - Orders:", INITIAL_ORDERS.length);
  console.log("  - Wishlist items:", INITIAL_WISHLIST.length);
  process.exit(0);
}

seed().catch(console.error);
