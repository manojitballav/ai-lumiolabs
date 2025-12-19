"use client";

import { useState, useEffect } from "react";
import { DeploymentStatus } from "@prisma/client";

interface Deployment {
  id: string;
  version: number;
  branch: string;
  commitHash: string | null;
  commitMessage: string | null;
  status: DeploymentStatus;
  triggeredBy: string;
  createdAt: string;
  completedAt: string | null;
  cloudRunUrl: string | null;
}

interface DeploymentHistoryProps {
  projectId: string;
  onSelectDeployment?: (deploymentId: string) => void;
}

const STATUS_COLORS: Record<DeploymentStatus, { bg: string; text: string }> = {
  QUEUED: { bg: "bg-gray-100", text: "text-gray-700" },
  CLONING: { bg: "bg-blue-100", text: "text-blue-700" },
  BUILDING: { bg: "bg-blue-100", text: "text-blue-700" },
  PUSHING: { bg: "bg-blue-100", text: "text-blue-700" },
  DEPLOYING: { bg: "bg-blue-100", text: "text-blue-700" },
  LIVE: { bg: "bg-green-100", text: "text-green-700" },
  FAILED: { bg: "bg-red-100", text: "text-red-700" },
  CANCELLED: { bg: "bg-orange-100", text: "text-orange-700" },
};

function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return then.toLocaleDateString();
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return "...";
  const startDate = new Date(start);
  const endDate = new Date(end);
  const seconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export default function DeploymentHistory({
  projectId,
  onSelectDeployment,
}: DeploymentHistoryProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchDeployments();
  }, [projectId, page]);

  const fetchDeployments = async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/deployments?page=${page}&limit=5`
      );
      const data = await response.json();

      if (page === 1) {
        setDeployments(data.deployments);
      } else {
        setDeployments((prev) => [...prev, ...data.deployments]);
      }
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Failed to fetch deployments:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && page === 1) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 font-medium text-gray-900">Deployment History</h3>
        <div className="flex items-center justify-center py-8">
          <svg
            className="h-6 w-6 animate-spin text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </div>
    );
  }

  if (deployments.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 font-medium text-gray-900">Deployment History</h3>
        <p className="text-center text-sm text-gray-500 py-8">
          No deployments yet. Click "Deploy Now" to start your first deployment.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h3 className="mb-4 font-medium text-gray-900">Deployment History</h3>

      <div className="space-y-3">
        {deployments.map((deployment) => (
          <div
            key={deployment.id}
            onClick={() => onSelectDeployment?.(deployment.id)}
            className={`rounded-lg border border-gray-100 p-4 transition-colors ${
              onSelectDeployment ? "cursor-pointer hover:bg-gray-50" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-gray-500">
                  v{deployment.version}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[deployment.status].bg
                  } ${STATUS_COLORS[deployment.status].text}`}
                >
                  {deployment.status}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {formatRelativeTime(deployment.createdAt)}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                {deployment.branch}
              </span>

              {deployment.commitHash && (
                <span className="font-mono">
                  {deployment.commitHash.substring(0, 7)}
                </span>
              )}

              <span>
                {formatDuration(deployment.createdAt, deployment.completedAt)}
              </span>
            </div>

            {deployment.commitMessage && (
              <p className="mt-2 truncate text-xs text-gray-600">
                {deployment.commitMessage}
              </p>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Load more
        </button>
      )}
    </div>
  );
}
