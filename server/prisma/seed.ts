import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { id: 'user_1' },
    update: { email: 'em1419@cs.ship.edu' },
    create: {
      id: 'user_1',
      email: 'em1419@cs.ship.edu',
    },
  });

  await prisma.closet.upsert({
    where: { id: 'closet_default' },
    update: {},
    create: {
      id: 'closet_default',
      userId: user.id,
      name: 'My Closet',
      description: null,
    },
  });

  console.log('Seed complete: user_1 + default closet');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
