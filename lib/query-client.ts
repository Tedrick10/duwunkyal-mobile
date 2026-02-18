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
  featured: boolean;
  sizes: ProductDetailSize[];
  colors: ProductDetailColor[];
  model_3d_id: number | null;
  customize_enabled?: boolean;
  customize?: ProductDetailCustomize | null;
};

/** Region for product customization (body, sleeve_left, sleeve_right). */
export type ProductCustomizationRegion = {
  x: number;
  y: number;
  type: string;
  width: number;
  height: number;
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
  front_view: ProductCustomizationView;
  back_view: ProductCustomizationView;
  view_3d: ProductCustomizationView3D | null;
  colors: ProductCustomizationColor[];
  template_regions: {
    front_regions: Record<string, ProductCustomizationRegion>;
    back_regions: Record<string, ProductCustomizationRegion>;
  };
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

      if (route.startsWith("productCustomization/")) {
        const productId = route.replace("productCustomization/", "");
        const res = await fetch(apiMobileUrl(`productCustomization/${productId}`), {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Product customization failed");
        const json = await res.json();
        return json as ProductCustomization;
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
