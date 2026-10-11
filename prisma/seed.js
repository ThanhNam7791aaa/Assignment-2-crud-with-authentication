const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Assignment 2 data...");

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash("Password123!", salt);

  // 1. Create or update Test User (for Grader)
  const testUser = await prisma.user.upsert({
    where: { email: "test@taskflow.com" },
    update: { password: hashedPassword, name: "Grader Account" },
    create: {
      name: "Grader Account",
      email: "test@taskflow.com",
      password: hashedPassword,
    },
  });

  // 2. Create or update Colleague User (for multi-member testing)
  const memberUser = await prisma.user.upsert({
    where: { email: "colleague@taskflow.com" },
    update: { password: hashedPassword, name: "Alice Member" },
    create: {
      name: "Alice Member",
      email: "colleague@taskflow.com",
      password: hashedPassword,
    },
  });

  console.log(`Users seeded: ${testUser.email}, ${memberUser.email}`);

  // 3. Create Sample Team owned by testUser
  let team = await prisma.team.findFirst({
    where: { ownerId: testUser.id, name: "Alpha Core Team" },
  });

  if (!team) {
    team = await prisma.team.create({
      data: {
        name: "Alpha Core Team",
        description: "Primary cross-functional workspace for Assignment 2 team collaboration and task tracking.",
        ownerId: testUser.id,
      },
    });

    // Add Owner
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: testUser.id } },
      update: { role: "OWNER" },
      create: { teamId: team.id, userId: testUser.id, role: "OWNER" },
    });

    // Add Member
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: memberUser.id } },
      update: { role: "MEMBER" },
      create: { teamId: team.id, userId: memberUser.id, role: "MEMBER" },
    });

    console.log(`Sample team created: ${team.name}`);

    // 4. Create Sample Tasks inside the team
    const sampleTasks = [
      {
        title: "Setup User Authentication with JWT & bcrypt",
        description: "Implemented secure registration, login, and cookie-based session management.",
        status: "DONE",
        priority: "HIGH",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        teamId: team.id,
        assigneeId: testUser.id,
        creatorId: testUser.id,
      },
      {
        title: "Build Kanban Board & Role-Based Task Deletion",
        description: "Verify that only the creator, assignee, or team owner can delete a task.",
        status: "IN_PROGRESS",
        priority: "HIGH",
        dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        teamId: team.id,
        assigneeId: memberUser.id,
        creatorId: testUser.id,
      },
      {
        title: "Test Member Invitation by Email Flow",
        description: "Invite new team members using their registered email and verify permission boundaries.",
        status: "TODO",
        priority: "MEDIUM",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        teamId: team.id,
        assigneeId: testUser.id,
        creatorId: testUser.id,
      },
    ];

    for (const task of sampleTasks) {
      await prisma.task.create({ data: task });
    }

    console.log("Sample team tasks created successfully!");
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
