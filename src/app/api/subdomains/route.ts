import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/subdomains - List all subdomain mappings
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subdomains = await prisma.subdomainMapping.findMany({
      include: {
        owner: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(subdomains);
  } catch (error) {
    console.error("Error fetching subdomains:", error);
    return NextResponse.json(
      { error: "Failed to fetch subdomains" },
      { status: 500 }
    );
  }
}

// POST /api/subdomains - Create a new subdomain mapping
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, subdomain, targetUrl } = body;

    // Validate required fields
    if (!name || !subdomain || !targetUrl) {
      return NextResponse.json(
        { error: "Name, subdomain, and target URL are required" },
        { status: 400 }
      );
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain)) {
      return NextResponse.json(
        { error: "Subdomain must be lowercase alphanumeric with optional hyphens" },
        { status: 400 }
      );
    }

    // Validate target URL
    try {
      new URL(targetUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid target URL" },
        { status: 400 }
      );
    }

    // Check if subdomain exists
    const existing = await prisma.subdomainMapping.findUnique({
      where: { subdomain },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Subdomain already in use" },
        { status: 409 }
      );
    }

    const mapping = await prisma.subdomainMapping.create({
      data: {
        name,
        subdomain,
        targetUrl,
        ownerId: session.user.id,
      },
      include: {
        owner: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json(mapping, { status: 201 });
  } catch (error) {
    console.error("Error creating subdomain:", error);
    return NextResponse.json(
      { error: "Failed to create subdomain mapping" },
      { status: 500 }
    );
  }
}
