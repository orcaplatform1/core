import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  const username = 'demo';
  const password = await bcrypt.hash('123456', 10);

  const user = await prisma.user.upsert({
    where: { username },
    update: { password, role: 'STUDENT', profileComplete: true },
    create: {
      username,
      password,
      fullName: 'Demo Kullanıcı',
      role: 'STUDENT',
      profileComplete: true,
      emailVerified: true,
    },
  });

  console.log(`Demo kullanıcı hazır: ${user.username} (id: ${user.id}, role: ${user.role})`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
