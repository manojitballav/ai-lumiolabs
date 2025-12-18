import Link from "next/link";

type ProjectStatus = "PENDING" | "BUILDING" | "DEPLOYED" | "FAILED" | "STOPPED";

interface ProjectCardProps {
  name: string;
  description?: string | null;
  subdomain: string;
  status: ProjectStatus;
  ownerName?: string | null;
  updatedAt: Date;
}

const statusConfig: Record<
  ProjectStatus,
  { color: string; bgColor: string; label: string }
> = {
  PENDING: {
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    label: "Pending",
  },
  BUILDING: {
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    label: "Building",
  },
  DEPLOYED: {
    color: "text-green-600",
    bgColor: "bg-green-100",
    label: "Deployed",
  },
  FAILED: {
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Failed",
  },
  STOPPED: {
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    label: "Stopped",
  },
};

export default function ProjectCard({
  name,
  description,
  subdomain,
  status,
  ownerName,
  updatedAt,
}: ProjectCardProps) {
  const statusInfo = statusConfig[status];
  const projectUrl = `https://${subdomain}.lumiolabs.in`;

  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-gray-300">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
          {description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
              {description}
            </p>
          )}
        </div>
        <span
          className={`ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}
        >
          {statusInfo.label}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
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
            d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
          />
        </svg>
        <Link
          href={projectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 hover:underline truncate"
        >
          {subdomain}.lumiolabs.in
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
        {ownerName && <span>by {ownerName}</span>}
        <span>Updated {formatDate(updatedAt)}</span>
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
