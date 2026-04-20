import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("lokertlokemgl11", 10);
  
  const user = await prisma.user.upsert({
    where: { email: "unubo@admin.com" },
    update: {},
    create: {
      username: "unubo",
      email: "unubo@admin.com",
      password: hashedPassword,
      role: "admin",
    },
  });

  console.log("Admin user created:", user);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
