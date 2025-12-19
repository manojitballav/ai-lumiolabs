import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDeployment } from "@/lib/deployment";

// POST /api/projects/[id]/deploy - Trigger a new deployment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the project and verify ownership
    const project = await prisma.project.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.owner.email !== session.user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if there's already an active deployment
    const activeDeployment = await prisma.deployment.findFirst({
      where: {
        projectId: id,
        status: {
          in: ["QUEUED", "CLONING", "BUILDING", "PUSHING", "DEPLOYING"],
        },
      },
    });

    if (activeDeployment) {
      return NextResponse.json(
        { error: "A deployment is already in progress" },
        { status: 409 }
      );
    }

    // Parse request body for optional parameters
    const body = await request.json().catch(() => ({}));
    const { branch } = body;

    // Create and trigger deployment
    const result = await createDeployment(id, {
      branch: branch || project.branch,
      triggeredBy: session.user.email,
    });

    return NextResponse.json({
      success: true,
      deployment: result.deployment,
    });
  } catch (error) {
    console.error("Deploy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Deployment failed" },
      { status: 500 }
    );
  }
}
