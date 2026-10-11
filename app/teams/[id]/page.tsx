"use client";

import { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface TeamMemberItem {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; email: string };
}

interface TeamTaskItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  teamId: string | null;
  assigneeId: string | null;
  creatorId: string | null;
  createdAt: string;
  assignee: { id: string; name: string; email: string } | null;
  creator: { id: string; name: string; email: string } | null;
}

interface TeamDetail {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  members: TeamMemberItem[];
  tasks: TeamTaskItem[];
}

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("MEMBER");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: "tasks" | "members"
  const [activeTab, setActiveTab] = useState<"tasks" | "members">("tasks");

  // View mode: "kanban" | "table"
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  // Filters (Bonus mark)
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TeamTaskItem | null>(null);

  // Create task form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskStatus, setTaskStatus] = useState("TODO");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  // Add member form state
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("MEMBER");
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  // Edit team form state
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamDesc, setEditTeamDesc] = useState("");
  const [editTeamLoading, setEditTeamLoading] = useState(false);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/teams/${id}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load team");
      }
      const data = await res.json();
      setTeam(data.team);
      setIsOwner(data.isOwner);
      setCurrentUserRole(data.currentUserRole);
      setEditTeamName(data.team.name);
      setEditTeamDesc(data.team.description || "");
    } catch (err: any) {
      setError(err.message || "Error loading team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else {
        fetchTeam();
      }
    }
  }, [id, user, authLoading]);

  // Handle Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setTaskError("Task title is required.");
      return;
    }

    setTaskLoading(true);
    setTaskError(null);

    try {
      const res = await fetch(`/api/teams/${id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: taskDesc.trim() || null,
          status: taskStatus,
          priority: taskPriority,
          dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : null,
          assigneeId: taskAssigneeId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      setTeam((prev) => (prev ? { ...prev, tasks: [data, ...prev.tasks] } : prev));
      setTaskTitle("");
      setTaskDesc("");
      setTaskStatus("TODO");
      setTaskPriority("MEDIUM");
      setTaskDueDate("");
      setTaskAssigneeId("");
      setIsCreateTaskOpen(false);
    } catch (err: any) {
      setTaskError(err.message || "Failed to create task");
    } finally {
      setTaskLoading(false);
    }
  };

  // Handle Update Task
  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title.trim()) return;

    setTaskLoading(true);
    setTaskError(null);

    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingTask.title.trim(),
          description: editingTask.description?.trim() || null,
          status: editingTask.status,
          priority: editingTask.priority,
          dueDate: editingTask.dueDate ? new Date(editingTask.dueDate).toISOString() : null,
          assigneeId: editingTask.assigneeId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update task");
      }

      setTeam((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) => (t.id === data.id ? data : t)),
            }
          : prev
      );
      setEditingTask(null);
    } catch (err: any) {
      setTaskError(err.message || "Failed to update task");
    } finally {
      setTaskLoading(false);
    }
  };

  // Handle Quick Status Change (Kanban)
  const handleQuickStatusChange = async (taskId: string, newStatus: string) => {
    try {
      // Optimistic update
      setTeam((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.id === taskId ? { ...t, status: newStatus } : t
              ),
            }
          : prev
      );

      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error("Status update error:", err);
      fetchTeam();
    }
  };

  // Handle Delete Task
  const handleDeleteTask = async (task: TeamTaskItem) => {
    const canDelete =
      task.creatorId === user?.id ||
      task.assigneeId === user?.id ||
      team?.ownerId === user?.id;

    if (!canDelete) {
      alert("Permission denied. Only the task creator, assignee, or team owner can delete this task.");
      return;
    }

    if (!confirm(`Are you sure you want to delete task "${task.title}"?`)) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete task");
      }

      setTeam((prev) =>
        prev
          ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== task.id) }
          : prev
      );
    } catch (err: any) {
      alert(err.message || "Failed to delete task");
    }
  };

  // Handle Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail.trim()) {
      setMemberError("Please enter an email address.");
      return;
    }

    setMemberLoading(true);
    setMemberError(null);

    try {
      const res = await fetch(`/api/teams/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: memberEmail.trim(),
          role: memberRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add member");
      }

      setTeam((prev) =>
        prev ? { ...prev, members: [...prev.members, data] } : prev
      );
      setMemberEmail("");
      setIsAddMemberOpen(false);
    } catch (err: any) {
      setMemberError(err.message || "Failed to add member");
    } finally {
      setMemberLoading(false);
    }
  };

  // Handle Remove Member
  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!confirm(`Remove member "${memberName}" from this team?`)) return;

    try {
      const res = await fetch(`/api/teams/${id}/members/${memberUserId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove member");
      }

      setTeam((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.filter((m) => m.userId !== memberUserId),
            }
          : prev
      );
    } catch (err: any) {
      alert(err.message || "Failed to remove member");
    }
  };

  // Handle Edit Team
  const handleEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTeamName.trim()) return;

    setEditTeamLoading(true);
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editTeamName.trim(),
          description: editTeamDesc.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update team");

      setTeam((prev) =>
        prev ? { ...prev, name: data.name, description: data.description } : prev
      );
      setIsEditTeamOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to update team");
    } finally {
      setEditTeamLoading(false);
    }
  };

  // Handle Delete Team
  const handleDeleteTeam = async () => {
    if (
      !confirm(
        `Are you sure you want to permanently delete team "${team?.name}" and all its tasks? This action cannot be undone.`
      )
    )
      return;

    try {
      const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete team");
      }
      router.push("/teams");
    } catch (err: any) {
      alert(err.message || "Failed to delete team");
    }
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (!team) return [];
    return team.tasks.filter((t) => {
      const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
      const matchPriority = priorityFilter === "ALL" || t.priority === priorityFilter;
      const matchAssignee =
        assigneeFilter === "ALL" ||
        (assigneeFilter === "UNASSIGNED" ? !t.assigneeId : t.assigneeId === assigneeFilter);
      const matchSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchStatus && matchPriority && matchAssignee && matchSearch;
    });
  }, [team, statusFilter, priorityFilter, assigneeFilter, searchQuery]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <svg className="h-8 w-8 animate-spin text-indigo-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm text-gray-500">Loading team workspace...</span>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Team Not Found</h2>
        <p className="mt-2 text-sm text-gray-500">{error || "Could not find the requested team."}</p>
        <Link
          href="/teams"
          className="mt-6 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          ← Back to My Teams
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/teams" className="hover:text-indigo-600">
          My Teams
        </Link>
        <span>/</span>
        <span className="font-semibold text-gray-900 dark:text-white">{team.name}</span>
      </div>

      {/* Team Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              {team.name}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isOwner
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              }`}
            >
              {isOwner ? "👑 Owner" : `👤 ${currentUserRole}`}
            </span>
          </div>

          {team.description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {team.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span>Owner: <strong className="text-gray-700 dark:text-gray-300">{team.owner.name}</strong></span>
            <span>•</span>
            <span>{team.members.length} Members</span>
            <span>•</span>
            <span>{team.tasks.length} Tasks</span>
          </div>
        </div>

        {/* Team Actions */}
        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              <button
                type="button"
                onClick={() => setIsEditTeamOpen(true)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 transition"
              >
                Edit Team
              </button>
              <button
                type="button"
                onClick={handleDeleteTeam}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400 transition"
              >
                Delete Team
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsCreateTaskOpen(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition"
          >
            + Create Task
          </button>
        </div>
      </div>

      {/* Tabs navigation: Tasks vs Members */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === "tasks"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Tasks ({team.tasks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === "members"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Team Members ({team.members.length})
          </button>
        </div>

        {activeTab === "tasks" && (
          <div className="flex items-center gap-1 pb-2">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`rounded-md p-1.5 text-xs font-medium ${
                viewMode === "kanban"
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 font-bold"
                  : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
              title="Kanban Board View"
            >
              📊 Kanban Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-md p-1.5 text-xs font-medium ${
                viewMode === "table"
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 font-bold"
                  : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
              title="Table / List View"
            >
              📄 List View
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: TASKS */}
      {activeTab === "tasks" && (
        <div className="space-y-6">
          {/* Filters & Search Toolbar (Bonus Features) */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-center gap-3">
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="ALL">Status: All</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>

              {/* Priority filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="ALL">Priority: All</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>

              {/* Assignee filter */}
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="ALL">Assignee: All</option>
                <option value="UNASSIGNED">Unassigned</option>
                {team.members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-full lg:w-64">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 pl-8 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <span className="absolute left-2.5 top-2 text-gray-400">🔍</span>
            </div>
          </div>

          {/* VIEW: KANBAN BOARD */}
          {viewMode === "kanban" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { status: "TODO", title: "To Do", bg: "bg-amber-500/10", border: "border-amber-500/20", badge: "bg-amber-100 text-amber-800" },
                { status: "IN_PROGRESS", title: "In Progress", bg: "bg-blue-500/10", border: "border-blue-500/20", badge: "bg-blue-100 text-blue-800" },
                { status: "DONE", title: "Done", bg: "bg-emerald-500/10", border: "border-emerald-500/20", badge: "bg-emerald-100 text-emerald-800" },
              ].map((col) => {
                const columnTasks = filteredTasks.filter((t) => t.status === col.status);
                return (
                  <div
                    key={col.status}
                    className={`flex flex-col rounded-2xl border ${col.border} ${col.bg} p-4 min-h-[500px]`}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200/50 dark:border-gray-800">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {col.title}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${col.badge}`}>
                        {columnTasks.length}
                      </span>
                    </div>

                    <div className="mt-4 flex-1 space-y-3">
                      {columnTasks.length === 0 ? (
                        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-gray-300/50 text-xs text-gray-400">
                          No tasks in {col.title.toLowerCase()}
                        </div>
                      ) : (
                        columnTasks.map((task) => (
                          <div
                            key={task.id}
                            className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs hover:shadow-md transition dark:border-gray-800 dark:bg-gray-900"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span
                                className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                                  task.priority === "HIGH"
                                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                    : task.priority === "MEDIUM"
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                }`}
                              >
                                {task.priority} Priority
                              </span>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingTask(task)}
                                  className="text-gray-400 hover:text-indigo-600 p-1 text-xs"
                                  title="Edit Task"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(task)}
                                  className="text-gray-400 hover:text-rose-600 p-1 text-xs"
                                  title="Delete Task"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>

                            <h4 className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
                              {task.title}
                            </h4>

                            {task.description && (
                              <p className="mt-1 text-xs text-gray-500 line-clamp-2 dark:text-gray-400">
                                {task.description}
                              </p>
                            )}

                            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-[11px] text-gray-500 dark:border-gray-800">
                              <span className="flex items-center gap-1">
                                👤 {task.assignee ? task.assignee.name : "Unassigned"}
                              </span>

                              {/* Quick Move Status Dropdown */}
                              <select
                                value={task.status}
                                onChange={(e) => handleQuickStatusChange(task.id, e.target.value)}
                                className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              >
                                <option value="TODO">To Do</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="DONE">Done</option>
                              </select>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VIEW: TABLE / LIST */
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-gray-800 dark:bg-gray-900">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 font-semibold">
                  <tr>
                    <th className="px-6 py-3">Task Title</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Priority</th>
                    <th className="px-6 py-3">Assignee</th>
                    <th className="px-6 py-3">Due Date</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                        No tasks match the filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                          <div>{task.title}</div>
                          {task.description && (
                            <div className="text-[11px] text-gray-400 font-normal line-clamp-1">
                              {task.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              task.status === "DONE"
                                ? "bg-emerald-50 text-emerald-700"
                                : task.status === "IN_PROGRESS"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {task.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              task.priority === "HIGH"
                                ? "bg-rose-50 text-rose-700"
                                : task.priority === "MEDIUM"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {task.assignee ? task.assignee.name : "Unassigned"}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => setEditingTask(task)}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task)}
                            className="text-rose-600 hover:text-rose-800 font-semibold"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MEMBERS */}
      {activeTab === "members" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Team Roster ({team.members.length})
              </h3>
              <p className="text-xs text-gray-500">
                Manage roles and collaboration permissions for this team
              </p>
            </div>

            {isOwner && (
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(true)}
                className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition"
              >
                + Add Member by Email
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.members.map((member) => {
              const isMemberOwner = member.role === "OWNER" || member.userId === team.ownerId;
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 text-sm font-bold text-white uppercase">
                      {member.user.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        {member.user.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {member.user.email}
                      </p>
                      <span
                        className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isMemberOwner
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        }`}
                      >
                        {isMemberOwner ? "👑 Owner" : "👤 Member"}
                      </span>
                    </div>
                  </div>

                  {isOwner && !isMemberOwner && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.userId, member.user.name)}
                      className="rounded-lg p-1.5 text-xs font-semibold text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Remove member"
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: CREATE TASK */}
      {isCreateTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create Task in {team.name}</h3>
              <button onClick={() => setIsCreateTaskOpen(false)} className="text-gray-400">✕</button>
            </div>

            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              {taskError && (
                <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{taskError}</div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Task title..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  rows={2}
                  placeholder="Details..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Status</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Assignee</label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Unassigned</option>
                    {team.members.map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.name} ({m.user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsCreateTaskOpen(false)}
                  className="rounded-lg border px-4 py-2 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskLoading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs"
                >
                  {taskLoading ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT TASK */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Task</h3>
              <button onClick={() => setEditingTask(null)} className="text-gray-400">✕</button>
            </div>

            <form onSubmit={handleUpdateTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Title *</label>
                <input
                  type="text"
                  required
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  rows={2}
                  value={editingTask.description || ""}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Status</label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Assignee</label>
                  <select
                    value={editingTask.assigneeId || ""}
                    onChange={(e) => setEditingTask({ ...editingTask, assigneeId: e.target.value || null })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Unassigned</option>
                    {team.members.map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.name} ({m.user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Due Date</label>
                  <input
                    type="date"
                    value={editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().split("T")[0] : ""}
                    onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value || null })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="rounded-lg border px-4 py-2 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskLoading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs"
                >
                  {taskLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD MEMBER */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Member to {team.name}</h3>
              <button onClick={() => setIsAddMemberOpen(false)} className="text-gray-400">✕</button>
            </div>

            <form onSubmit={handleAddMember} className="mt-4 space-y-4">
              {memberError && (
                <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{memberError}</div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  User Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="colleague@example.com"
                  value={memberEmail}
                  onChange={(e) => {
                    setMemberEmail(e.target.value);
                    if (memberError) setMemberError(null);
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  User must already have an account on TaskFlow.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Role
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="MEMBER">Member (Can create, view, update tasks)</option>
                  <option value="OWNER">Co-Owner (Full admin rights)</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="rounded-lg border px-4 py-2 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={memberLoading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs"
                >
                  {memberLoading ? "Adding..." : "Add to Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT TEAM */}
      {isEditTeamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Team Details</h3>
              <button onClick={() => setIsEditTeamOpen(false)} className="text-gray-400">✕</button>
            </div>

            <form onSubmit={handleEditTeam} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editTeamDesc}
                  onChange={(e) => setEditTeamDesc(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsEditTeamOpen(false)}
                  className="rounded-lg border px-4 py-2 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editTeamLoading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs"
                >
                  {editTeamLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
