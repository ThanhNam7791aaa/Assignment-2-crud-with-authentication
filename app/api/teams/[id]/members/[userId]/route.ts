import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string; userId: string }>;
};

// PUT /api/teams/:id/members/:userId - Change member role (Owner only)
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId, userId: targetUserId } = await context.params;
    const body = await request.json();
    const { role } = body;

    if (!role || !["OWNER", "ADMIN", "MEMBER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Only the primary team owner can change member roles
    if (team.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden. Only the team owner can change member roles." },
        { status: 403 }
      );
    }

    if (targetUserId === team.ownerId && role !== "OWNER") {
      return NextResponse.json(
        { error: "Cannot change the primary owner's role." },
        { status: 400 }
      );
    }

    const updated = await prisma.teamMember.update({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating member role:", error);
    return NextResponse.json(
      { error: "Failed to update member role" },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/:id/members/:userId - Remove a member from a team (Owner or Admin)
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

    if (targetUserId === team.ownerId) {
      return NextResponse.json(
        { error: "Bad request. The team owner cannot be removed from the team." },
        { status: 400 }
      );
    }

    const callerMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.id,
        },
      },
    });

    const isOwner = team.ownerId === user.id || callerMembership?.role === "OWNER";
    const isAdmin = callerMembership?.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden. Only team owners and admins can remove members." },
        { status: 403 }
      );
    }

    const targetMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: "User is not a member of this team." },
        { status: 404 }
      );
    }

    // Admins can only remove regular MEMBERS, not other Admins or Owners
    if (isAdmin && !isOwner && targetMembership.role !== "MEMBER") {
      return NextResponse.json(
        { error: "Forbidden. Admins can only remove regular members." },
        { status: 403 }
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
