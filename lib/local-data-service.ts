import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CATEGORIES,
  PRODUCTS,
  INITIAL_CART,
  INITIAL_ORDERS,
  INITIAL_WISHLIST,
  DUMMY_USER,
  type CartItemData,
  type OrderData,
  type WishlistItemData,
  type UserData,
  type Product,
  type Category,
} from "./dummy-data";
import type { CustomizationData } from "@/components/customize/types";

const STORAGE_KEYS = {
  CART: "@duwunkyaw_cart",
  ORDERS: "@duwunkyaw_orders",
  WISHLIST: "@duwunkyaw_wishlist",
  USER: "@duwunkyaw_user",
  LOGGED_IN: "@duwunkyaw_logged_in",
};

let _cart: CartItemData[] | null = null;
let _orders: OrderData[] | null = null;
let _wishlist: WishlistItemData[] | null = null;
let _nextCartId = 100;
let _nextOrderId = 100;
let _nextWishlistId = 100;

async function loadCart(): Promise<CartItemData[]> {
  if (_cart !== null) return _cart;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.CART);
    _cart = stored ? JSON.parse(stored) : [...INITIAL_CART];
  } catch {
    _cart = [...INITIAL_CART];
  }
  return _cart!;
}

async function saveCart() {
  if (_cart) await AsyncStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(_cart));
}

async function loadOrders(): Promise<OrderData[]> {
  if (_orders !== null) return _orders;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.ORDERS);
    _orders = stored ? JSON.parse(stored) : [...INITIAL_ORDERS];
  } catch {
    _orders = [...INITIAL_ORDERS];
  }
  return _orders!;
}

async function saveOrders() {
  if (_orders) await AsyncStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(_orders));
}

async function loadWishlist(): Promise<WishlistItemData[]> {
  if (_wishlist !== null) return _wishlist;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.WISHLIST);
    _wishlist = stored ? JSON.parse(stored) : [...INITIAL_WISHLIST];
  } catch {
    _wishlist = [...INITIAL_WISHLIST];
  }
  return _wishlist!;
}

async function saveWishlist() {
  if (_wishlist) await AsyncStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(_wishlist));
}

export const LocalDataService = {
  getCategories(): Category[] {
    return CATEGORIES;
  },

  getProducts(): Product[] {
    return PRODUCTS;
  },

  getFeaturedProducts(): Product[] {
    return PRODUCTS.filter((p) => p.featured);
  },

  getProductById(id: number): Product | undefined {
    return PRODUCTS.find((p) => p.id === id);
  },

  getProductsByCategory(categoryId: number): Product[] {
    return PRODUCTS.filter((p) => p.categoryId === categoryId);
  },

  getCategoryById(id: number): Category | undefined {
    return CATEGORIES.find((c) => c.id === id);
  },

  async getCart(): Promise<CartItemData[]> {
    return loadCart();
  },

  async addToCart(
    productId: number,
    quantity: number,
    size?: string,
    color?: string,
    customization?: CustomizationData | null,
    customPrice?: string | null
  ): Promise<CartItemData> {
    const cart = await loadCart();
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) throw new Error("Product not found");

    if (!customization) {
      const existing = cart.find(
        (item) =>
          !item.customization &&
          item.productId === productId &&
          item.size === (size || null) &&
          item.color === (color || null)
      );
      if (existing) {
        existing.quantity += quantity;
        await saveCart();
        return existing;
      }
    }

    const newItem: CartItemData = {
      id: _nextCartId++,
      userId: DUMMY_USER.id,
      productId,
      quantity,
      size: size || null,
      color: color || null,
      createdAt: new Date().toISOString(),
      product,
      ...(customization ? { customization, customPrice: customPrice ?? String(customization.totalPrice) } : {}),
    };
    cart.push(newItem);
    _cart = cart;
    await saveCart();
    return newItem;
  },

  async updateCartItem(id: number, quantity: number): Promise<void> {
    const cart = await loadCart();
    const item = cart.find((i) => i.id === id);
    if (item) {
      item.quantity = quantity;
      await saveCart();
    }
  },

  async removeCartItem(id: number): Promise<void> {
    const cart = await loadCart();
    _cart = cart.filter((i) => i.id !== id);
    await saveCart();
  },

  async getOrders(): Promise<OrderData[]> {
    return loadOrders();
  },

  async getOrderById(id: number): Promise<OrderData | undefined> {
    const orders = await loadOrders();
    return orders.find((o) => o.id === id);
  },

  async placeOrder(shippingAddress: string): Promise<OrderData> {
    const cart = await loadCart();
    if (cart.length === 0) throw new Error("Cart is empty");

    const total = cart.reduce(
      (sum, item) => sum + parseFloat(item.customPrice ?? item.product.price) * item.quantity,
      0
    );

    const order: OrderData = {
      id: _nextOrderId++,
      userId: DUMMY_USER.id,
      total: total.toFixed(2),
      status: "pending",
      shippingAddress,
      createdAt: new Date().toISOString(),
      items: cart.map((item, idx) => ({
        id: _nextOrderId * 100 + idx,
        orderId: _nextOrderId - 1,
        productId: item.productId,
        quantity: item.quantity,
        price: item.customPrice ?? item.product.price,
        size: item.size,
        color: item.color,
        product: item.product,
      })),
    };

    const orders = await loadOrders();
    orders.unshift(order);
    _orders = orders;
    await saveOrders();

    _cart = [];
    await saveCart();

    return order;
  },

  async getWishlist(): Promise<WishlistItemData[]> {
    return loadWishlist();
  },

  async isInWishlist(productId: number): Promise<boolean> {
    const wishlist = await loadWishlist();
    return wishlist.some((w) => w.productId === productId);
  },

  async addToWishlist(productId: number): Promise<void> {
    const wishlist = await loadWishlist();
    if (wishlist.some((w) => w.productId === productId)) return;
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;
    wishlist.push({
      id: _nextWishlistId++,
      userId: DUMMY_USER.id,
      productId,
      createdAt: new Date().toISOString(),
      product,
    });
    _wishlist = wishlist;
    await saveWishlist();
  },

  async removeFromWishlist(productId: number): Promise<void> {
    const wishlist = await loadWishlist();
    _wishlist = wishlist.filter((w) => w.productId !== productId);
    await saveWishlist();
  },

  getUser(): UserData {
    return DUMMY_USER;
  },

  async login(_email: string, _password: string): Promise<UserData> {
    return DUMMY_USER;
  },

  async register(_email: string, _password: string, _name: string, _phone?: string): Promise<UserData> {
    return DUMMY_USER;
  },
};
