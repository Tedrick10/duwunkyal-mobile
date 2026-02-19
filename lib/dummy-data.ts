export interface Category {
  id: number;
  name: string;
  image: string;
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string;
  image: string | null;
  imageBack: string | null;
  categoryId: number | null;
  sizes: string | null;
  colors: string | null;
  stock: number;
  featured: boolean;
  createdAt: string;
}

import type { CustomizationData } from "@/components/customize/types";

export interface CartItemData {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  size: string | null;
  color: string | null;
  createdAt: string;
  product: Product;
  /** Set when added from Customize screen – colors + front/back design for viewing in cart */
  customization?: CustomizationData | null;
  /** Line price when customization is set (totalPrice from customize); else use product.price */
  customPrice?: string | null;
}

export interface OrderData {
  id: number;
  userId: number;
  total: string;
  status: string;
  shippingAddress: string | null;
  createdAt: string;
  items: OrderItemData[];
}

export interface OrderItemData {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: string;
  size: string | null;
  color: string | null;
  product: Product;
}

export interface WishlistItemData {
  id: number;
  userId: number;
  productId: number;
  createdAt: string;
  product: Product;
}

export interface UserData {
  id: number;
  email: string | null;
  name: string;
  phone: string | null;
  address: string | null;
  isAdmin: boolean;
  photo_url?: string | null;
}


export const CATEGORIES: Category[] = [
  { id: 1, name: "T-Shirts", image: "/assets/products/cat-tshirts.png", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: 2, name: "Shirts", image: "/assets/products/cat-shirts.png", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: 3, name: "Jeans", image: "/assets/products/cat-jeans.png", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: 4, name: "Dresses", image: "/assets/products/cat-dresses.png", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: 5, name: "Jackets", image: "/assets/products/cat-jackets.png", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: 6, name: "Activewear", image: "/assets/products/cat-activewear.png", createdAt: "2026-01-01T00:00:00.000Z" },
];

const DEFAULT_PRODUCT_IMAGE = "/assets/products/tshirt-default.png";

export const PRODUCTS: Product[] = [
  { id: 1, name: "Classic V-Neck Tee", description: "Premium cotton v-neck t-shirt with a modern slim fit. Perfect for casual everyday wear.", price: "29.99", image: DEFAULT_PRODUCT_IMAGE, imageBack: DEFAULT_PRODUCT_IMAGE, categoryId: 1, sizes: "S,M,L,XL,XXL", colors: "Black,White,Navy,Gray,Green,Red,Orange", stock: 150, featured: true, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: 2, name: "Crew Neck Essential", description: "Soft breathable cotton crew neck. A wardrobe staple.", price: "24.99", image: DEFAULT_PRODUCT_IMAGE, imageBack: DEFAULT_PRODUCT_IMAGE, categoryId: 1, sizes: "S,M,L,XL", colors: "White,Black,Green,Red,Orange", stock: 200, featured: true, createdAt: "2026-01-02T00:00:00.000Z" },
  { id: 3, name: "Graphic Print Tee", description: "Bold graphic print on premium cotton. Stand out from the crowd.", price: "34.99", image: DEFAULT_PRODUCT_IMAGE, imageBack: DEFAULT_PRODUCT_IMAGE, categoryId: 1, sizes: "S,M,L,XL", colors: "Black,White,Green,Red,Orange", stock: 80, featured: false, createdAt: "2026-01-03T00:00:00.000Z" },
  { id: 4, name: "Oxford Button Down", description: "Classic oxford cloth button-down shirt. Perfect for smart casual.", price: "59.99", image: DEFAULT_PRODUCT_IMAGE, imageBack: null, categoryId: 2, sizes: "S,M,L,XL,XXL", colors: "White,Light Blue,Pink,Green,Red,Orange", stock: 120, featured: true, createdAt: "2026-01-04T00:00:00.000Z" },
  { id: 5, name: "Linen Summer Shirt", description: "Lightweight linen shirt for warm weather. Breathable and stylish.", price: "49.99", image: DEFAULT_PRODUCT_IMAGE, imageBack: null, categoryId: 2, sizes: "S,M,L,XL", colors: "White,Beige,Sky Blue,Green,Red,Orange", stock: 90, featured: false, createdAt: "2026-01-05T00:00:00.000Z" },
  { id: 6, name: "Flannel Check Shirt", description: "Warm flannel shirt with classic check pattern.", price: "54.99", image: DEFAULT_PRODUCT_IMAGE, imageBack: null, categoryId: 2, sizes: "M,L,XL,XXL", colors: "Red,Green,Blue,Orange", stock: 60, featured: false, createdAt: "2026-01-06T00:00:00.000Z" },
  { id: 7, name: "Slim Fit Denim", description: "Modern slim fit jeans in premium stretch denim.", price: "69.99", image: DEFAULT_PRODUCT_IMAGE, imageBack: null, categoryId: 3, sizes: "28,30,32,34,36", colors: "Dark Blue,Black,Light Wash,Green,Red,Orange", stock: 100, featured: true, createdAt: "2026-01-07T00:00:00.000Z" },
  { id: 8, name: "Straight Leg Classic", description: "Timeless straight leg jeans. Comfortable all-day wear.", price: "64.99", image: DEFAULT_PRODUCT_IMAGE, imageBack: null, categoryId: 3, sizes: "28,30,32,34,36,38", colors: "Medium Wash,Dark Wash,Green,Red,Orange", stock: 130, featured: false, createdAt: "2026-01-08T00:00:00.000Z" },
  { id: 9, name: "Floral Midi Dress", description: "Elegant floral print midi dress for any occasion.", price: "79.99", image: DEFAULT_PRODUCT_IMAGE, imageBack: null, categoryId: 4, sizes: "XS,S,M,L,XL", colors: "Floral Blue,Floral Pink,Green,Red,Orange", stock: 70, featured: true, createdAt: "2026-01-09T00:00:00.000Z" },
  { id: 10, name: "Little Black Dress", description: "Classic little black dress. A timeless essential.", price: "89.99", image: DEFAULT_PRODUCT_IMAGE, imageBack: null, categoryId: 4, sizes: "XS,S,M,L", colors: "Black,Green,Red,Orange", stock: 50, featured: true, createdAt: "2026-01-10T00:00:00.000Z" },
  { id: 11, name: "Leather Biker Jacket", description: "Premium leather biker jacket with classic styling.", price: "199.99", image: DEFAULT_PRODUCT_IMAGE, imageBack: null, categoryId: 5, sizes: "S,M,L,XL", colors: "Black,Brown,Green,Red,Orange", stock: 40, featured: true, createdAt: "2026-01-11T00:00:00.000Z" },
  { id: 12, name: "Puffer Down Jacket", description: "Warm insulated puffer jacket for cold weather.", price: "149.99", image: DEFAULT_PRODUCT_IMAGE, imageBack: null, categoryId: 5, sizes: "S,M,L,XL,XXL", colors: "Black,Navy,Green,Red,Orange", stock: 65, featured: false, createdAt: "2026-01-12T00:00:00.000Z" },
  { id: 13, name: "Performance Leggings", description: "High-waist performance leggings with moisture-wicking fabric.", price: "44.99", image: DEFAULT_PRODUCT_IMAGE, imageBack: null, categoryId: 6, sizes: "XS,S,M,L,XL", colors: "Black,Navy,Gray,Green,Red,Orange", stock: 180, featured: false, createdAt: "2026-01-13T00:00:00.000Z" },
  { id: 14, name: "Training Tank Top", description: "Lightweight training tank with breathable mesh panels.", price: "29.99", image: DEFAULT_PRODUCT_IMAGE, imageBack: null, categoryId: 6, sizes: "S,M,L,XL", colors: "Black,White,Red,Green,Orange", stock: 140, featured: false, createdAt: "2026-01-14T00:00:00.000Z" },
];

