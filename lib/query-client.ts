import type { ImageSourcePropType } from "react-native";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { API_BASE_URL, apiMobileUrl } from "@/lib/api-config";
import { LocalDataService } from "./local-data-service";

export type CategoryItem = { id: number; name: string; slug: string; parent_id: number | null; image_url: string };

export type ProductListItem = {
  id: number;
  name: string;
  slug: string;
  category_id: number;
  category: { id: number; name: string; slug: string };
  image_url: string;
  price: number;
  sale_price: number | null;
  featured: boolean;
};

export type ProductDetailSize = { id: number; name: string };
export type ProductDetailColor = {
  id: number;
  color_id: number;
  name: string;
  hex: string;
  price_delta: number;
  image_url: string | null;
};
export type ProductDetail = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image_url: string;
  category_id: number;
  category: { id: number; name: string; slug: string };
  price: number;
  sale_price: number | null;
  rentals_price: number | null;
  wholesale_price: number | null;
  stock: number;
  featured: boolean;
  sizes: ProductDetailSize[];
  colors: ProductDetailColor[];
  model_3d_id: number | null;
};

const DEFAULT_PRODUCT_IMAGE = require("../assets/products/tshirt-default.png");

/** Color t-shirt images for product listings (random-looking but stable per product id). */
const PRODUCT_LISTING_IMAGES: ImageSourcePropType[] = [
  require("../assets/products/tshirt-color-white.png"),
  require("../assets/products/tshirt-color-black.png"),
  require("../assets/products/tshirt-color-green.png"),
  require("../assets/products/tshirt-color-blue.png"),
  require("../assets/products/tshirt-color-red.png"),
  require("../assets/products/tshirt-color-navy.png"),
  require("../assets/products/tshirt-color-yellow.png"),
  require("../assets/products/tshirt-color-pink.png"),
  require("../assets/products/tshirt-color-orange.png"),
  require("../assets/products/tshirt-color-grey.png"),
  require("../assets/products/tshirt-color-brown.png"),
];

/** Color names in same order as PRODUCT_LISTING_IMAGES (for default selection on product details). */
const LISTING_COLOR_NAMES = [
  "White", "Black", "Green", "Blue", "Red", "Navy", "Yellow", "Pink", "Orange", "Grey", "Brown",
];

/** Returns a stable "random" product image for listings based on product id. */
export function getListingProductImageSource(productId: number): ImageSourcePropType {
  const id = typeof productId === "number" ? productId : parseInt(String(productId), 10) || 0;
  const index = Math.abs(id) % PRODUCT_LISTING_IMAGES.length;
  return PRODUCT_LISTING_IMAGES[index];
}

/** Returns the color name shown for this product on the listing (for default on product details). */
export function getListingColorForProductId(productId: number): string | null {
  const id = typeof productId === "number" ? productId : parseInt(String(productId), 10) || 0;
  const index = Math.abs(id) % LISTING_COLOR_NAMES.length;
  return LISTING_COLOR_NAMES[index];
}

/** T-shirt images by color (for listing and details). Gray maps to Grey. */
const TSHIRT_COLOR_IMAGES: Record<string, ImageSourcePropType> = {
  White: require("../assets/products/tshirt-color-white.png"),
  Black: require("../assets/products/tshirt-color-black.png"),
  Green: require("../assets/products/tshirt-color-green.png"),
  Blue: require("../assets/products/tshirt-color-blue.png"),
  Red: require("../assets/products/tshirt-color-red.png"),
  Navy: require("../assets/products/tshirt-color-navy.png"),
  Yellow: require("../assets/products/tshirt-color-yellow.png"),
  Pink: require("../assets/products/tshirt-color-pink.png"),
  Orange: require("../assets/products/tshirt-color-orange.png"),
  Grey: require("../assets/products/tshirt-color-grey.png"),
  Brown: require("../assets/products/tshirt-color-brown.png"),
};

/** Returns t-shirt image for a color name (case-insensitive; Gray → Grey). */
export function getTshirtImageForColor(colorName: string): ImageSourcePropType | null {
  const key = (colorName || "").trim();
  const lower = key.toLowerCase();
  if (lower === "gray") return TSHIRT_COLOR_IMAGES.Grey;
  const found = Object.keys(TSHIRT_COLOR_IMAGES).find((k) => k.toLowerCase() === lower);
  return found ? TSHIRT_COLOR_IMAGES[found] : null;
}

/** Listing image and color from product’s actual colors so list and details match. */
export function getListingImageAndColor(product: {
  id: number;
  colors?: string | null;
}): { imageSource: ImageSourcePropType; color: string | null } {
  const colors = product.colors
    ? product.colors.split(",").map((c: string) => c.trim()).filter(Boolean)
    : [];
  if (colors.length === 0) {
    return { imageSource: getListingProductImageSource(product.id), color: null };
  }
  const id = typeof product.id === "number" ? product.id : parseInt(String(product.id), 10) || 0;
  const index = Math.abs(id) % colors.length;
  const chosenColor = colors[index];
  const imageSource = getTshirtImageForColor(chosenColor) ?? getListingProductImageSource(product.id);
  return { imageSource, color: chosenColor };
}

export function getApiUrl(): string {
  return API_BASE_URL;
}

