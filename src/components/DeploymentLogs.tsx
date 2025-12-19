"use client";

import { useState, useEffect, useRef } from "react";
import { DeploymentStatus } from "@prisma/client";

interface DeploymentLogsProps {
  projectId: string;
  deploymentId: string;
  onStatusChange?: (status: DeploymentStatus) => void;
  onClose?: () => void;
}

const STATUS_MESSAGES: Record<DeploymentStatus, string> = {
  QUEUED: "Waiting in queue...",
  CLONING: "Cloning repository...",
  BUILDING: "Building Docker image...",
  PUSHING: "Pushing to container registry...",
  DEPLOYING: "Deploying to Cloud Run...",
  LIVE: "Deployment successful!",
  FAILED: "Deployment failed",
  CANCELLED: "Deployment cancelled",
};

export default function DeploymentLogs({
  projectId,
  deploymentId,
  onStatusChange,
  onClose,
}: DeploymentLogsProps) {
  const [logs, setLogs] = useState<string>("");
  const [status, setStatus] = useState<DeploymentStatus>("QUEUED");
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Connect to SSE endpoint
    const eventSource = new EventSource(
      `/api/projects/${projectId}/deployments/${deploymentId}/logs`
    );
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "log") {
          setLogs((prev) => prev + data.content);
        } else if (data.type === "status") {
          setStatus(data.status);
          onStatusChange?.(data.status);
        } else if (data.type === "complete") {
          setIsComplete(true);
          eventSource.close();
        } else if (data.type === "error") {
          setError(data.message);
          eventSource.close();
        }
      } catch (e) {
        console.error("Failed to parse SSE message:", e);
      }
    };

    eventSource.onerror = () => {
      setError("Connection lost. Please refresh to see latest logs.");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [projectId, deploymentId, onStatusChange]);

  // Auto-scroll to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleCancel = async () => {
    try {
      await fetch(`/api/projects/${projectId}/deployments/${deploymentId}`, {
        method: "DELETE",
      });
      eventSourceRef.current?.close();
    } catch (e) {
      console.error("Failed to cancel deployment:", e);
    }
  };

  const isRunning =
    status === "QUEUED" ||
    status === "CLONING" ||
    status === "BUILDING" ||
    status === "PUSHING" ||
    status === "DEPLOYING";

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              isRunning
                ? "animate-pulse bg-blue-500"
                : status === "LIVE"
                  ? "bg-green-500"
                  : status === "FAILED"
                    ? "bg-red-500"
                    : "bg-gray-500"
            }`}
          />
          <span className="text-sm font-medium text-white">
            {STATUS_MESSAGES[status]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isRunning && (
            <button
              onClick={handleCancel}
              className="rounded px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-900/50"
            >
              Cancel
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="rounded px-3 py-1 text-xs font-medium text-gray-400 hover:bg-gray-700"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Logs */}
      <div className="h-80 overflow-auto p-4 font-mono text-xs leading-5 text-gray-300">
        {logs ? (
          <pre className="whitespace-pre-wrap">{logs}</pre>
        ) : (
          <div className="flex items-center gap-2 text-gray-500">
            <svg
              className="h-4 w-4 animate-spin"
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
            Connecting to build logs...
          </div>
        )}

        {error && (
          <div className="mt-4 rounded bg-red-900/50 p-3 text-red-300">
            {error}
          </div>
        )}

        <div ref={logsEndRef} />
      </div>

      {/* Footer */}
      {isComplete && (
        <div
          className={`border-t px-4 py-3 text-sm ${
            status === "LIVE"
              ? "border-green-700 bg-green-900/50 text-green-300"
              : status === "FAILED"
                ? "border-red-700 bg-red-900/50 text-red-300"
                : "border-gray-700 bg-gray-800 text-gray-400"
          }`}
        >
          {status === "LIVE" && (
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Deployment completed successfully
            </div>
          )}
          {status === "FAILED" && (
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Deployment failed. Check logs for details.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
