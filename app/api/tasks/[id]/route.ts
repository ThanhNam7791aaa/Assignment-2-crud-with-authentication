import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PUT /api/tasks/[id] - Update a task
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { title, description, status, priority, dueDate, assigneeId } = body;

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: { team: true },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    // Check membership & permissions if task belongs to a team
    if (existingTask.teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId: existingTask.teamId,
            userId: user.id,
          },
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "Forbidden. You are not a member of this team." },
          { status: 403 }
        );
      }

      // Member can only edit their own created/assigned task or update status
      const isOwnerOrAdmin = membership.role === "OWNER" || membership.role === "ADMIN";
      const isCreatorOrAssignee =
        existingTask.creatorId === user.id || existingTask.assigneeId === user.id;

      // If user is a regular member and trying to change title/description/assignee of another person's task
      if (!isOwnerOrAdmin && !isCreatorOrAssignee && (title !== undefined || description !== undefined || assigneeId !== undefined)) {
        return NextResponse.json(
          { error: "Forbidden. Members can only manage their own tasks or update status." },
          { status: 403 }
        );
      }
    }

    // Validate title if present
    if (title !== undefined && (typeof title !== "string" || title.trim() === "")) {
      return NextResponse.json(
        { error: "Task title cannot be empty." },
        { status: 400 }
      );
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    // Send notification if a new assignee was set
    if (
      assigneeId &&
      assigneeId !== existingTask.assigneeId &&
      assigneeId !== user.id
    ) {
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          title: "Task Assigned",
          message: `You were assigned task "${updatedTask.title}" by ${user.name}.`,
          link: existingTask.teamId ? `/teams/${existingTask.teamId}` : "/teams",
        },
      });
    }

    return NextResponse.json(updatedTask, { status: 200 });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete a task
// Rule: Creator, Assignee, Team Admin, or Team Owner can delete a task.
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        team: true,
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    let isTeamAdmin = false;
    let isTeamOwner = existingTask.team?.ownerId === user.id;

    if (existingTask.teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: existingTask.teamId, userId: user.id } },
      });
      if (membership?.role === "ADMIN" || membership?.role === "OWNER") {
        isTeamAdmin = true;
      }
    }

    const isCreator = existingTask.creatorId === user.id;
    const isAssignee = existingTask.assigneeId === user.id;

    if (!isCreator && !isAssignee && !isTeamOwner && !isTeamAdmin) {
      return NextResponse.json(
        {
          error:
            "Forbidden. Only the task creator, assignee, team Admin, or team Owner can delete this task.",
        },
        { status: 403 }
      );
    }

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Task deleted successfully", id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
