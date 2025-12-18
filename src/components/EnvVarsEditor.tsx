"use client";

import { useState } from "react";

interface EnvVarsEditorProps {
  projectId: string;
  initialEnvVars: Record<string, string> | null;
  onUpdate: () => void;
}

export default function EnvVarsEditor({
  projectId,
  initialEnvVars,
  onUpdate,
}: EnvVarsEditorProps) {
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>(
    initialEnvVars
      ? Object.entries(initialEnvVars).map(([key, value]) => ({ key, value }))
      : []
  );
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  const addEnvVar = () => {
    if (!newKey.trim()) return;

    // Check for duplicate keys
    if (envVars.some((v) => v.key === newKey.trim())) {
      setError("Variable with this key already exists");
      return;
    }

    setEnvVars([...envVars, { key: newKey.trim(), value: newValue }]);
    setNewKey("");
    setNewValue("");
    setError("");
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const updateEnvVar = (index: number, field: "key" | "value", value: string) => {
    const updated = [...envVars];
    updated[index][field] = value;
    setEnvVars(updated);
  };

  const toggleShowValue = (key: string) => {
    setShowValues((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveEnvVars = async () => {
    setIsSaving(true);
    setError("");

    try {
      // Convert array to object
      const envVarsObject: Record<string, string> = {};
      for (const { key, value } of envVars) {
        if (key.trim()) {
          envVarsObject[key.trim()] = value;
        }
      }

      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ envVars: envVarsObject }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save environment variables");
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Existing Variables */}
      {envVars.length > 0 && (
        <div className="space-y-2">
          {envVars.map((envVar, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg"
            >
              <input
                type="text"
                value={envVar.key}
                onChange={(e) => updateEnvVar(index, "key", e.target.value)}
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm font-mono focus:border-blue-500 focus:outline-none"
                placeholder="KEY"
              />
              <span className="text-gray-400">=</span>
              <div className="flex-1 flex items-center gap-1">
                <input
                  type={showValues[envVar.key] ? "text" : "password"}
                  value={envVar.value}
                  onChange={(e) => updateEnvVar(index, "value", e.target.value)}
                  className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm font-mono focus:border-blue-500 focus:outline-none"
                  placeholder="value"
                />
                <button
                  type="button"
                  onClick={() => toggleShowValue(envVar.key)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  {showValues[envVar.key] ? (
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
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
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
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeEnvVar(index)}
                className="p-1 text-red-400 hover:text-red-600"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add New Variable */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
          placeholder="NEW_KEY"
        />
        <span className="text-gray-400">=</span>
        <input
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
          placeholder="value"
        />
        <button
          type="button"
          onClick={addEnvVar}
          disabled={!newKey.trim()}
          className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={saveEnvVars}
          disabled={isSaving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Environment Variables"}
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Environment variables will be available to your project at runtime.
        Values are encrypted at rest.
      </p>
    </div>
  );
}
