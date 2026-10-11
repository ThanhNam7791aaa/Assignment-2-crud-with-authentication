import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string; userId: string }>;
};

// DELETE /api/teams/:id/members/:userId - Remove a member from a team (Owner only)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId, userId: targetUserId } = await context.params;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    if (team.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden. Only the team owner can remove members." },
        { status: 403 }
      );
    }

    if (targetUserId === team.ownerId) {
      return NextResponse.json(
        { error: "Bad request. The team owner cannot be removed from the team." },
        { status: 400 }
      );
    }

    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "User is not a member of this team." },
        { status: 404 }
      );
    }

    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
    });

    // Unassign tasks assigned to this removed member
    await prisma.task.updateMany({
      where: {
        teamId,
        assigneeId: targetUserId,
      },
      data: {
        assigneeId: null,
      },
    });

    return NextResponse.json(
      { message: "Member removed from team successfully", userId: targetUserId },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member from team" },
      { status: 500 }
    );
  }
}
