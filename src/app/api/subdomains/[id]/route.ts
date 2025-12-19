import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/subdomains/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const mapping = await prisma.subdomainMapping.findUnique({
      where: { id },
      include: {
        owner: { select: { name: true, email: true } },
      },
    });

    if (!mapping) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(mapping);
  } catch (error) {
    console.error("Error fetching subdomain:", error);
    return NextResponse.json(
      { error: "Failed to fetch subdomain" },
      { status: 500 }
    );
  }
}

// PATCH /api/subdomains/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.subdomainMapping.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only edit your own mappings" },
        { status: 403 }
      );
    }

    // Validate target URL if provided
    if (body.targetUrl) {
      try {
        new URL(body.targetUrl);
      } catch {
        return NextResponse.json(
          { error: "Invalid target URL" },
          { status: 400 }
        );
      }
    }

    const mapping = await prisma.subdomainMapping.update({
      where: { id },
      data: {
        name: body.name,
        targetUrl: body.targetUrl,
        isActive: body.isActive,
      },
      include: {
        owner: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(mapping);
  } catch (error) {
    console.error("Error updating subdomain:", error);
    return NextResponse.json(
      { error: "Failed to update subdomain" },
      { status: 500 }
    );
  }
}

// DELETE /api/subdomains/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.subdomainMapping.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only delete your own mappings" },
        { status: 403 }
      );
    }

    await prisma.subdomainMapping.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting subdomain:", error);
    return NextResponse.json(
      { error: "Failed to delete subdomain" },
      { status: 500 }
    );
  }
}