export const INITIAL_CART: CartItemData[] = [
  {
    id: 1,
    userId: 1,
    productId: 1,
    quantity: 2,
    size: "M",
    color: "Black",
    createdAt: "2026-02-01T00:00:00.000Z",
    product: PRODUCTS[0],
  },
  {
    id: 2,
    userId: 1,
    productId: 7,
    quantity: 1,
    size: "32",
    color: "Dark Blue",
    createdAt: "2026-02-02T00:00:00.000Z",
    product: PRODUCTS[6],
  },
];

export const INITIAL_ORDERS: OrderData[] = [
  {
    id: 1,
    userId: 1,
    total: "114.97",
    status: "delivered",
    shippingAddress: "No.123, Pyay Road, Kamayut Township, Yangon",
    createdAt: "2026-01-15T00:00:00.000Z",
    items: [
      { id: 1, orderId: 1, productId: 2, quantity: 1, price: "24.99", size: "L", color: "White", product: PRODUCTS[1] },
      { id: 2, orderId: 1, productId: 10, quantity: 1, price: "89.99", size: "M", color: "Black", product: PRODUCTS[9] },
    ],
  },
  {
    id: 2,
    userId: 1,
    total: "199.99",
    status: "shipped",
    shippingAddress: "No.456, Inya Road, Bahan Township, Yangon",
    createdAt: "2026-02-05T00:00:00.000Z",
    items: [
      { id: 3, orderId: 2, productId: 11, quantity: 1, price: "199.99", size: "L", color: "Black", product: PRODUCTS[10] },
    ],
  },
  {
    id: 3,
    userId: 1,
    total: "79.98",
    status: "pending",
    shippingAddress: "No.789, University Avenue, Kamayut Township, Yangon",
    createdAt: "2026-02-10T00:00:00.000Z",
    items: [
      { id: 4, orderId: 3, productId: 13, quantity: 1, price: "44.99", size: "S", color: "Black", product: PRODUCTS[12] },
      { id: 5, orderId: 3, productId: 3, quantity: 1, price: "34.99", size: "M", color: "Black", product: PRODUCTS[2] },
    ],
  },
];

export const INITIAL_WISHLIST: WishlistItemData[] = [
  { id: 1, userId: 1, productId: 9, createdAt: "2026-02-01T00:00:00.000Z", product: PRODUCTS[8] },
  { id: 2, userId: 1, productId: 11, createdAt: "2026-02-03T00:00:00.000Z", product: PRODUCTS[10] },
  { id: 3, userId: 1, productId: 4, createdAt: "2026-02-06T00:00:00.000Z", product: PRODUCTS[3] },
];
