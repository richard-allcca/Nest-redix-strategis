import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const products = [
  {
    id: "product-teclado",
    name: "Teclado mecánico",
    description: "Diseño compacto con conexión USB-C.",
    priceCents: 8999,
  },
  {
    id: "product-raton",
    name: "Ratón inalámbrico",
    description: "Ratón ergonómico con sensor óptico.",
    priceCents: 4599,
  },
  {
    id: "product-monitor",
    name: "Monitor 27 pulgadas",
    description: "Panel IPS con resolución QHD.",
    priceCents: 24999,
  },
];

async function main(): Promise<void> {
  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: product,
      create: product,
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error("No se pudieron cargar los productos de ejemplo.", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());