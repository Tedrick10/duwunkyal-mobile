import { eq, desc, and } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  categories,
  products,
  cartItems,
  orders,
  orderItems,
  wishlistItems,
  type User,
  type InsertUser,
  type Category,
  type InsertCategory,
  type Product,
  type InsertProduct,
  type CartItem,
  type InsertCartItem,
  type Order,
  type OrderItem,
  type WishlistItem,
} from "@shared/schema";

export async function createUser(data: InsertUser & { password: string }): Promise<User> {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
}

export async function getUserById(id: number): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function getAllUsers(): Promise<User[]> {
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getCategories(): Promise<Category[]> {
  return db.select().from(categories).orderBy(categories.name);
}

export async function getCategoryById(id: number): Promise<Category | undefined> {
  const [cat] = await db.select().from(categories).where(eq(categories.id, id));
  return cat;
}

export async function createCategory(data: InsertCategory): Promise<Category> {
  const [cat] = await db.insert(categories).values(data).returning();
  return cat;
}

export async function updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category> {
  const [cat] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
  return cat;
}

export async function deleteCategory(id: number): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id));
}

export async function getProducts(): Promise<Product[]> {
  return db.select().from(products).orderBy(desc(products.createdAt));
}

export async function getProductById(id: number): Promise<Product | undefined> {
  const [product] = await db.select().from(products).where(eq(products.id, id));
  return product;
}

export async function getProductsByCategory(categoryId: number): Promise<Product[]> {
  return db.select().from(products).where(eq(products.categoryId, categoryId)).orderBy(desc(products.createdAt));
}

export async function getFeaturedProducts(): Promise<Product[]> {
  return db.select().from(products).where(eq(products.featured, true)).orderBy(desc(products.createdAt));
}

export async function createProduct(data: InsertProduct): Promise<Product> {
  const [product] = await db.insert(products).values(data).returning();
  return product;
}

export async function updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product> {
  const [product] = await db.update(products).set(data).where(eq(products.id, id)).returning();
  return product;
}

export async function deleteProduct(id: number): Promise<void> {
  await db.delete(products).where(eq(products.id, id));
}

export async function getCartItems(userId: number): Promise<(CartItem & { product: Product })[]> {
  const items = await db.select().from(cartItems).where(eq(cartItems.userId, userId)).orderBy(desc(cartItems.createdAt));
  const result: (CartItem & { product: Product })[] = [];
  for (const item of items) {
    const product = await getProductById(item.productId);
    if (product) {
      result.push({ ...item, product });
    }
  }
  return result;
}

export async function addToCart(userId: number, data: InsertCartItem): Promise<CartItem> {
  const [item] = await db.insert(cartItems).values({ ...data, userId }).returning();
  return item;
}

export async function updateCartItem(id: number, quantity: number): Promise<CartItem> {
  const [item] = await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id)).returning();
  return item;
}

export async function removeCartItem(id: number): Promise<void> {
  await db.delete(cartItems).where(eq(cartItems.id, id));
}

export async function clearCart(userId: number): Promise<void> {
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
}

export async function createOrder(
  userId: number,
  total: string,
  shippingAddress: string,
  items: { productId: number; quantity: number; price: string; size?: string; color?: string }[]
): Promise<Order> {
  const [order] = await db.insert(orders).values({ userId, total, shippingAddress, status: "pending" }).returning();
  for (const item of items) {
    await db.insert(orderItems).values({ orderId: order.id, ...item });
  }
  return order;
}

export async function getOrdersByUser(userId: number): Promise<Order[]> {
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function getAllOrders(): Promise<(Order & { user?: User })[]> {
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const result: (Order & { user?: User })[] = [];
  for (const order of allOrders) {
    const user = await getUserById(order.userId);
    result.push({ ...order, user });
  }
  return result;
}

export async function getOrderById(id: number): Promise<Order | undefined> {
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  return order;
}

export async function getOrderItems(orderId: number): Promise<(OrderItem & { product?: Product })[]> {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const result: (OrderItem & { product?: Product })[] = [];
  for (const item of items) {
    const product = await getProductById(item.productId);
    result.push({ ...item, product });
  }
  return result;
}

export async function updateOrderStatus(id: number, status: string): Promise<Order> {
  const [order] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
  return order;
}

export async function getWishlistItems(userId: number): Promise<(WishlistItem & { product: Product })[]> {
  const items = await db.select().from(wishlistItems).where(eq(wishlistItems.userId, userId)).orderBy(desc(wishlistItems.createdAt));
  const result: (WishlistItem & { product: Product })[] = [];
  for (const item of items) {
    const product = await getProductById(item.productId);
    if (product) {
      result.push({ ...item, product });
    }
  }
  return result;
}

export async function addToWishlist(userId: number, productId: number): Promise<WishlistItem> {
  const existing = await db.select().from(wishlistItems).where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
  if (existing.length > 0) return existing[0];
  const [item] = await db.insert(wishlistItems).values({ userId, productId }).returning();
  return item;
}

export async function removeFromWishlist(userId: number, productId: number): Promise<void> {
  await db.delete(wishlistItems).where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
}

export async function isInWishlist(userId: number, productId: number): Promise<boolean> {
  const items = await db.select().from(wishlistItems).where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)));
  return items.length > 0;
}

export async function getStats(): Promise<{ totalUsers: number; totalProducts: number; totalOrders: number; totalRevenue: number }> {
  const allUsers = await db.select().from(users);
  const allProducts = await db.select().from(products);
  const allOrders = await db.select().from(orders);
  const totalRevenue = allOrders.reduce((sum, o) => sum + parseFloat(o.total), 0);
  return {
    totalUsers: allUsers.length,
    totalProducts: allProducts.length,
    totalOrders: allOrders.length,
    totalRevenue,
  };
}
