import { prisma } from "./prisma";
import { submitCloudBuild, cancelCloudBuild } from "./cloudbuild";
import { DeploymentStatus, ProjectType } from "@prisma/client";

interface CreateDeploymentOptions {
  branch?: string;
  commitHash?: string;
  commitMessage?: string;
  triggeredBy: string;
}

export async function createDeployment(
  projectId: string,
  options: CreateDeploymentOptions
) {
  // Get project details
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { deployments: { orderBy: { version: "desc" }, take: 1 } },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  if (!project.repoUrl) {
    throw new Error("Project has no repository URL configured");
  }

  // Calculate next version number
  const lastVersion = project.deployments[0]?.version ?? 0;
  const nextVersion = lastVersion + 1;

  // Create deployment record
  const deployment = await prisma.deployment.create({
    data: {
      projectId,
      version: nextVersion,
      branch: options.branch || project.branch,
      commitHash: options.commitHash,
      commitMessage: options.commitMessage,
      triggeredBy: options.triggeredBy,
      status: "QUEUED",
    },
  });

  // Update project status to BUILDING
  await prisma.project.update({
    where: { id: projectId },
    data: { status: "BUILDING" },
  });

  // Submit build to Cloud Build
  try {
    const buildId = await submitCloudBuild(project, deployment);

    await prisma.deployment.update({
      where: { id: deployment.id },
      data: {
        buildId,
        status: "CLONING",
        startedAt: new Date(),
      },
    });

    return { deployment: { ...deployment, buildId }, project };
  } catch (error) {
    // Mark deployment as failed if build submission fails
    await prisma.deployment.update({
      where: { id: deployment.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        completedAt: new Date(),
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "FAILED" },
    });

    throw error;
  }
}

export async function updateDeploymentStatus(
  deploymentId: string,
  status: DeploymentStatus,
  extras?: {
    buildLogs?: string;
    errorMessage?: string;
    imageUrl?: string;
    cloudRunUrl?: string;
  }
) {
  const data: Record<string, unknown> = { status, ...extras };

  if (status === "LIVE" || status === "FAILED" || status === "CANCELLED") {
    data.completedAt = new Date();
  }

  const deployment = await prisma.deployment.update({
    where: { id: deploymentId },
    data,
    include: { project: true },
  });

  // Update project status based on deployment status
  if (status === "LIVE") {
    await prisma.project.update({
      where: { id: deployment.projectId },
      data: {
        status: "DEPLOYED",
        lastDeployedAt: new Date(),
        cloudRunService: `project-${deployment.project.subdomain}`,
      },
    });
  } else if (status === "FAILED") {
    await prisma.project.update({
      where: { id: deployment.projectId },
      data: { status: "FAILED" },
    });
  }

  return deployment;
}

export async function cancelDeployment(deploymentId: string) {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId },
  });

  if (!deployment) {
    throw new Error("Deployment not found");
  }

  if (
    deployment.status === "LIVE" ||
    deployment.status === "FAILED" ||
    deployment.status === "CANCELLED"
  ) {
    throw new Error("Cannot cancel a completed deployment");
  }

  // Cancel the Cloud Build job if it exists
  if (deployment.buildId) {
    try {
      await cancelCloudBuild(deployment.buildId);
    } catch (error) {
      console.error("Failed to cancel Cloud Build:", error);
    }
  }

  return updateDeploymentStatus(deploymentId, "CANCELLED");
}

export async function getDeployments(projectId: string, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const [deployments, total] = await Promise.all([
    prisma.deployment.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.deployment.count({ where: { projectId } }),
  ]);

  return {
    deployments,
    total,
    page,
    limit,
    hasMore: skip + deployments.length < total,
  };
}

export async function getDeployment(deploymentId: string) {
  return prisma.deployment.findUnique({
    where: { id: deploymentId },
    include: {
      project: {
        include: { owner: true }
      }
    },
  });
}

// Dockerfile templates for different project types
export const DOCKERFILE_TEMPLATES: Record<ProjectType, string> = {
  NODEJS: `# Node.js Dockerfile
FROM node:20-slim AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production || npm install --only=production

# Copy source
COPY . .

# Build if build command exists
ARG BUILD_CMD=""
RUN if [ -n "$BUILD_CMD" ]; then $BUILD_CMD; fi

# Production stage
FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production

# Copy from builder
COPY --from=builder /app .

# Set port
ARG PORT=8080
ENV PORT=$PORT
EXPOSE $PORT

# Start command
ARG START_CMD="npm start"
CMD $START_CMD
`,

  PYTHON: `# Python Dockerfile
FROM python:3.11-slim
WORKDIR /app

# Install dependencies
COPY requirements.txt* pyproject.toml* ./
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi
RUN if [ -f pyproject.toml ]; then pip install --no-cache-dir .; fi

# Copy source
COPY . .

# Set port
ARG PORT=8080
ENV PORT=$PORT
EXPOSE $PORT

# Start command
ARG START_CMD="python app.py"
CMD $START_CMD
`,

  STATIC: `# Static site Dockerfile
FROM nginx:alpine

# Copy static files
COPY . /usr/share/nginx/html

# Configure nginx for Cloud Run
ARG PORT=8080
RUN echo 'server { \\
    listen $PORT; \\
    location / { \\
        root /usr/share/nginx/html; \\
        index index.html; \\
        try_files $uri $uri/ /index.html; \\
    } \\
}' | sed "s/\\$PORT/$PORT/g" > /etc/nginx/conf.d/default.conf

EXPOSE $PORT

CMD ["nginx", "-g", "daemon off;"]
`,
};
