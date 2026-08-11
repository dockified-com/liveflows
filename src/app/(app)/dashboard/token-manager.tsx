"use client";

import { useState } from "react";
import { createTokenAction, deleteTokenAction } from "./actions";

type Token = {
  id: string;
  name: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

export function TokenManager({ tokens }: { tokens: Token[] }) {
  const [newToken, setNewToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(formData: FormData) {
    setLoading(true);
    setError(null);
    setNewToken(null);
    const res = await createTokenAction(formData);
    if (res.error) {
      setError(res.error);
    } else if (res.token) {
      setNewToken(res.token);
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to revoke this token?")) return;
    const res = await deleteTokenAction(id);
    if (res.error) {
      alert(res.error);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Personal Access Tokens</h2>
        <p className="text-sm text-gray-500 mb-4">
          Tokens you have generated that can be used to access the MCP API.
        </p>

        {newToken && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md mb-6">
            <h3 className="text-sm font-medium text-green-800">
              New Token Generated!
            </h3>
            <p className="text-sm text-green-700 mt-1">
              Make sure to copy your personal access token now. You won't be
              able to see it again!
            </p>
            <code className="block mt-2 p-2 bg-green-100 rounded text-green-900 font-mono text-sm break-all">
              {newToken}
            </code>
          </div>
        )}

        <div className="bg-white border rounded-lg overflow-hidden">
          <ul className="divide-y">
            {tokens.map((pat) => (
              <li
                key={pat.id}
                className="p-4 flex justify-between items-center"
              >
                <div>
                  <div className="font-medium text-sm">{pat.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Created {new Date(pat.createdAt).toLocaleDateString()}
                    {pat.lastUsedAt &&
                      ` · Last used ${new Date(pat.lastUsedAt).toLocaleDateString()}`}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(pat.id)}
                  className="text-red-600 text-sm hover:text-red-800"
                >
                  Revoke
                </button>
              </li>
            ))}
            {tokens.length === 0 && (
              <li className="p-4 text-sm text-gray-500 text-center">
                No tokens generated yet.
              </li>
            )}
          </ul>
        </div>
      </div>

      <form action={handleCreate} className="space-y-4 max-w-sm">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Generate new token
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            placeholder="What's this token for?"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Token"}
        </button>
      </form>
    </div>
  );
}
