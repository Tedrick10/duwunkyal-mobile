import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, categories, products } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  const existingAdmin = await db.select().from(users);
  if (existingAdmin.length > 0) {
    console.log("Database already seeded, skipping...");
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash("admin123", 10);
  await db.insert(users).values({
    email: "admin@store.com",
    password: hashedPassword,
    name: "Admin",
    isAdmin: true,
  });

  const [tshirts] = await db.insert(categories).values({ name: "T-Shirts", image: "/assets/products/cat-tshirts.jpg" }).returning();
  const [shirts] = await db.insert(categories).values({ name: "Shirts", image: "/assets/products/cat-shirts.jpg" }).returning();
  const [jeans] = await db.insert(categories).values({ name: "Jeans", image: "/assets/products/cat-jeans.jpg" }).returning();
  const [dresses] = await db.insert(categories).values({ name: "Dresses", image: "/assets/products/cat-dresses.jpg" }).returning();
  const [jackets] = await db.insert(categories).values({ name: "Jackets", image: "/assets/products/cat-jackets.jpg" }).returning();
  const [activewear] = await db.insert(categories).values({ name: "Activewear", image: "/assets/products/cat-activewear.jpg" }).returning();

  const sampleProducts = [
    { name: "Classic V-Neck Tee", description: "Premium cotton v-neck t-shirt with a modern slim fit. Perfect for casual everyday wear.", price: "29.99", image: "/assets/products/vneck-tee.jpg", categoryId: tshirts.id, sizes: "S,M,L,XL,XXL", colors: "Black,White,Navy,Gray", stock: 150, featured: true },
    { name: "Crew Neck Essential", description: "Soft breathable cotton crew neck. A wardrobe staple.", price: "24.99", image: "/assets/products/crew-neck.jpg", categoryId: tshirts.id, sizes: "S,M,L,XL", colors: "White,Black,Olive,Burgundy", stock: 200, featured: true },
    { name: "Graphic Print Tee", description: "Bold graphic print on premium cotton. Stand out from the crowd.", price: "34.99", image: "/assets/products/graphic-tee.jpg", categoryId: tshirts.id, sizes: "S,M,L,XL", colors: "Black,White", stock: 80, featured: false },
    { name: "Oxford Button Down", description: "Classic oxford cloth button-down shirt. Perfect for smart casual.", price: "59.99", image: "/assets/products/oxford-shirt.jpg", categoryId: shirts.id, sizes: "S,M,L,XL,XXL", colors: "White,Light Blue,Pink", stock: 120, featured: true },
    { name: "Linen Summer Shirt", description: "Lightweight linen shirt for warm weather. Breathable and stylish.", price: "49.99", image: "/assets/products/linen-shirt.jpg", categoryId: shirts.id, sizes: "S,M,L,XL", colors: "White,Beige,Sky Blue", stock: 90, featured: false },
    { name: "Flannel Check Shirt", description: "Warm flannel shirt with classic check pattern.", price: "54.99", image: "/assets/products/flannel-shirt.jpg", categoryId: shirts.id, sizes: "M,L,XL,XXL", colors: "Red,Green,Blue", stock: 60, featured: false },
    { name: "Slim Fit Denim", description: "Modern slim fit jeans in premium stretch denim.", price: "69.99", image: "/assets/products/slim-jeans.jpg", categoryId: jeans.id, sizes: "28,30,32,34,36", colors: "Dark Blue,Black,Light Wash", stock: 100, featured: true },
    { name: "Straight Leg Classic", description: "Timeless straight leg jeans. Comfortable all-day wear.", price: "64.99", image: "/assets/products/straight-jeans.jpg", categoryId: jeans.id, sizes: "28,30,32,34,36,38", colors: "Medium Wash,Dark Wash", stock: 130, featured: false },
    { name: "Floral Midi Dress", description: "Elegant floral print midi dress for any occasion.", price: "79.99", image: "/assets/products/floral-dress.jpg", categoryId: dresses.id, sizes: "XS,S,M,L,XL", colors: "Floral Blue,Floral Pink", stock: 70, featured: true },
    { name: "Little Black Dress", description: "Classic little black dress. A timeless essential.", price: "89.99", image: "/assets/products/black-dress.jpg", categoryId: dresses.id, sizes: "XS,S,M,L", colors: "Black", stock: 50, featured: true },
    { name: "Leather Biker Jacket", description: "Premium leather biker jacket with classic styling.", price: "199.99", image: "/assets/products/leather-jacket.jpg", categoryId: jackets.id, sizes: "S,M,L,XL", colors: "Black,Brown", stock: 40, featured: true },
    { name: "Puffer Down Jacket", description: "Warm insulated puffer jacket for cold weather.", price: "149.99", image: "/assets/products/puffer-jacket.jpg", categoryId: jackets.id, sizes: "S,M,L,XL,XXL", colors: "Black,Navy,Olive", stock: 65, featured: false },
    { name: "Performance Leggings", description: "High-waist performance leggings with moisture-wicking fabric.", price: "44.99", image: "/assets/products/leggings.jpg", categoryId: activewear.id, sizes: "XS,S,M,L,XL", colors: "Black,Navy,Gray", stock: 180, featured: false },
    { name: "Training Tank Top", description: "Lightweight training tank with breathable mesh panels.", price: "29.99", image: "/assets/products/tank-top.jpg", categoryId: activewear.id, sizes: "S,M,L,XL", colors: "Black,White,Red", stock: 140, featured: false },
  ];

  for (const p of sampleProducts) {
    await db.insert(products).values(p);
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(console.error);
