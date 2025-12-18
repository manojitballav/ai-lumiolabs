"use client";

import { useState } from "react";
import Link from "next/link";
import ProjectCard from "./ProjectCard";
import AddProjectModal from "./AddProjectModal";

type ProjectStatus = "PENDING" | "BUILDING" | "DEPLOYED" | "FAILED" | "STOPPED";

interface Project {
  id: string;
  name: string;
  description: string | null;
  subdomain: string;
  status: ProjectStatus;
  updatedAt: Date;
  owner: {
    name: string | null;
  };
}

interface DashboardContentProps {
  projects: Project[];
  userEmail: string;
}

export default function DashboardContent({
  projects,
  userEmail,
}: DashboardContentProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">
            AI projects deployed on lumiolabs.in
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
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
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Add Project
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <ProjectCard
                name={project.name}
                description={project.description}
                subdomain={project.subdomain}
                status={project.status}
                ownerName={project.owner.name}
                updatedAt={new Date(project.updatedAt)}
              />
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-16 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No projects yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Get started by creating your first project.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
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
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            Create Project
          </button>
        </div>
      )}

      {/* User Info */}
      <div className="mt-12 rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">
          Signed in as{" "}
          <span className="font-medium text-gray-900">{userEmail}</span>
        </p>
      </div>

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
