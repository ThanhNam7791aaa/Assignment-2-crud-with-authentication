const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Assignment 3 & 4 data (Real-time Collaboration & RBAC)...");

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash("Password123!", salt);

  // 1. Create or update Test User 1 (Owner)
  const user1 = await prisma.user.upsert({
    where: { email: "test@taskflow.com" },
    update: { password: hashedPassword, name: "Grader Account (Owner)" },
    create: {
      name: "Grader Account (Owner)",
      email: "test@taskflow.com",
      password: hashedPassword,
    },
  });

  // 2. Create or update Test User 2 (Member / Admin - for dual-session testing)
  const user2 = await prisma.user.upsert({
    where: { email: "colleague@taskflow.com" },
    update: { password: hashedPassword, name: "Alice Colleague (Member)" },
    create: {
      name: "Alice Colleague (Member)",
      email: "colleague@taskflow.com",
      password: hashedPassword,
    },
  });

  console.log(`Test accounts ready:
  1. ${user1.email} (Password: Password123!)
  2. ${user2.email} (Password: Password123!)`);

  // 3. Create or find Team "Alpha Core Team"
  let team = await prisma.team.findFirst({
    where: { ownerId: user1.id, name: "Alpha Core Team" },
  });

  if (!team) {
    team = await prisma.team.create({
      data: {
        name: "Alpha Core Team",
        description: "Primary shared workspace for Assignment 3 & 4 real-time collaboration, chat, and task management.",
        ownerId: user1.id,
      },
    });
  }

  // 4. Ensure Team Memberships (User1 = OWNER, User2 = MEMBER)
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: user1.id } },
    update: { role: "OWNER" },
    create: { teamId: team.id, userId: user1.id, role: "OWNER" },
  });

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: user2.id } },
    update: { role: "MEMBER" },
    create: { teamId: team.id, userId: user2.id, role: "MEMBER" },
  });

  console.log(`Team '${team.name}' (ID: ${team.id}) members configured.`);

  // 5. Ensure Sample Tasks exist
  const existingTasks = await prisma.task.findMany({
    where: { teamId: team.id },
  });

  if (existingTasks.length === 0) {
    const sampleTasks = [
      {
        title: "Setup Real-time Team Chat Room",
        description: "Enabled persistent chat messages with Supabase Realtime synchronization across active sessions.",
        status: "DONE",
        priority: "HIGH",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        teamId: team.id,
        assigneeId: user1.id,
        creatorId: user1.id,
      },
      {
        title: "Live Kanban Board Updates",
        description: "Test simultaneous drag & drop and status updates across dual browser windows without page refresh.",
        status: "IN_PROGRESS",
        priority: "HIGH",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        teamId: team.id,
        assigneeId: user2.id,
        creatorId: user1.id,
      },
      {
        title: "Verify Advanced 3-Role RBAC (Owner, Admin, Member)",
        description: "Verify that Owners can change roles and delete team, Admins manage tasks/members, and Members manage own tasks.",
        status: "TODO",
        priority: "MEDIUM",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        teamId: team.id,
        assigneeId: user2.id,
        creatorId: user1.id,
      },
    ];

    for (const t of sampleTasks) {
      await prisma.task.create({ data: t });
    }
    console.log("Sample tasks created.");
  }

  // 6. Ensure Sample Messages exist
  const existingMessages = await prisma.message.findMany({
    where: { teamId: team.id },
  });

  if (existingMessages.length === 0) {
    await prisma.message.create({
      data: {
        content: "Hello team! Welcome to Alpha Core Team real-time chat room. 🚀",
        teamId: team.id,
        senderId: user1.id,
      },
    });

    await prisma.message.create({
      data: {
        content: "Hi! Excited to test real-time collaboration, live task updates, and notifications together. 👍",
        teamId: team.id,
        senderId: user2.id,
      },
    });
    console.log("Sample chat messages created.");
  }

  // 7. Ensure Sample Notifications exist
  const existingNotifs = await prisma.notification.findMany({
    where: { userId: user2.id },
  });

  if (existingNotifs.length === 0) {
    await prisma.notification.create({
      data: {
        userId: user2.id,
        title: "Welcome to Team",
        message: `You were added to team "${team.name}" as MEMBER.`,
        link: `/teams/${team.id}`,
        read: false,
      },
    });

    await prisma.notification.create({
      data: {
        userId: user2.id,
        title: "New Task Assigned",
        message: 'You have been assigned to task: "Live Kanban Board Updates"',
        link: `/teams/${team.id}`,
        read: false,
      },
    });

    await prisma.notification.create({
      data: {
        userId: user1.id,
        title: "Team Initialized",
        message: `Team "${team.name}" is fully configured with Real-time Chat and Live Tasks.`,
        link: `/teams/${team.id}`,
        read: true,
      },
    });
    console.log("Sample notifications created.");
  }

  console.log("Assignment 3 & 4 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
