"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SubdomainMapping {
  id: string;
  name: string;
  subdomain: string;
  targetUrl: string;
  isActive: boolean;
  ownerId: string;
  createdAt: string;
  owner: {
    name: string | null;
    email: string | null;
  };
}

interface DashboardContentProps {
  subdomains: SubdomainMapping[];
  userId: string;
}

export default function DashboardContent({
  subdomains: initialSubdomains,
  userId,
}: DashboardContentProps) {
  const router = useRouter();
  const [subdomains, setSubdomains] = useState(initialSubdomains);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    subdomain: "",
    targetUrl: "",
  });

  const resetForm = () => {
    setFormData({ name: "", subdomain: "", targetUrl: "" });
    setError("");
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/subdomains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create");
      }

      setSubdomains([data, ...subdomains]);
      setIsAdding(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/subdomains/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          targetUrl: formData.targetUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update");
      }

      setSubdomains(subdomains.map((s) => (s.id === id ? data : s)));
      setEditingId(null);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this subdomain mapping?")) return;

    try {
      const res = await fetch(`/api/subdomains/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }

      setSubdomains(subdomains.filter((s) => s.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const startEdit = (subdomain: SubdomainMapping) => {
    setEditingId(subdomain.id);
    setFormData({
      name: subdomain.name,
      subdomain: subdomain.subdomain,
      targetUrl: subdomain.targetUrl,
    });
    setError("");
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subdomain Mappings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Map subdomains to external URLs
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => {
              setIsAdding(true);
              resetForm();
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Subdomain
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Add Form */}
      {isAdding && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">New Subdomain</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="My Service"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain</label>
              <div className="flex rounded-lg border border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <input
                  type="text"
                  required
                  value={formData.subdomain}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    })
                  }
                  className="flex-1 rounded-l-lg border-0 px-3 py-2 text-sm focus:outline-none focus:ring-0"
                  placeholder="my-service"
                />
                <span className="inline-flex items-center rounded-r-lg bg-gray-50 px-3 text-sm text-gray-500">
                  .lumiolabs.in
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target URL</label>
              <input
                type="url"
                required
                value={formData.targetUrl}
                onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="https://my-app.example.com"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isLoading ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  resetForm();
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subdomains List */}
      {subdomains.length > 0 ? (
        <div className="space-y-4">
          {subdomains.map((subdomain) => (
            <div
              key={subdomain.id}
              className="rounded-xl border border-gray-200 bg-white p-6"
            >
              {editingId === subdomain.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target URL</label>
                    <input
                      type="url"
                      value={formData.targetUrl}
                      onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleUpdate(subdomain.id)}
                      disabled={isLoading}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoading ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        resetForm();
                      }}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{subdomain.name}</h3>
                    <a
                      href={`https://${subdomain.subdomain}.lumiolabs.in`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-sm text-blue-600 hover:underline"
                    >
                      {subdomain.subdomain}.lumiolabs.in
                    </a>
                    <p className="mt-2 text-sm text-gray-500">
                      <span className="font-medium">Target:</span>{" "}
                      <a
                        href={subdomain.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-700 hover:underline"
                      >
                        {subdomain.targetUrl}
                      </a>
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      By {subdomain.owner.name || subdomain.owner.email}
                    </p>
                  </div>
                  {subdomain.ownerId === userId && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(subdomain)}
                        className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(subdomain.id)}
                        className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        !isAdding && (
          <div className="text-center py-16">
            <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No subdomain mappings</h3>
            <p className="mt-2 text-sm text-gray-500">Add your first subdomain mapping.</p>
            <button
              onClick={() => setIsAdding(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Add Subdomain
            </button>
          </div>
        )
      )}
    </div>
  );
}
