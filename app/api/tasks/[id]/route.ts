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

    // If task belongs to a team, verify current user is a member of that team
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
          { error: "Forbidden. You are not a member of this task's team." },
          { status: 403 }
        );
      }

      // If updating assignee, verify new assignee belongs to team
      if (assigneeId) {
        const assigneeMember = await prisma.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: existingTask.teamId,
              userId: assigneeId,
            },
          },
        });

        if (!assigneeMember) {
          return NextResponse.json(
            { error: "Assignee must be a member of this team." },
            { status: 400 }
          );
        }
      }
    }

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
// Rule: Only the task creator, the assignee, or the team Owner can delete a task.
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

    // Check authorization:
    // User must be:
    // 1. Task creator (creatorId === user.id)
    // 2. Task assignee (assigneeId === user.id)
    // 3. Team Owner (team?.ownerId === user.id)
    const isCreator = existingTask.creatorId === user.id;
    const isAssignee = existingTask.assigneeId === user.id;
    const isTeamOwner = existingTask.team?.ownerId === user.id;

    if (!isCreator && !isAssignee && !isTeamOwner) {
      return NextResponse.json(
        {
          error:
            "Forbidden. Only the task creator, the assignee, or the team Owner can delete this task.",
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
