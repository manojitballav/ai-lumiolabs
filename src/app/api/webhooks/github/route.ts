import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDeployment } from "@/lib/deployment";
import {
  verifyWebhookSignature,
  parsePushEvent,
  repoUrlMatches,
  GitHubPushEvent,
} from "@/lib/github";

// POST /api/webhooks/github - Receive GitHub webhook events
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("x-hub-signature-256");
    const event = request.headers.get("x-github-event");
    const deliveryId = request.headers.get("x-github-delivery");

    console.log(`Received GitHub webhook: event=${event}, delivery=${deliveryId}`);

    // Verify webhook signature using global secret
    if (!verifyWebhookSignature(payload, signature)) {
      console.error("Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Only handle push events for now
    if (event !== "push") {
      return NextResponse.json({
        message: `Event type '${event}' not handled`,
      });
    }

    const body: GitHubPushEvent = JSON.parse(payload);
    const pushData = parsePushEvent(body);

    console.log(`Push event: repo=${pushData.repoFullName}, branch=${pushData.branch}`);

    // Find projects that match this repository and branch
    const projects = await prisma.project.findMany({
      where: {
        repoUrl: { not: null },
        branch: pushData.branch,
      },
      include: {
        webhookConfig: true,
        owner: true,
      },
    });

    // Filter to projects that match the repo URL and have auto-deploy enabled
    const matchingProjects = projects.filter((project) => {
      if (!project.repoUrl) return false;
      if (!project.webhookConfig?.enabled) return false;
      if (!project.webhookConfig?.autoDeploy) return false;

      return repoUrlMatches(project.repoUrl, pushData.repoUrl);
    });

    if (matchingProjects.length === 0) {
      console.log("No matching projects found for this push event");
      return NextResponse.json({
        message: "No matching projects with auto-deploy enabled",
      });
    }

    // Trigger deployments for all matching projects
    const results = await Promise.allSettled(
      matchingProjects.map(async (project) => {
        console.log(`Triggering deployment for project: ${project.name}`);

        return createDeployment(project.id, {
          branch: pushData.branch,
          commitHash: pushData.commitHash,
          commitMessage: pushData.commitMessage,
          triggeredBy: `webhook:${pushData.pusher}`,
        });
      })
    );

    const successes = results.filter((r) => r.status === "fulfilled").length;
    const failures = results.filter((r) => r.status === "rejected").length;

    console.log(`Deployments triggered: ${successes} success, ${failures} failed`);

    return NextResponse.json({
      message: "Webhook processed",
      triggered: successes,
      failed: failures,
      projects: matchingProjects.map((p) => p.name),
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/webhooks/github - Health check for webhook endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "GitHub webhook endpoint is active",
  });
}
