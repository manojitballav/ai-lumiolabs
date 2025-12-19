"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeployButtonProps {
  projectId: string;
  disabled?: boolean;
  branch?: string;
  onDeployStart?: () => void;
  onDeploySuccess?: (deploymentId: string) => void;
  onDeployError?: (error: string) => void;
}

export default function DeployButton({
  projectId,
  disabled = false,
  branch,
  onDeployStart,
  onDeploySuccess,
  onDeployError,
}: DeployButtonProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const router = useRouter();

  const handleDeploy = async () => {
    if (isDeploying || disabled) return;

    setIsDeploying(true);
    onDeployStart?.();

    try {
      const response = await fetch(`/api/projects/${projectId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Deployment failed");
      }

      onDeploySuccess?.(data.deployment.id);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Deployment failed";
      onDeployError?.(message);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <button
      onClick={handleDeploy}
      disabled={isDeploying || disabled}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors
        ${
          isDeploying || disabled
            ? "cursor-not-allowed bg-gray-100 text-gray-400"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
    >
      {isDeploying ? (
        <>
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
          Deploying...
        </>
      ) : (
        <>
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Deploy Now
        </>
      )}
    </button>
  );
}
