import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { LocalDataService } from "./local-data-service";

export function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;
  if (!host) return "https://localhost:5000";
  return new URL(`https://${host}`).href;
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  if (route.startsWith("/api/cart") && method === "POST") {
    const body = data as any;
    await LocalDataService.addToCart(body.productId, body.quantity || 1, body.size, body.color);
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
      return LocalDataService.getUser() as any;
    }

    if (route === "/api/categories") {
      return LocalDataService.getCategories() as any;
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
