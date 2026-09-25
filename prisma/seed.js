const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding sample tasks...");

  const existingCount = await prisma.task.count();
  if (existingCount > 0) {
    console.log(`Database already has ${existingCount} tasks. Skipping seed.`);
    return;
  }

  const sampleTasks = [
    {
      title: "Set up Supabase PostgreSQL & Prisma ORM",
      description: "Initialize Prisma schema, define models (User, Team, TeamMember, Task), and run initial migration.",
      status: "DONE",
      priority: "HIGH",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Build Task CRUD API endpoints & Homepage UI",
      description: "Implement GET, POST, PUT, DELETE route handlers and responsive UI with client validation and status filter.",
      status: "DONE",
      priority: "HIGH",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Deploy TaskFlow live application to Vercel",
      description: "Connect GitHub repository, configure DATABASE_URL and DIRECT_URL environment variables in Vercel.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Implement Team & Member Management (Assignment 2)",
      description: "Prepare collaborative team workspaces, role-based access control (RBAC), and team task delegation.",
      status: "TODO",
      priority: "MEDIUM",
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const task of sampleTasks) {
    await prisma.task.create({ data: task });
  }

  console.log("Successfully seeded 4 sample tasks!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
