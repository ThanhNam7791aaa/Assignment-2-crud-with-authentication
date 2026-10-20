import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/teams/:id/messages - Get team chat message history
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId } = await context.params;

    if (!teamId) {
      return NextResponse.json({ error: "Team ID is required" }, { status: 400 });
    }

    // Check team existence & membership
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { userId: user.id },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isOwner = team.ownerId === user.id;
    const isMember = team.members.length > 0;

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { error: "Access denied. You are not a member of this team." },
        { status: 403 }
      );
    }

    const messages = await prisma.message.findMany({
      where: { teamId },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch team messages" },
      { status: 500 }
    );
  }
}

// POST /api/teams/:id/messages - Send a new message to the team chat
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: teamId } = await context.params;

    if (!teamId) {
      return NextResponse.json({ error: "Team ID is required" }, { status: 400 });
    }

    // Check team existence & membership
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { userId: user.id },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const isOwner = team.ownerId === user.id;
    const isMember = team.members.length > 0;

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { error: "Access denied. You are not a member of this team." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    const newMessage = await prisma.message.create({
      data: {
        content: content.trim(),
        teamId,
        senderId: user.id,
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
