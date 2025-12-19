"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EnvVarsEditor from "./EnvVarsEditor";
import DeployButton from "./DeployButton";
import DeploymentHistory from "./DeploymentHistory";
import DeploymentLogs from "./DeploymentLogs";

type ProjectStatus = "PENDING" | "BUILDING" | "DEPLOYED" | "FAILED" | "STOPPED";
type ProjectType = "NODEJS" | "PYTHON" | "STATIC";

interface Project {
  id: string;
  name: string;
  description: string | null;
  subdomain: string;
  repoUrl: string | null;
  branch: string;
  buildCmd: string | null;
  startCmd: string | null;
  envVars: Record<string, string> | null;
  status: ProjectStatus;
  projectType: ProjectType;
  port: number;
  lastDeployedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface ProjectDetailsProps {
  project: Project;
  isOwner: boolean;
}

const statusConfig: Record<
  ProjectStatus,
  { color: string; bgColor: string; label: string }
> = {
  PENDING: { color: "text-gray-600", bgColor: "bg-gray-100", label: "Pending" },
  BUILDING: { color: "text-blue-600", bgColor: "bg-blue-100", label: "Building" },
  DEPLOYED: { color: "text-green-600", bgColor: "bg-green-100", label: "Deployed" },
  FAILED: { color: "text-red-600", bgColor: "bg-red-100", label: "Failed" },
  STOPPED: { color: "text-orange-600", bgColor: "bg-orange-100", label: "Stopped" },
};

export default function ProjectDetails({
  project,
  isOwner,
}: ProjectDetailsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description || "",
    subdomain: project.subdomain,
    repoUrl: project.repoUrl || "",
    branch: project.branch,
    projectType: project.projectType,
    buildCmd: project.buildCmd || "",
    startCmd: project.startCmd || "",
  });

  const statusInfo = statusConfig[project.status];
  const projectUrl = `https://${project.subdomain}.lumiolabs.in`;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update project");
      }

      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this project? This cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete project");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* Back Link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
        Back to Projects
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {isEditing ? (
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none bg-transparent"
            />
          ) : (
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          )}
          <div className="mt-2 flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}
            >
              {statusInfo.label}
            </span>
            <Link
              href={projectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              {project.subdomain}.lumiolabs.in
            </Link>
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Details Card */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Description */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-500 mb-2">Description</h2>
          {isEditing ? (
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Project description"
            />
          ) : (
            <p className="text-gray-900">
              {project.description || "No description"}
            </p>
          )}
        </div>

        {/* Git Repository */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-500 mb-2">
            Git Repository
          </h2>
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="url"
                name="repoUrl"
                value={formData.repoUrl}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="https://github.com/org/repo"
              />
              <input
                type="text"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Branch"
              />
            </div>
          ) : (
            <div className="space-y-1">
              {project.repoUrl ? (
                <Link
                  href={project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {project.repoUrl}
                </Link>
              ) : (
                <span className="text-gray-400">Not configured</span>
              )}
              <p className="text-sm text-gray-500">Branch: {project.branch}</p>
            </div>
          )}
        </div>

        {/* Build Configuration */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-500 mb-2">
            Build Configuration
          </h2>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Project Type
                </label>
                <select
                  name="projectType"
                  value={formData.projectType}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="NODEJS">Node.js</option>
                  <option value="PYTHON">Python</option>
                  <option value="STATIC">Static Site</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Build Command
                  </label>
                  <input
                    type="text"
                    name="buildCmd"
                    value={formData.buildCmd}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                    placeholder={formData.projectType === "STATIC" ? "Not needed for static sites" : "npm run build"}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Start Command
                  </label>
                  <input
                    type="text"
                    name="startCmd"
                    value={formData.startCmd}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
                    placeholder={formData.projectType === "STATIC" ? "Not needed for static sites" : "npm start"}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Project Type</p>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  {project.projectType === "NODEJS" ? "Node.js" : project.projectType === "PYTHON" ? "Python" : "Static Site"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Build Command</p>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {project.buildCmd || "Not set"}
                  </code>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Start Command</p>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {project.startCmd || "Not set"}
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Environment Variables */}
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-500 mb-4">
            Environment Variables
          </h2>
          {isOwner ? (
            <EnvVarsEditor
              projectId={project.id}
              initialEnvVars={project.envVars}
              onUpdate={() => router.refresh()}
            />
          ) : project.envVars && Object.keys(project.envVars).length > 0 ? (
            <div className="space-y-2">
              {Object.keys(project.envVars).map((key) => (
                <div
                  key={key}
                  className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded"
                >
                  <span className="font-mono text-sm">{key}</span>
                  <span className="text-gray-400 text-sm">••••••••</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No environment variables configured</p>
          )}
        </div>

        {/* Metadata */}
        <div className="p-6 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Owner</p>
              <p className="text-gray-900">
                {project.owner.name || project.owner.email}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Created</p>
              <p className="text-gray-900">
                {new Date(project.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Section */}
      {isOwner && (
        <DeploymentSection project={project} />
      )}
    </div>
  );
}

// Deployment section component
function DeploymentSection({ project }: { project: Project }) {
  const [activeDeploymentId, setActiveDeploymentId] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const router = useRouter();

  const canDeploy = project.repoUrl && project.status !== "BUILDING";

  const handleDeployStart = () => {
    setDeployError(null);
  };

  const handleDeploySuccess = (deploymentId: string) => {
    setActiveDeploymentId(deploymentId);
  };

  const handleDeployError = (error: string) => {
    setDeployError(error);
  };

  const handleLogsClose = () => {
    setActiveDeploymentId(null);
    router.refresh();
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Deploy Button Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">Deployment</h3>
            <p className="text-sm text-gray-500 mt-1">
              {project.lastDeployedAt
                ? `Last deployed ${formatRelativeTime(project.lastDeployedAt)}`
                : "Never deployed"}
            </p>
          </div>
          <DeployButton
            projectId={project.id}
            disabled={!canDeploy}
            branch={project.branch}
            onDeployStart={handleDeployStart}
            onDeploySuccess={handleDeploySuccess}
            onDeployError={handleDeployError}
          />
        </div>

        {!project.repoUrl && (
          <p className="mt-3 text-sm text-amber-600">
            Configure a Git repository to enable deployments.
          </p>
        )}

        {deployError && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {deployError}
          </div>
        )}
      </div>

      {/* Active Deployment Logs */}
      {activeDeploymentId && (
        <DeploymentLogs
          projectId={project.id}
          deploymentId={activeDeploymentId}
          onClose={handleLogsClose}
        />
      )}

      {/* Deployment History */}
      <DeploymentHistory
        projectId={project.id}
        onSelectDeployment={setActiveDeploymentId}
      />

      {/* Webhook Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-medium text-gray-900 mb-3">GitHub Webhook</h3>
        <p className="text-sm text-gray-500 mb-4">
          Configure a webhook in your GitHub repository to enable automatic deployments on push.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
          <p className="text-gray-500 text-xs mb-1">Webhook URL:</p>
          <p className="text-gray-900 break-all">
            https://lumiolabs.in/api/webhooks/github
          </p>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Content type: application/json • Secret: Configure GITHUB_WEBHOOK_SECRET in your environment
        </p>
      </div>
    </div>
  );
}

function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return then.toLocaleDateString();
}
