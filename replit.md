# StyleVault

## Overview

StyleVault is a full-stack mobile e-commerce application for a garment/clothing store. It uses **Expo (React Native)** for the frontend and **Express.js** for the backend API, with **PostgreSQL** as the database via **Drizzle ORM**. The app supports browsing products by category, searching, cart management, checkout with order placement, user authentication, an admin panel for store management, and a **product customization editor** with 2D design (fabric.js) and 3D preview (three.js).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)

- **Framework**: Expo SDK 54 with React Native 0.81, targeting iOS, Android, and Web
- **Routing**: File-based routing via `expo-router` v6 with typed routes enabled
  - `app/(tabs)/` — Main tab navigation (Home, Search, Cart, Profile)
  - `app/(auth)/` — Auth screens (Login, Register) presented as modals
  - `app/product/[id].tsx` — Product detail page
  - `app/category/[id].tsx` — Category listing page
  - `app/checkout.tsx` — Checkout flow
  - `app/order/[id].tsx` — Order detail page
- **State Management**: TanStack React Query v5 for server state, React context for auth state (`lib/auth-context.tsx`)
- **Styling**: React Native `StyleSheet` with a centralized color theme in `constants/colors.ts`
- **Fonts**: Inter font family via `@expo-google-fonts/inter`
- **Key Libraries**: expo-haptics, expo-image, expo-linear-gradient, react-native-gesture-handler, react-native-keyboard-controller

### Backend (Express.js)

- **Location**: `server/` directory
- **Entry Point**: `server/index.ts` — Sets up Express with CORS handling for Replit domains and localhost
- **Routes**: `server/routes.ts` — All API endpoints registered here
  - Auth: `/api/auth/login`, `/api/auth/register`, `/api/auth/me`, `/api/auth/logout`
  - Products: `/api/products`, `/api/products/featured`, `/api/products/:id`, `/api/products/category/:id`
  - Categories: `/api/categories`
  - Cart: `/api/cart` (CRUD operations, requires auth)
  - Orders: `/api/orders` (create and list, requires auth)
  - Admin endpoints (require admin role)
- **Authentication**: Session-based using `express-session` with `connect-pg-simple` for PostgreSQL session storage. Passwords hashed with `bcryptjs`.
- **Middleware**: `requireAuth` and `requireAdmin` middleware functions for route protection
- **Admin Panel**: Server-rendered HTML admin interface at `server/templates/admin.html`
- **Product Customizer**: Server-rendered HTML editor at `server/templates/customize.html` — 2D design via fabric.js (CDN), 3D preview via three.js (CDN) with OBJ model loading
  - Route: `/customize/:id`
  - OBJ models stored in `public/models/` (man_tshirt.obj, woman_tshirt.obj), served via `/models/` static route
  - Features: Front/back view switching, add text/images/shapes, t-shirt color picker, undo/redo, 3D preview with OrbitControls, save design as PNG
- **Storage Layer**: `server/storage.ts` — Data access functions using Drizzle ORM queries

### Database

- **Database**: PostgreSQL (provisioned via Replit, connection via `DATABASE_URL` env var)
- **ORM**: Drizzle ORM with `drizzle-kit` for schema management
- **Schema** (`shared/schema.ts`):
  - `users` — id, email, password, name, phone, address, isAdmin, createdAt
  - `categories` — id, name, image, createdAt
  - `products` — id, name, description, price, image, categoryId (FK→categories), sizes, colors, stock, featured, createdAt
  - `cartItems` — id, userId (FK→users), productId, quantity, size, color
  - `wishlistItems` — id, userId (FK→users), productId (FK→products), createdAt
  - `orders` — id, userId, status, total, shippingAddress, timestamps
  - `orderItems` — id, orderId, productId, quantity, price, size, color
- **Validation**: `drizzle-zod` generates Zod schemas from Drizzle tables for insert validation
- **Seeding**: `server/seed.ts` populates initial admin user, categories, and sample products
- **Schema Push**: Use `npm run db:push` (runs `drizzle-kit push`) to sync schema to database

### Shared Code

- `shared/schema.ts` — Database schema and Zod validation schemas, shared between server and client
- Path alias `@shared/*` maps to `./shared/*`
- Path alias `@/*` maps to project root

### Offline/Dummy Data Mode (Current)

- **Mode**: App runs with local dummy data — NO backend API calls for data
- **Dummy Data**: `lib/dummy-data.ts` — Contains all categories, products, cart, orders, wishlist, and user data as static TypeScript objects
- **Local Data Service**: `lib/local-data-service.ts` — Provides CRUD operations backed by AsyncStorage for persistence (cart, orders, wishlist changes persist across sessions)
- **Auth**: Auto-logged-in as "Style User" — no real authentication required
- **Query Client**: `lib/query-client.ts` — Routes all query keys and mutations to `LocalDataService` instead of network requests
- **Image URLs**: Still resolved via `getApiUrl()` pointing to backend for serving static assets from `/assets/products/`
- **Note**: The product customization WebView (`app/customize/[id].tsx`) still loads from backend URL

### API Communication (Legacy — currently bypassed by dummy data)

- Client uses `lib/query-client.ts` which previously provided:
  - `getApiUrl()` — Resolves API base URL from `EXPO_PUBLIC_DOMAIN` env var
  - `apiRequest()` — Now routes to LocalDataService instead of network
  - `getQueryFn()` — Now returns data from LocalDataService based on queryKey routing

### Build & Development

- **Dev mode**: Two processes — `npm run expo:dev` (Expo bundler) and `npm run server:dev` (Express via tsx)
- **Production build**: `npm run expo:static:build` builds static web assets, `npm run server:build` bundles server with esbuild, `npm run server:prod` runs production server
- **Patch-package**: `postinstall` runs patch-package for any dependency patches

## External Dependencies

- **PostgreSQL** — Primary database, connected via `DATABASE_URL` environment variable
- **connect-pg-simple** — Session storage in PostgreSQL
- **bcryptjs** — Password hashing
- **Expo SDK** — Mobile/web runtime and build tooling
- **TanStack React Query** — Server state management and caching
- **Drizzle ORM + drizzle-kit** — Database ORM and migration tooling
- **Zod (via drizzle-zod)** — Runtime validation for API inputs
- No external payment processing, email services, or third-party APIs are currently integrated