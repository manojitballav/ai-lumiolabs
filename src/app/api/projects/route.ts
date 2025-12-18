import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/projects - List all projects
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const projects = await prisma.project.findMany({
      include: {
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, subdomain, repoUrl, branch, buildCmd, startCmd } =
      body;

    // Validate required fields
    if (!name || !subdomain) {
      return NextResponse.json(
        { error: "Name and subdomain are required" },
        { status: 400 }
      );
    }

    // Validate subdomain format (lowercase, alphanumeric, hyphens)
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain)) {
      return NextResponse.json(
        {
          error:
            "Subdomain must be lowercase, alphanumeric, and can contain hyphens (not at start/end)",
        },
        { status: 400 }
      );
    }

    // Check if subdomain is already taken
    const existingProject = await prisma.project.findUnique({
      where: { subdomain },
    });

    if (existingProject) {
      return NextResponse.json(
        { error: "Subdomain is already in use" },
        { status: 409 }
      );
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        subdomain,
        repoUrl: repoUrl || null,
        branch: branch || "main",
        buildCmd: buildCmd || null,
        startCmd: startCmd || null,
        ownerId: session.user.id,
        status: "PENDING",
      },
      include: {
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
