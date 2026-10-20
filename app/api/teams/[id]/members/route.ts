import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/teams/:id/members - Add a member to a team (Owner or Admin)
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { email, role = "MEMBER" } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required to invite a member." },
        { status: 400 }
      );
    }

    // Check team existence
    const team = await prisma.team.findUnique({
      where: { id },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Check caller's role in the team (Owner or Admin allowed)
    const callerMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId: user.id,
        },
      },
    });

    const isOwner = team.ownerId === user.id || callerMembership?.role === "OWNER";
    const isAdmin = callerMembership?.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden. Only team owners and admins can add members." },
        { status: 403 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!targetUser) {
      return NextResponse.json(
        {
          error: `User with email "${email}" not found. They must register an account first.`,
        },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: id,
          userId: targetUser.id,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: `User "${targetUser.name}" is already a member of this team.` },
        { status: 409 }
      );
    }

    // Determine assigned role: Only Owner can assign "ADMIN" or "OWNER"
    let assignedRole = "MEMBER";
    if (role === "ADMIN" && isOwner) {
      assignedRole = "ADMIN";
    }

    const newMember = await prisma.teamMember.create({
      data: {
        teamId: id,
        userId: targetUser.id,
        role: assignedRole,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Send in-app notification to the newly added member
    await prisma.notification.create({
      data: {
        userId: targetUser.id,
        title: "Added to Team",
        message: `You were added to team "${team.name}" by ${user.name}.`,
        link: `/teams/${id}`,
      },
    });

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error("Error adding member:", error);
    return NextResponse.json(
      { error: "Failed to add member to team" },
      { status: 500 }
    );
  }
}
