"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface TeamItem {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  members: Array<{
    id: string;
    userId: string;
    role: string;
    user: { id: string; name: string; email: string };
  }>;
  _count: { tasks: number; members: number };
}

export default function TeamsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create team modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/teams");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to load your teams");
      }
      const data = await res.json();
      setTeams(data);
    } catch (err: any) {
      setError(err.message || "Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else {
        fetchTeams();
      }
    }
  }, [user, authLoading]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      setModalError("Team name is required.");
      return;
    }

    setCreating(true);
    setModalError(null);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeamName.trim(),
          description: newTeamDesc.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create team");
      }

      setTeams((prev) => [data, ...prev]);
      setNewTeamName("");
      setNewTeamDesc("");
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || "Error creating team");
    } finally {
      setCreating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <svg className="h-8 w-8 animate-spin text-indigo-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm font-medium text-slate-500">Loading your teams...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            My Teams
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Collaborate on tasks, manage members, and track progress together
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 transition-all cursor-pointer"
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create New Team
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 shadow-2xs">
          {error}
        </div>
      )}

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-14 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 text-3xl font-bold border border-indigo-100">
            👥
          </div>
          <h3 className="mt-5 text-xl font-bold text-slate-900">
            You don&apos;t belong to any teams yet
          </h3>
          <p className="mt-1.5 text-sm text-slate-600 max-w-sm mx-auto">
            Create your first team to start assigning tasks and collaborating with team members!
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-6 inline-flex items-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 transition cursor-pointer"
          >
            + Create Team Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const isOwner = team.ownerId === user?.id;
            return (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs hover:shadow-lg hover:border-indigo-300 hover:-translate-y-0.5 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                        isOwner
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                      }`}
                    >
                      {isOwner ? "👑 Owner" : "👤 Member"}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {new Date(team.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {team.name}
                  </h3>

                  {team.description && (
                    <p className="mt-2 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {team.description}
                    </p>
                  )}
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                      👥 {team._count?.members || team.members?.length || 1} members
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                      📋 {team._count?.tasks || 0} tasks
                    </span>
                  </div>
                  <span className="text-indigo-600 font-bold group-hover:translate-x-1 transition-transform">
                    Open →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Team Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">
                Create a New Team
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="mt-5 space-y-4">
              {modalError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm font-semibold text-rose-700">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700">
                  Team Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engineering Team, Marketing Group"
                  value={newTeamName}
                  onChange={(e) => {
                    setNewTeamName(e.target.value);
                    if (modalError) setModalError(null);
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700">
                  Description <span className="text-xs font-normal text-slate-400">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your team's objective or focus..."
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50 cursor-pointer transition"
                >
                  {creating ? "Creating..." : "Create Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
