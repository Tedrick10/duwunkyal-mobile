import type { ImageSourcePropType } from "react-native";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { API_BASE_URL, apiMobileUrl } from "@/lib/api-config";
import { LocalDataService } from "./local-data-service";
import { triggerUnauthorized } from "./on-unauthorized";

/** Call mobile API with Bearer token. Returns response. Triggers auto-logout on 401/403 (e.g. account deactivated). */
async function apiMobileRequest(
  method: string,
  path: string,
  body?: unknown,
  token?: string | null
): Promise<Response> {
  const t = token ?? (await LocalDataService.getStoredToken());
  const url = apiMobileUrl(path.startsWith("api/") ? path.replace(/^api\/mobile\/?/, "") : path);
  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
  const res = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (t && (res.status === 401 || res.status === 403)) {
    await triggerUnauthorized();
  }
  return res;
}

/** Normalize cart/order product: backend may return image_url, we use image for display */
function normalizeProduct(p: any): any {
  if (!p) return p;
  return {
    ...p,
    image: p.image ?? p.image_url ?? null,
    imageBack: p.imageBack ?? p.image_back ?? p.image ?? null,
    price: typeof p.price === "number" ? String(p.price) : (p.price ?? "0"),
  };
}

/** Normalize order: ensure items[].product has image/imageBack/price, merge productOverride when present */
function normalizeOrder(order: any): any {
  if (!order) return order;
  const items = Array.isArray(order.items) ? order.items : [];
  return {
    ...order,
    items: items.map((it: any) => {
      const po = it.productOverride ?? it.product_override;
      const merged = it.product
        ? normalizeProduct({
          ...it.product,
          image: po?.image ?? it.product.image ?? it.product.image_url,
          imageBack: po?.imageBack ?? po?.image_back ?? it.product.imageBack ?? it.product.image_back ?? it.product.image ?? it.product.image_url,
        })
        : it.product;
      return { ...it, product: merged };
    }),
  };
}

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
/** Region for customize (front/back body, sleeves). */
export type ProductDetailCustomizeRegion = {
  x: number;
  y: number;
  type: string;
  width: number;
  height: number;
};

export type ProductDetailCustomize = {
  front_image_url: string;
  back_image_url: string;
  regions: {
    front_regions: Record<string, ProductDetailCustomizeRegion>;
    back_regions: Record<string, ProductDetailCustomizeRegion>;
  };
  available_colors: Array<{ id: number; name: string; hex: string }>;
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
  retail_min_qty: number | null;
  wholesale_min_qty: number | null;
  featured: boolean;
  sizes: ProductDetailSize[];
  colors: ProductDetailColor[];
  model_3d_id: number | null;
  customize_enabled?: boolean;
  customize?: ProductDetailCustomize | null;
};

/** Region for product customization – rect (x,y,width,height) or ellipse (cx,cy,rx,ry). */
export type ProductCustomizationRegion = {
  type: string;
  /** Rect: top-left and size (0–100 %). */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  /** Ellipse: center and radii (0–100 %). */
  cx?: number;
  cy?: number;
  rx?: number;
  name?: string;
};

export type ProductCustomizationView = {
  image_url: string;
  regions: Record<string, ProductCustomizationRegion>;
};

export type ProductCustomizationView3D = {
  id: number;
  name: string;
  obj_url: string;
  mtl_url: string | null;
  texture_urls: string[];
  thumbnail_url: string | null;
  scale_position: unknown | null;
};

export type ProductCustomizationColor = {
  id: number;
  color_id: number;
  name: string;
  hex: string;
  image_url: string | null;
  price_delta: number;
};

export type ProductCustomization = {
  product_id: number;
  product_name: string;
  customize_enabled: boolean;
  /** Base price from API when provided; otherwise use productDetail */
  base_price?: number | null;
  front_view: ProductCustomizationView;
  back_view: ProductCustomizationView;
  view_3d: ProductCustomizationView3D | null;
  colors: ProductCustomizationColor[];
};

export type ClipartItem = {
  id: number;
  name: string;
  thumbnail_url: string;
  file_path: string | null;
  file_url: string | null;
  price: number;
};
export type TemplateItem = {
  id: number;
  name: string;
  thumbnail_url: string;
  file_path: string | null;
  file_url: string | null;
  price: number;
};

/** No demo asset: use neutral placeholder when API provides no product image. */
const PLACEHOLDER_PRODUCT_IMAGE: ImageSourcePropType = {
  uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
};

/** No demo listing image: use API image or placeholder. */
export function getListingProductImageSource(_productId: number): ImageSourcePropType {
  return PLACEHOLDER_PRODUCT_IMAGE;
}

