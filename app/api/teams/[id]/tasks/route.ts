import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/teams/:id/tasks - List tasks for a team with optional query filters
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId } = await context.params;

    // Check membership
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied. You are not a member of this team." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assigneeId = searchParams.get("assigneeId");

    const where: any = { teamId };
    if (status && status !== "ALL") where.status = status;
    if (priority && priority !== "ALL") where.priority = priority;
    if (assigneeId && assigneeId !== "ALL") where.assigneeId = assigneeId;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks, { status: 200 });
  } catch (error) {
    console.error("Error fetching team tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST /api/teams/:id/tasks - Create a new task within a team
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId } = await context.params;

    // Check membership and fetch team details
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.id,
        },
      },
      include: {
        team: true,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied. You are not a member of this team." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      status = "TODO",
      priority = "MEDIUM",
      dueDate,
      assigneeId,
    } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { error: "Task title is required." },
        { status: 400 }
      );
    }

    // Verify assignee is a member of the team if provided
    if (assigneeId) {
      const assigneeMembership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: assigneeId,
          },
        },
      });

      if (!assigneeMembership) {
        return NextResponse.json(
          { error: "Assignee must be a member of this team." },
          { status: 400 }
        );
      }
    }

    const newTask = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        teamId,
        assigneeId: assigneeId || null,
        creatorId: user.id,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Notify assigned user if different from creator
    if (assigneeId && assigneeId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          title: "New Task Assigned",
          message: `You were assigned task "${newTask.title}" in team "${membership.team.name}" by ${user.name}.`,
          link: `/teams/${teamId}`,
        },
      });
    }

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error("Error creating team task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