export function getProductImageSource(path: string | null | undefined): ImageSourcePropType {
  if (!path) return DEFAULT_PRODUCT_IMAGE;
  if (path.includes("tshirt-default.png")) return DEFAULT_PRODUCT_IMAGE;
  return { uri: getImageUrl(path) };
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  if (route.startsWith("/api/cart") && method === "POST") {
    const body = data as any;
    await LocalDataService.addToCart(
      body.productId,
      body.quantity || 1,
      body.size,
      body.color,
      body.customization ?? null,
      body.customPrice ?? null
    );
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  if (route.match(/^\/api\/cart\/\d+$/) && method === "PUT") {
    const id = parseInt(route.split("/").pop()!);
    const body = data as any;
    await LocalDataService.updateCartItem(id, body.quantity);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  if (route.match(/^\/api\/cart\/\d+$/) && method === "DELETE") {
    const id = parseInt(route.split("/").pop()!);
    await LocalDataService.removeCartItem(id);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  if (route === "/api/orders" && method === "POST") {
    const body = data as any;
    const order = await LocalDataService.placeOrder(body.shippingAddress);
    return new Response(JSON.stringify(order), { status: 200 });
  }

  if (route === "/api/wishlist" && method === "POST") {
    const body = data as any;
    await LocalDataService.addToWishlist(body.productId);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  if (route.match(/^\/api\/wishlist\/\d+$/) && method === "DELETE") {
    const productId = parseInt(route.split("/").pop()!);
    await LocalDataService.removeFromWishlist(productId);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const route = queryKey.join("/");

      if (route === "/api/auth/me") {
        return (await LocalDataService.getStoredUser()) as any;
      }

      if (route === "categoryList") {
        const res = await fetch(apiMobileUrl("categoryList"), {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Category list failed");
        const json = await res.json();
        return { categories: json.categories ?? [] } as { categories: CategoryItem[] };
      }

      if (route === "/api/categories") {
        return LocalDataService.getCategories() as any;
      }

      if (route.startsWith("productDetail/")) {
        const productId = route.replace("productDetail/", "");
        const res = await fetch(apiMobileUrl(`productDetail/${productId}`), {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Product detail failed");
        const json = await res.json();
        return (json.product ?? null) as ProductDetail | null;
      }

      if (route === "productList") {
        const res = await fetch(apiMobileUrl("productList"), {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Product list failed");
        const json = await res.json();
        return {
          products: json.products ?? [],
          current_page: json.current_page ?? 1,
          last_page: json.last_page ?? 1,
          per_page: json.per_page ?? 15,
          total: json.total ?? 0,
        } as { products: ProductListItem[]; current_page: number; last_page: number; per_page: number; total: number };
      }

      if (route === "featuredProductList") {
        const res = await fetch(apiMobileUrl("featuredProductList"), {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Featured product list failed");
        const json = await res.json();
        return {
          products: json.products ?? [],
          current_page: json.current_page ?? 1,
          last_page: json.last_page ?? 1,
          per_page: json.per_page ?? 15,
          total: json.total ?? 0,
        } as { products: ProductListItem[]; current_page: number; last_page: number; per_page: number; total: number };
      }

      if (route.startsWith("productListByCategory/")) {
        const categoryId = route.replace("productListByCategory/", "");
        const res = await fetch(apiMobileUrl(`productList?category_id=${categoryId}`), {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Category product list failed");
        const json = await res.json();
        return {
          products: json.products ?? [],
          current_page: json.current_page ?? 1,
          last_page: json.last_page ?? 1,
          per_page: json.per_page ?? 15,
          total: json.total ?? 0,
        } as { products: ProductListItem[]; current_page: number; last_page: number; per_page: number; total: number };
      }

      if (route === "/api/products") {
        return LocalDataService.getProducts() as any;
      }

      if (route === "/api/products/featured") {
        return LocalDataService.getFeaturedProducts() as any;
      }

      if (route.match(/^\/api\/products\/category\/\d+$/)) {
        const catId = parseInt(route.split("/").pop()!);
        return LocalDataService.getProductsByCategory(catId) as any;
      }

      if (route.match(/^\/api\/products\/\d+$/)) {
        const id = parseInt(route.split("/").pop()!);
        return (LocalDataService.getProductById(id) || null) as any;
      }

      if (route === "/api/cart") {
        return (await LocalDataService.getCart()) as any;
      }

      if (route === "/api/orders") {
        return (await LocalDataService.getOrders()) as any;
      }

      if (route.match(/^\/api\/orders\/\d+$/)) {
        const id = parseInt(route.split("/").pop()!);
        return ((await LocalDataService.getOrderById(id)) || null) as any;
      }

      if (route === "/api/wishlist") {
        return (await LocalDataService.getWishlist()) as any;
      }

      if (route.match(/^\/api\/wishlist\/check\/\d+$/)) {
        const productId = parseInt(route.split("/").pop()!);
        const inWishlist = await LocalDataService.isInWishlist(productId);
        return { inWishlist } as any;
      }

      return null as any;
    };

export function getImageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  try {
    const base = getApiUrl();
    return `${base.replace(/\/$/, "")}${path}`;
  } catch {
    return path;
  }
}

const CATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  "/assets/products/cat-tshirts.png": require("../assets/products/cat-tshirts.png"),
  "/assets/products/cat-shirts.png": require("../assets/products/cat-shirts.png"),
  "/assets/products/cat-jeans.png": require("../assets/products/cat-jeans.png"),
  "/assets/products/cat-dresses.png": require("../assets/products/cat-dresses.png"),
  "/assets/products/cat-jackets.png": require("../assets/products/cat-jackets.png"),
  "/assets/products/cat-activewear.png": require("../assets/products/cat-activewear.png"),
};

export function getCategoryImageSource(path: string | null | undefined): ImageSourcePropType {
  if (!path) return DEFAULT_PRODUCT_IMAGE;
  const local = CATEGORY_IMAGES[path];
  if (local) return local;
  return { uri: getImageUrl(path) };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
