import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CATEGORIES,
  PRODUCTS,
  INITIAL_CART,
  INITIAL_ORDERS,
  INITIAL_WISHLIST,
  type CartItemData,
  type OrderData,
  type WishlistItemData,
  type UserData,
  type Product,
  type Category,
} from "./dummy-data";
import type { CustomizationData } from "@/components/customize/types";
import { apiUrl, apiMobileUrl } from "@/lib/api-config";
import { triggerUnauthorized } from "@/lib/on-unauthorized";

const STORAGE_KEYS = {
  CART: "@duwunkyaw_cart",
  ORDERS: "@duwunkyaw_orders",
  WISHLIST: "@duwunkyaw_wishlist",
  USER: "@duwunkyaw_user",
  TOKEN: "@duwunkyaw_token",
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

async function getStoredUser(): Promise<UserData | null> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

async function setStoredUser(user: UserData | null): Promise<void> {
  if (user) {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  }
}

async function getStoredToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch {
    return null;
  }
}

async function setStoredToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
  }
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
    customPrice?: string | null,
    productOverride?: { id: number; name: string; price: string; image: string | null; imageBack?: string | null }
  ): Promise<CartItemData> {
    const user = await getStoredUser();
    if (!user) throw new Error("Please log in to add to cart");
    const cart = await loadCart();
    let product = PRODUCTS.find((p) => p.id === productId);
    if (productOverride) {
      product = {
        id: productOverride.id,
        name: productOverride.name,
        description: null,
        price: productOverride.price,
        image: productOverride.image,
        imageBack: productOverride.imageBack ?? productOverride.image,
        categoryId: product?.categoryId ?? null,
        sizes: product?.sizes ?? null,
        colors: product?.colors ?? null,
        stock: product?.stock ?? 0,
        featured: product?.featured ?? false,
        createdAt: product?.createdAt ?? new Date().toISOString(),
      };
    } else if (!product) {
      throw new Error("Product not found");
    }

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
        if (customPrice != null) existing.customPrice = customPrice;
        if (productOverride) existing.product = product;
        await saveCart();
        return existing;
      }
    }

    const newItem: CartItemData = {
      id: _nextCartId++,
      userId: user.id,
      productId,
      quantity,
      size: size || null,
      color: color || null,
      createdAt: new Date().toISOString(),
      product,
      ...(customization
        ? { customization, customPrice: customPrice ?? String(customization.totalPrice) }
        : customPrice != null
          ? { customPrice }
          : {}),
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
    const user = await getStoredUser();
    if (!user) throw new Error("Please log in to place an order");
    const cart = await loadCart();
    if (cart.length === 0) throw new Error("Cart is empty");

    const total = cart.reduce(
      (sum, item) => sum + parseFloat(item.customPrice ?? item.product.price) * item.quantity,
      0
    );

    const order: OrderData = {
      id: _nextOrderId++,
      userId: user.id,
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
    const user = await getStoredUser();
    if (!user) throw new Error("Please log in to add to wishlist");
    const wishlist = await loadWishlist();
    if (wishlist.some((w) => w.productId === productId)) return;
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;
    wishlist.push({
      id: _nextWishlistId++,
      userId: user.id,
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

  async getStoredUser(): Promise<UserData | null> {
    return getStoredUser();
  },

  async setStoredUser(user: UserData | null): Promise<void> {
    return setStoredUser(user);
  },

  async login(_phone: string, _password: string): Promise<UserData> {
    const url = apiMobileUrl("customerLogin");
    const headers: HeadersInit = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    const body = JSON.stringify({
      phone: _phone,
      password: _password,
    });
    const res = await fetch(url, { method: "POST", headers, body });
    const text = await res.text();
    if (!res.ok) {
      let msg = "Login failed.";
      try {
        if (text.trim().startsWith("<")) throw new Error("Server returned HTML");
        const data = JSON.parse(text);
        if (data.message) msg = data.message;
        else if (data.errors && typeof data.errors === "object") {
          const first = Object.values(data.errors as Record<string, string[]>)[0];
          msg = Array.isArray(first) ? first[0] : String(first);
        }
      } catch (e) {
        if (e instanceof SyntaxError || (e as Error).message === "Server returned HTML") {
          msg = "Invalid credentials or server error. Please try again.";
        } else if (text && !text.trim().startsWith("<")) msg = text;
      }
      throw new Error(msg);
    }
    if (text.trim().startsWith("<")) throw new Error("Invalid response from server.");
    const data = JSON.parse(text) as {
      user?: { id: number; name: string; email?: string | null; phone?: string | null; address?: string | null; photo_url?: string | null };
      customer?: { id: number; name: string; email?: string | null; phone: string | null; photo_url?: string | null };
      token?: string;
      access_token?: string;
    };
    const u = data.user ?? data.customer;
    if (!u) throw new Error("Invalid response from server.");
    const token = data.token ?? data.access_token ?? null;
    if (token) await setStoredToken(token);
    const user: UserData = {
      id: u.id,
      name: u.name ?? "",
      email: u.email ?? null,
      phone: u.phone ?? null,
      address: "address" in u ? (u.address ?? null) : null,
      isAdmin: false,
      photo_url: u.photo_url ?? null,
    };
    return user;
  },

  async register(
    _phone: string,
    _password: string,
    _passwordConfirmation: string,
    _name: string,
    _email?: string,
    _photoUri?: string
  ): Promise<UserData> {
    const url = apiMobileUrl("customerSignup");
    let res: Response;
    if (_photoUri) {
      const formData = new FormData();
      formData.append("name", _name);
      formData.append("phone", _phone.trim());
      formData.append("password", _password);
      formData.append("password_confirmation", _passwordConfirmation);
      if (_email?.trim()) formData.append("email", _email.trim());
      formData.append("photo", {
        uri: _photoUri,
        name: "photo.jpg",
        type: "image/jpeg",
      } as unknown as Blob);
      res = await fetch(url, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });
    } else {
      const headers: HeadersInit = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      const body = JSON.stringify({
        name: _name,
        phone: _phone.trim(),
        password: _password,
        password_confirmation: _passwordConfirmation,
        ...(_email?.trim() ? { email: _email.trim() } : {}),
      });
      res = await fetch(url, { method: "POST", headers, body });
    }
    const text = await res.text();
    if (!res.ok) {
      let msg = "Registration failed.";
      try {
        const data = JSON.parse(text);
        if (data.message) msg = data.message;
        else if (data.errors && typeof data.errors === "object") {
          const first = Object.values(data.errors as Record<string, string[]>)[0];
          msg = Array.isArray(first) ? first[0] : String(first);
        }
      } catch {
        if (text) msg = text;
      }
      throw new Error(msg);
    }
    const data = JSON.parse(text) as {
      message?: string;
      customer?: { id: number; name: string; email?: string | null; phone: string | null; photo_url?: string | null };
      token?: string;
      access_token?: string;
    };
    const customer = data.customer;
    if (!customer) throw new Error("Invalid response from server.");
    const token = data.token ?? data.access_token ?? null;
    if (token) await setStoredToken(token);
    const user: UserData = {
      id: customer.id,
      name: customer.name ?? "",
      email: customer.email ?? null,
      phone: customer.phone ?? null,
      address: null,
      isAdmin: false,
      photo_url: customer.photo_url ?? null,
    };
    return user;
  },

  async getStoredToken(): Promise<string | null> {
    return getStoredToken();
  },

  async setStoredToken(token: string | null): Promise<void> {
    return setStoredToken(token);
  },

  async updateCustomer(updates: {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    password_confirmation?: string;
    photoUri?: string;
  }): Promise<UserData> {
    const url = apiMobileUrl("customerUpdate");
    const token = await getStoredToken();
    let res: Response;
    if (updates.photoUri) {
      const formData = new FormData();
      formData.append("name", String(updates.name ?? ""));
      formData.append("email", String(updates.email ?? ""));
      formData.append("phone", String(updates.phone ?? ""));
      if (updates.password) {
        formData.append("password", updates.password);
        formData.append("password_confirmation", updates.password_confirmation ?? "");
      }
      formData.append("photo", {
        uri: updates.photoUri,
        name: "photo.jpg",
        type: "image/jpeg",
      } as unknown as Blob);
      formData.append("_method", "PATCH");
      res = await fetch(url, {
        method: "POST",
        headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
    } else {
      const headers: HeadersInit = {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const body = JSON.stringify({
        name: updates.name ?? "",
        email: updates.email ?? "",
        phone: updates.phone ?? "",
        ...(updates.password ? { password: updates.password, password_confirmation: updates.password_confirmation } : {}),
      });
      res = await fetch(url, { method: "PATCH", headers, body });
    }
    const text = await res.text();
    if (token && (res.status === 401 || res.status === 403)) {
      await triggerUnauthorized();
    }
    if (!res.ok) {
      let msg = "Update failed.";
      try {
        if (text.trim().startsWith("<")) throw new Error("Server returned HTML");
        const errData = JSON.parse(text) as { message?: string; errors?: Record<string, string[]> };
        if (errData.errors && typeof errData.errors === "object") {
          const all = Object.values(errData.errors).flat();
          msg = all.length > 0 ? all.join(" ") : (errData.message ?? msg);
        } else if (errData.message) {
          msg = errData.message;
        }
      } catch (e) {
        if (e instanceof SyntaxError || (e as Error).message === "Server returned HTML") {
          msg = "Invalid response. Please try again.";
        } else if (text && !text.trim().startsWith("<")) msg = text;
      }
      throw new Error(msg);
    }
    if (text.trim().startsWith("<")) throw new Error("Invalid response from server.");
    const data = JSON.parse(text) as {
      id?: number;
      name?: string;
      email?: string;
      phone?: string | null;
      photo_url?: string | null;
      user?: { id: number; name: string; email: string; phone?: string | null; address?: string | null; photo_url?: string | null };
      customer?: { id: number; name: string; email: string; phone: string | null; photo_url?: string | null };
    };
    const u = data.user ?? data.customer ?? (data.id ? data : null);
    if (!u || !u.id) throw new Error("Invalid response from server.");
    const user: UserData = {
      id: u.id,
      name: u.name ?? "",
      email: u.email ?? null,
      phone: u.phone ?? null,
      address: "address" in u ? (u.address ?? null) : null,
      isAdmin: false,
      photo_url: u.photo_url ?? null,
    };
    await setStoredUser(user);
    return user;
  },
};
