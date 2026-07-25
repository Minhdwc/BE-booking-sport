import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SPORTS = [
  { name: 'Cầu lông', slug: 'cau-long' },
  { name: 'Bóng đá mini', slug: 'bong-da-mini' },
  { name: 'Tennis', slug: 'tennis' },
  { name: 'Pickleball', slug: 'pickleball' },
  { name: 'Bóng rổ', slug: 'bong-ro' },
  { name: 'Bóng chuyền', slug: 'bong-chuyen' },
];

async function main() {
  for (const sport of SPORTS) {
    await prisma.sport.upsert({
      where: { slug: sport.slug },
      update: {},
      create: { name: sport.name, slug: sport.slug, status: 'active' },
    });
  }

  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  await prisma.user.upsert({
    where: { email: 'admin@minhducbooking.local' },
    update: {},
    create: {
      name: 'Super Admin',
      username: 'superadmin',
      email: 'admin@minhducbooking.local',
      phone: '0900000000',
      password: adminPassword,
      role: 'admin',
      emailVerified: true,
      isActive: true,
    },
  });

  console.log('Seeded sports + super admin (admin@minhducbooking.local / Admin@123456)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