/** No demo color: return null; product detail uses API colors. */
export function getListingColorForProductId(_productId: number): string | null {
  return null;
}

/** No demo t-shirt-by-color image: return null; use API product/color image_url. */
export function getTshirtImageForColor(_colorName: string): ImageSourcePropType | null {
  return null;
}

/** Listing image from API (image_url) or placeholder; color from product’s .colors first if present. */
export function getListingImageAndColor(product: {
  id: number;
  image_url?: string | null;
  colors?: string | null;
}): { imageSource: ImageSourcePropType; color: string | null } {
  const imageSource = getProductImageSource(product.image_url ?? null);
  const colors = product.colors
    ? product.colors.split(",").map((c: string) => c.trim()).filter(Boolean)
    : [];
  const color = colors.length > 0 ? colors[0] : null;
  return { imageSource, color };
}

export function getApiUrl(): string {
  return API_BASE_URL;
}

export function getProductImageSource(path: string | null | undefined): ImageSourcePropType {
  if (!path) return PLACEHOLDER_PRODUCT_IMAGE;
  if (path.includes("tshirt-default.png")) return PLACEHOLDER_PRODUCT_IMAGE;
  return { uri: getImageUrl(path) };
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  if (route.startsWith("/api/cart") && method === "POST") {
    const body = data as {
      productId: number;
      quantity?: number;
      size?: string;
      color?: string;
      customization?: {
        bodyColor?: string;
        sleeveColor?: string;
        collarColor?: string;
        frontDesign?: unknown;
        backDesign?: unknown;
        totalPrice?: number;
      } | null;
      customPrice?: number | string | null;
      productOverride?: { id?: number; name?: string; price?: string; image?: string | null; imageBack?: string | null } | null;
    };
    const token = await LocalDataService.getStoredToken();
    if (token) {
      const po = body.productOverride;
      const productOverride =
        po && typeof po === "object"
          ? {
            image: po.image ? (String(po.image).startsWith("http") ? po.image : getImageUrl(po.image)) : null,
            imageBack: po.imageBack ? (String(po.imageBack).startsWith("http") ? po.imageBack : getImageUrl(po.imageBack)) : null,
          }
          : { image: null, imageBack: null };
      const cust = body.customization;
      const customization =
        cust && typeof cust === "object"
          ? {
            bodyColor: cust.bodyColor ?? null,
            sleeveColor: cust.sleeveColor ?? null,
            collarColor: cust.collarColor ?? null,
            frontDesign: cust.frontDesign ?? null,
            backDesign: cust.backDesign ?? null,
            totalPrice: cust.totalPrice ?? null,
          }
          : null;
      const customPriceVal = body.customPrice != null ? (typeof body.customPrice === "number" ? body.customPrice : Number(body.customPrice) || body.customPrice) : null;
      const payload: Record<string, unknown> = {
        productId: body.productId,
        quantity: body.quantity ?? 1,
        size: body.size ?? null,
        color: body.color ?? null,
        customPrice: customPriceVal,
        customization,
        productOverride,
      };
      const res = await apiMobileRequest("POST", "cart", payload, token);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const msg =
          typeof err?.message === "string"
            ? err.message
            : err?.errors && typeof err.errors === "object"
              ? String(Object.values(err.errors as Record<string, string[]>).flat()[0] ?? "Add to cart failed")
              : "Add to cart failed";
        throw new Error(msg);
      }
      return res;
    }
    await LocalDataService.addToCart(
      body.productId,
      body.quantity || 1,
      body.size ?? "",
      body.color ?? "",
      (body.customization ?? null) as any,
      body.customPrice != null ? String(body.customPrice) : null,
      (body.productOverride ?? undefined) as any
    );
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  if (route.match(/^\/api\/cart\/\d+$/) && method === "PUT") {
    const id = parseInt(route.split("/").pop()!);
    const body = data as { quantity: number };
    const token = await LocalDataService.getStoredToken();
    if (token) {
      const res = await apiMobileRequest("PUT", `cart/${id}`, { quantity: body.quantity }, token);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message ?? "Update cart failed");
      }
      return res;
    }
    await LocalDataService.updateCartItem(id, body.quantity);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  if (route.match(/^\/api\/cart\/\d+$/) && method === "DELETE") {
    const id = parseInt(route.split("/").pop()!);
    const token = await LocalDataService.getStoredToken();
    if (token) {
      const res = await apiMobileRequest("DELETE", `cart/${id}`, undefined, token);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message ?? "Remove from cart failed");
      }
      return res;
    }
    await LocalDataService.removeCartItem(id);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  if (route === "/api/orders" && method === "POST") {
    const body = data as { shippingAddress: string; shippingName?: string; shippingPhone?: string; notes?: string };
    const token = await LocalDataService.getStoredToken();
    if (token) {
      const payload = {
        shippingAddress: body.shippingAddress ?? "",
        ...(body.shippingName && { shippingName: body.shippingName }),
        ...(body.shippingPhone && { shippingPhone: body.shippingPhone }),
        ...(body.notes && { notes: body.notes }),
      };
      const res = await apiMobileRequest("POST", "orders", payload, token);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const msg =
          typeof err?.message === "string"
            ? err.message
            : err?.errors && typeof err.errors === "object"
              ? String(Object.values(err.errors as Record<string, string[]>).flat()[0] ?? "Place order failed")
              : "Place order failed";
        throw new Error(msg);
      }
      return res;
    }
    const addr = [body.shippingName, body.shippingPhone, body.shippingAddress].filter(Boolean).join(", ") || body.shippingAddress;
    const order = await LocalDataService.placeOrder(addr, body.notes);
    return new Response(JSON.stringify(order), { status: 200 });
  }

  if (route === "/api/wishlist" && method === "POST") {
    const body = data as { productId: number };
    const token = await LocalDataService.getStoredToken();
    if (token) {
      const res = await apiMobileRequest("POST", "wishlist", { productId: body.productId }, token);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message ?? "Add to wishlist failed");
      }
      return res;
    }
    await LocalDataService.addToWishlist(body.productId);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  if (route.match(/^\/api\/wishlist\/\d+$/) && method === "DELETE") {
    const idFromPath = parseInt(route.split("/").pop()!);
    const token = await LocalDataService.getStoredToken();
    if (token) {
      const res = await apiMobileRequest("DELETE", `wishlist/${idFromPath}`, undefined, token);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message ?? "Remove from wishlist failed");
      }
      return res;
    }
    await LocalDataService.removeFromWishlist(idFromPath);
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
        const token = await LocalDataService.getStoredToken();
        const headers: HeadersInit = {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const res = await fetch(apiMobileUrl(`productDetail/${productId}`), {
          method: "GET",
          headers,
        });
        if (res.status === 403) {
          try {
            const json = await res.json();
            if (json.login_required) {
              const err = new Error(json.message || "Login required to view this product.");
              (err as any).loginRequired = true;
              throw err;
            }
          } catch (e) {
            if ((e as any)?.loginRequired) throw e;
          }
        }
        if (!res.ok) throw new Error("Product detail failed");
        const json = await res.json();
        return (json.product ?? null) as ProductDetail | null;
      }

      if (route.startsWith("productCustomization/")) {
        const productId = route.replace("productCustomization/", "");
        const token = await LocalDataService.getStoredToken();
        const headers: HeadersInit = {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const res = await fetch(apiMobileUrl(`productCustomization/${productId}`), {
          method: "GET",
          headers,
        });
        if (res.status === 403) {
          try {
            const json = await res.json();
            if (json.login_required) {
              const err = new Error(json.message || "Login required to view this product.");
              (err as any).loginRequired = true;
              throw err;
            }
          } catch (e) {
            if ((e as any)?.loginRequired) throw e;
          }
        }
        if (!res.ok) throw new Error("Product customization failed");
        const json = await res.json();
        return json as ProductCustomization;
      }

      if (route === "productList") {
        const token = await LocalDataService.getStoredToken();
        const headers: HeadersInit = {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const res = await fetch(apiMobileUrl("productList"), {
          method: "GET",
          headers,
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
        const token = await LocalDataService.getStoredToken();
        const headers: HeadersInit = {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const res = await fetch(apiMobileUrl("featuredProductList"), {
          method: "GET",
          headers,
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

      if (route === "clipartList") {
        const res = await fetch(apiMobileUrl("clipartList"), {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Clipart list failed");
        const json = await res.json();
        return {
          cliparts: json.cliparts ?? [],
          current_page: json.current_page ?? 1,
          last_page: json.last_page ?? 1,
          per_page: json.per_page ?? 15,
          total: json.total ?? 0,
        } as { cliparts: ClipartItem[]; current_page: number; last_page: number; per_page: number; total: number };
      }

      if (route === "templateList") {
        const res = await fetch(apiMobileUrl("templateList"), {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Template list failed");
        const json = await res.json();
        return {
          templates: json.templates ?? [],
          current_page: json.current_page ?? 1,
          last_page: json.last_page ?? 1,
          per_page: json.per_page ?? 15,
          total: json.total ?? 0,
        } as { templates: TemplateItem[]; current_page: number; last_page: number; per_page: number; total: number };
      }

      if (route.startsWith("productListByCategory/")) {
        const categoryId = route.replace("productListByCategory/", "");
        const token = await LocalDataService.getStoredToken();
        const headers: HeadersInit = {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const res = await fetch(apiMobileUrl(`productList?category_id=${categoryId}`), {
          method: "GET",
          headers,
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
        const token = await LocalDataService.getStoredToken();
        if (token) {
          const res = await apiMobileRequest("GET", "cart", undefined, token);
          if (!res.ok) {
            if (res.status === 401) {
              if (unauthorizedBehavior === "throw") throw new Error("Unauthorized");
              return [] as any;
            }
            throw new Error("Cart fetch failed");
          }
          const list = (await res.json()) as any[];
          return (Array.isArray(list) ? list : []).map((item) => {
            const snap = item.product_snapshot ?? item.productSnapshot;
            const po = item.productOverride ?? item.product_override;
            const merged = item.product
              ? normalizeProduct({
                ...item.product,
                image: po?.image ?? snap?.image ?? item.product.image ?? item.product.image_url,
                imageBack: po?.imageBack ?? po?.image_back ?? snap?.imageBack ?? snap?.image_back ?? item.product.imageBack ?? item.product.image_back ?? item.product.image ?? item.product.image_url,
              })
              : item.product;
            return { ...item, product: merged };
          }) as any;
        }
        return (await LocalDataService.getCart()) as any;
      }

      if (route === "/api/orders") {
        const token = await LocalDataService.getStoredToken();
        if (token) {
          const res = await apiMobileRequest("GET", "orders", undefined, token);
          if (!res.ok) {
            if (res.status === 401) {
              if (unauthorizedBehavior === "throw") throw new Error("Unauthorized");
              return [] as any;
            }
            throw new Error("Orders fetch failed");
          }
          const list = (await res.json()) as any[];
          return (Array.isArray(list) ? list : []).map(normalizeOrder) as any;
        }
        return (await LocalDataService.getOrders()) as any;
      }

      if (route.match(/^\/api\/orders\/\d+$/)) {
        const id = parseInt(route.split("/").pop()!);
        const token = await LocalDataService.getStoredToken();
        if (token) {
          const res = await apiMobileRequest("GET", `orders/${id}`, undefined, token);
          if (!res.ok) {
            if (res.status === 401) {
              if (unauthorizedBehavior === "throw") throw new Error("Unauthorized");
              return null as any;
            }
            throw new Error("Order fetch failed");
          }
          const order = await res.json();
          return (order ? normalizeOrder(order) : null) as any;
        }
        return ((await LocalDataService.getOrderById(id)) || null) as any;
      }

      if (route === "/api/wishlist") {
        const token = await LocalDataService.getStoredToken();
        if (token) {
          const res = await apiMobileRequest("GET", "wishlist", undefined, token);
          if (!res.ok) {
            if (res.status === 401) {
              if (unauthorizedBehavior === "throw") throw new Error("Unauthorized");
              return [] as any;
            }
            throw new Error("Wishlist fetch failed");
          }
          const list = (await res.json()) as any[];
          return (list ?? []).map((item) => ({
            ...item,
            product: item.product ? normalizeProduct(item.product) : item.product,
          })) as any;
        }
        return (await LocalDataService.getWishlist()) as any;
      }

      if (route.match(/^\/api\/wishlist\/check\/\d+$/)) {
        const productId = parseInt(route.split("/").pop()!);
        const token = await LocalDataService.getStoredToken();
        if (token) {
          const res = await apiMobileRequest(
            "GET",
            `wishlist/check/${productId}`,
            undefined,
            token
          );
          if (!res.ok) {
            if (res.status === 401) {
              if (unauthorizedBehavior === "throw") throw new Error("Unauthorized");
              return { inWishlist: false } as any;
            }
            throw new Error("Wishlist check failed");
          }
          return (await res.json()) as { inWishlist: boolean };
        }
        const inWishlist = await LocalDataService.isInWishlist(productId);
        return { inWishlist } as any;
      }

      return null as any;
    };

export function getImageUrl(path: string | null | undefined): string {
  if (!path) return "";
  try {
    const base = getApiUrl();
    const baseOrigin = base.replace(/\/$/, "");
    if (path.startsWith("http://") || path.startsWith("https://")) {
      const url = new URL(path);
      if (
        url.hostname === "127.0.0.1" ||
        url.hostname === "localhost" ||
        url.hostname === "0.0.0.0"
      ) {
        const baseUrl = new URL(baseOrigin);
        return path.replace(url.origin, baseUrl.origin);
      }
      return path;
    }
    return `${baseOrigin}${path.startsWith("/") ? path : `/${path}`}`;
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
  if (!path) return PLACEHOLDER_PRODUCT_IMAGE;
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
