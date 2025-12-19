import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDeployment, cancelDeployment } from "@/lib/deployment";

// GET /api/projects/[id]/deployments/[deploymentId] - Get deployment details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; deploymentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { deploymentId } = await params;

    const deployment = await getDeployment(deploymentId);

    if (!deployment) {
      return NextResponse.json(
        { error: "Deployment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ deployment });
  } catch (error) {
    console.error("Get deployment error:", error);
    return NextResponse.json(
      { error: "Failed to fetch deployment" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/deployments/[deploymentId] - Cancel deployment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; deploymentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { deploymentId } = await params;

    const deployment = await getDeployment(deploymentId);

    if (!deployment) {
      return NextResponse.json(
        { error: "Deployment not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (deployment.project.owner.email !== session.user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cancelled = await cancelDeployment(deploymentId);

    return NextResponse.json({ deployment: cancelled });
  } catch (error) {
    console.error("Cancel deployment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel deployment" },
      { status: 500 }
    );
  }
}
