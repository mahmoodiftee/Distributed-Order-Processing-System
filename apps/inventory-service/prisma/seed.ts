import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    await prisma.product.createMany({
        data: [
            { id: 'product-1', name: 'Laptop', stock: 10, price: 999.99 },
            { id: 'product-2', name: 'Phone', stock: 25, price: 499.99 },
            { id: 'product-3', name: 'Headphones', stock: 0, price: 99.99 },
        ],
    });

    console.log('Products seeded');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());