import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDeployment } from "@/lib/deployment";
import { streamBuildLogs, getBuildStatus, mapBuildStatusToDeploymentStatus } from "@/lib/cloudbuild";
import { prisma } from "@/lib/prisma";

// GET /api/projects/[id]/deployments/[deploymentId]/logs - Stream deployment logs via SSE
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; deploymentId: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { deploymentId } = await params;

  const deployment = await getDeployment(deploymentId);

  if (!deployment) {
    return new Response("Deployment not found", { status: 404 });
  }

  // If deployment is complete, return stored logs
  if (
    deployment.status === "LIVE" ||
    deployment.status === "FAILED" ||
    deployment.status === "CANCELLED"
  ) {
    const encoder = new TextEncoder();
    const logs = deployment.buildLogs || "No logs available";

    return new Response(
      encoder.encode(
        `data: ${JSON.stringify({ type: "log", content: logs })}\n\n` +
          `data: ${JSON.stringify({ type: "status", status: deployment.status })}\n\n` +
          `data: ${JSON.stringify({ type: "complete" })}\n\n`
      ),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  }

  // Stream logs from Cloud Build
  if (!deployment.buildId) {
    return new Response(
      `data: ${JSON.stringify({ type: "log", content: "Waiting for build to start..." })}\n\n`,
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  }

  const encoder = new TextEncoder();
  let accumulatedLogs = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Stream logs
        for await (const logChunk of streamBuildLogs(deployment.buildId!)) {
          accumulatedLogs += logChunk;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "log", content: logChunk })}\n\n`
            )
          );

          // Check and update status
          const buildStatus = await getBuildStatus(deployment.buildId!);
          const newStatus = mapBuildStatusToDeploymentStatus(buildStatus.status);

          if (newStatus !== deployment.status) {
            await prisma.deployment.update({
              where: { id: deploymentId },
              data: { status: newStatus },
            });

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "status", status: newStatus })}\n\n`
              )
            );

            // Update project status if deployment is complete
            if (newStatus === "LIVE" || newStatus === "FAILED") {
              await prisma.deployment.update({
                where: { id: deploymentId },
                data: {
                  buildLogs: accumulatedLogs,
                  completedAt: new Date(),
                  ...(newStatus === "LIVE"
                    ? { cloudRunUrl: `https://project-${deployment.project.subdomain}-905543205568.${process.env.GCP_REGION || "us-central1"}.run.app` }
                    : {}),
                },
              });

              await prisma.project.update({
                where: { id: deployment.projectId },
                data: {
                  status: newStatus === "LIVE" ? "DEPLOYED" : "FAILED",
                  ...(newStatus === "LIVE" ? { lastDeployedAt: new Date() } : {}),
                },
              });
            }
          }
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "complete" })}\n\n`)
        );
        controller.close();
      } catch (error) {
        console.error("Log streaming error:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: "Failed to stream logs" })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
