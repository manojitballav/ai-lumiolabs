import { Project, Deployment, ProjectType } from "@prisma/client";
import { DOCKERFILE_TEMPLATES } from "./deployment";

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || "ai-lumiolabs";
const GCP_REGION = process.env.GCP_REGION || "us-central1";

interface CloudBuildResponse {
  name: string;
  metadata: {
    build: {
      id: string;
      status: string;
      logUrl: string;
    };
  };
}

// Get access token using Application Default Credentials
async function getAccessToken(): Promise<string> {
  // In Cloud Run, we can use the metadata server
  const metadataUrl =
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

  try {
    const response = await fetch(metadataUrl, {
      headers: { "Metadata-Flavor": "Google" },
    });

    if (response.ok) {
      const data = await response.json();
      return data.access_token;
    }
  } catch {
    // Not running in GCP, try local credentials
  }

  // For local development, use gcloud auth
  // This requires running: gcloud auth application-default login
  const { execSync } = await import("child_process");
  try {
    const token = execSync("gcloud auth print-access-token", {
      encoding: "utf-8",
    }).trim();
    return token;
  } catch {
    throw new Error(
      "Failed to get access token. Run: gcloud auth application-default login"
    );
  }
}

export async function submitCloudBuild(
  project: Project,
  deployment: Deployment
): Promise<string> {
  const accessToken = await getAccessToken();

  const imageTag = `gcr.io/${GCP_PROJECT_ID}/${project.subdomain}:v${deployment.version}`;
  const serviceName = `project-${project.subdomain}`;

  // Get the appropriate Dockerfile template
  const dockerfile = DOCKERFILE_TEMPLATES[project.projectType as ProjectType];

  // Build configuration
  const buildConfig = {
    steps: [
      // Clone repository
      {
        name: "gcr.io/cloud-builders/git",
        args: [
          "clone",
          "--depth",
          "1",
          "--branch",
          deployment.branch,
          project.repoUrl,
          "/workspace/app",
        ],
        id: "clone",
      },
      // Create Dockerfile
      {
        name: "ubuntu",
        entrypoint: "bash",
        args: [
          "-c",
          `cat > /workspace/app/Dockerfile << 'DOCKERFILE'\n${dockerfile}\nDOCKERFILE`,
        ],
        id: "create-dockerfile",
        waitFor: ["clone"],
      },
      // Build Docker image
      {
        name: "gcr.io/cloud-builders/docker",
        args: [
          "build",
          "-t",
          imageTag,
          "-t",
          `gcr.io/${GCP_PROJECT_ID}/${project.subdomain}:latest`,
          "--build-arg",
          `BUILD_CMD=${project.buildCmd || ""}`,
          "--build-arg",
          `START_CMD=${project.startCmd || "npm start"}`,
          "--build-arg",
          `PORT=${project.port}`,
          "/workspace/app",
        ],
        id: "build",
        waitFor: ["create-dockerfile"],
      },
      // Push to GCR
      {
        name: "gcr.io/cloud-builders/docker",
        args: ["push", imageTag],
        id: "push",
        waitFor: ["build"],
      },
      // Deploy to Cloud Run
      {
        name: "gcr.io/google.com/cloudsdktool/cloud-sdk",
        entrypoint: "gcloud",
        args: [
          "run",
          "deploy",
          serviceName,
          `--image=${imageTag}`,
          `--region=${GCP_REGION}`,
          "--platform=managed",
          "--allow-unauthenticated",
          `--port=${project.port}`,
          "--memory=512Mi",
          "--cpu=1",
          "--min-instances=0",
          "--max-instances=10",
          // Add environment variables if present
          ...(project.envVars && typeof project.envVars === "object"
            ? Object.entries(project.envVars as Record<string, string>).flatMap(
                ([key, value]) => ["--set-env-vars", `${key}=${value}`]
              )
            : []),
        ],
        id: "deploy",
        waitFor: ["push"],
      },
    ],
    images: [imageTag],
    options: {
      logging: "CLOUD_LOGGING_ONLY",
      machineType: "E2_MEDIUM",
    },
    timeout: "1200s", // 20 minute timeout
    tags: [`project-${project.subdomain}`, `deployment-${deployment.id}`],
  };

  // Submit build
  const response = await fetch(
    `https://cloudbuild.googleapis.com/v1/projects/${GCP_PROJECT_ID}/builds`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildConfig),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to submit Cloud Build: ${error}`);
  }

  const data: CloudBuildResponse = await response.json();
  return data.metadata.build.id;
}

export async function getBuildStatus(buildId: string): Promise<{
  status: string;
  logUrl?: string;
  finishTime?: string;
  startTime?: string;
}> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `https://cloudbuild.googleapis.com/v1/projects/${GCP_PROJECT_ID}/builds/${buildId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get build status: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    status: data.status,
    logUrl: data.logUrl,
    finishTime: data.finishTime,
    startTime: data.startTime,
  };
}

export async function cancelCloudBuild(buildId: string): Promise<void> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `https://cloudbuild.googleapis.com/v1/projects/${GCP_PROJECT_ID}/builds/${buildId}:cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to cancel build: ${response.statusText}`);
  }
}

export async function* streamBuildLogs(
  buildId: string
): AsyncGenerator<string> {
  const accessToken = await getAccessToken();

  // Get the log URL from build status
  const buildStatus = await getBuildStatus(buildId);

  if (!buildStatus.logUrl) {
    yield "No logs available yet...";
    return;
  }

  // Cloud Build logs are stored in Cloud Storage
  // The logUrl points to the console, but we need to fetch from GCS
  const logBucket = `${GCP_PROJECT_ID}_cloudbuild`;
  const logObject = `log-${buildId}.txt`;

  let lastSize = 0;
  let isComplete = false;

  while (!isComplete) {
    try {
      // Fetch logs from Cloud Storage
      const response = await fetch(
        `https://storage.googleapis.com/storage/v1/b/${logBucket}/o/${encodeURIComponent(logObject)}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Range: `bytes=${lastSize}-`,
          },
        }
      );

      if (response.ok) {
        const text = await response.text();
        if (text.length > 0) {
          yield text;
          lastSize += text.length;
        }
      }

      // Check if build is complete
      const status = await getBuildStatus(buildId);
      if (
        status.status === "SUCCESS" ||
        status.status === "FAILURE" ||
        status.status === "CANCELLED" ||
        status.status === "TIMEOUT"
      ) {
        isComplete = true;
        yield `\n--- Build ${status.status} ---\n`;
      } else {
        // Wait before polling again
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      // Log might not be available yet
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

// Map Cloud Build status to our DeploymentStatus
export function mapBuildStatusToDeploymentStatus(
  buildStatus: string
): "QUEUED" | "CLONING" | "BUILDING" | "PUSHING" | "DEPLOYING" | "LIVE" | "FAILED" | "CANCELLED" {
  switch (buildStatus) {
    case "QUEUED":
    case "PENDING":
      return "QUEUED";
    case "WORKING":
      return "BUILDING";
    case "SUCCESS":
      return "LIVE";
    case "FAILURE":
    case "TIMEOUT":
    case "INTERNAL_ERROR":
      return "FAILED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "BUILDING";
  }
}
