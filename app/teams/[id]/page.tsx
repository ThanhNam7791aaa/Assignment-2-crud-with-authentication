"use client";

import { useEffect, useState, useMemo, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import TeamChat from "@/components/TeamChat";

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

  // Tabs: "tasks" | "members" | "chat"
  const [activeTab, setActiveTab] = useState<"tasks" | "members" | "chat">("tasks");

  // View mode: "kanban" | "table"
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");

  // Filters
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
      if (res.status === 403) {
        throw new Error("Access denied. You are not a member of this team.");
      }
      if (!res.ok) {
        throw new Error("Failed to load team details");
      }
      const data = await res.json();
      setTeam(data.team);
      setIsOwner(data.isOwner);
      setCurrentUserRole(data.currentUserRole);
      setEditTeamName(data.team.name);
      setEditTeamDesc(data.team.description || "");
    } catch (err: any) {
      setError(err.message || "Failed to load team");
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
  }, [user, authLoading, id]);

  // Live Task Board Updates via Supabase Realtime + Auto-sync fallback
  useEffect(() => {
    if (!id) return;

    // 1. Supabase Realtime channel
    const channelName = `team-live-tasks-${id}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `teamId=eq.${id}`,
        },
        () => {
          // Instant refresh team data when any member creates, updates, or deletes a task
          fetchTeam();
        }
      )
      .subscribe();

    // 2. Auto-sync fallback (every 3s) ensuring tasks sync across sessions without requiring F5
    const syncInterval = setInterval(() => {
      fetch(`/api/teams/${id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.team) {
            setTeam(data.team);
            setIsOwner(data.isOwner);
            setCurrentUserRole(data.currentUserRole);
          }
        })
        .catch(() => {});
    }, 3000);

    return () => {
      clearInterval(syncInterval);
      supabase.removeChannel(channel);
    };
  }, [id]);

  const isAdminOrOwner = isOwner || currentUserRole === "ADMIN";

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
    if (!editingTask) return;

    setTaskLoading(true);
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingTask.title,
          description: editingTask.description,
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

  // Handle Delete Task (Owner, Admin, Creator, or Assignee)
  const handleDeleteTask = async (task: TeamTaskItem) => {
    const canDelete =
      isAdminOrOwner ||
      task.creatorId === user?.id ||
      task.assigneeId === user?.id;

    if (!canDelete) {
      alert("Permission denied. Only the task creator, assignee, team Admin, or Owner can delete this task.");
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
        prev
          ? {
              ...prev,
              members: [...prev.members, data],
            }
          : prev
      );
      setMemberEmail("");
      setIsAddMemberOpen(false);
    } catch (err: any) {
      setMemberError(err.message || "Failed to add member");
    } finally {
      setMemberLoading(false);
    }
  };

  // Handle Change Member Role (Owner only)
  const handleRoleChange = async (memberUserId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/teams/${id}/members/${memberUserId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to change member role");
      }
      setTeam((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.map((m) =>
                m.userId === memberUserId ? { ...m, role: newRole } : m
              ),
            }
          : prev
      );
    } catch (err: any) {
      alert(err.message || "Failed to change member role");
    }
  };

  // Handle Remove Member (Owner can remove anyone; Admin can remove Member)
  const handleRemoveMember = async (memberUserId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this team?`)) return;

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
              tasks: prev.tasks.map((t) =>
                t.assigneeId === memberUserId ? { ...t, assigneeId: null, assignee: null } : t
              ),
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

  // Handle Delete Team (Owner only)
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
          <span className="text-sm font-medium text-slate-500">Loading team workspace...</span>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 text-2xl font-bold border border-rose-100">
          ⚠️
        </div>
        <h2 className="mt-4 text-2xl font-bold text-slate-900">Team Not Found</h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">{error || "Could not find the requested team."}</p>
        <Link
          href="/teams"
          className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 transition"
        >
          ← Back to My Teams
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/teams" className="hover:text-indigo-600 transition-colors">
          My Teams
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-bold">{team.name}</span>
      </div>

      {/* Team Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 rounded-3xl border border-slate-200 bg-white p-7 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              {team.name}
            </h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                isOwner
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80"
                  : currentUserRole === "ADMIN"
                  ? "bg-purple-50 text-purple-700 border border-purple-200/80"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
              }`}
            >
              {isOwner ? "👑 Owner" : currentUserRole === "ADMIN" ? "🛡️ Admin" : "👤 Member"}
            </span>
          </div>

          {team.description && (
            <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-3xl">
              {team.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
            <span>
              Owner: <strong className="text-slate-900">{team.owner.name}</strong>
            </span>
            <span>•</span>
            <span>{team.members.length} Members</span>
            <span>•</span>
            <span>{team.tasks.length} Tasks</span>
          </div>
        </div>

        {/* Team Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isOwner && (
            <>
              <button
                type="button"
                onClick={() => setIsEditTeamOpen(true)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition cursor-pointer"
              >
                Edit Team
              </button>
              <button
                type="button"
                onClick={handleDeleteTeam}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 shadow-2xs transition cursor-pointer"
              >
                Delete Team
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsCreateTaskOpen(true)}
            className="rounded-xl bg-indigo-600 px-4.5 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 transition cursor-pointer"
          >
            + Create Task
          </button>
        </div>
      </div>

      {/* Tabs navigation: Tasks vs Members vs Chat */}
      <div className="flex items-center justify-between border-b border-slate-200 pt-2">
        <div className="flex items-center space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer ${
              activeTab === "tasks"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Tasks ({team.tasks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer ${
              activeTab === "members"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Team Members ({team.members.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`pb-3 text-sm font-bold transition border-b-2 cursor-pointer ${
              activeTab === "chat"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            💬 Chat Room
          </button>
        </div>

        {activeTab === "tasks" && (
          <div className="flex items-center gap-1.5 pb-2">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              title="Kanban Board View"
            >
              📊 Kanban Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                viewMode === "table"
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-100"
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
          {/* Filters & Search Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs focus:border-indigo-600 focus:outline-hidden"
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
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs focus:border-indigo-600 focus:outline-hidden"
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
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs focus:border-indigo-600 focus:outline-hidden"
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
            <div className="relative w-full lg:w-72">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 pl-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
            </div>
          </div>

          {/* VIEW: KANBAN BOARD */}
          {viewMode === "kanban" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  status: "TODO",
                  title: "To Do",
                  bg: "bg-slate-100/90",
                  border: "border-slate-200/90",
                  badge: "bg-white text-slate-700 border border-slate-200 shadow-2xs",
                },
                {
                  status: "IN_PROGRESS",
                  title: "In Progress",
                  bg: "bg-blue-50/70",
                  border: "border-blue-200/80",
                  badge: "bg-blue-100 text-blue-800 border border-blue-200",
                },
                {
                  status: "DONE",
                  title: "Done",
                  bg: "bg-emerald-50/70",
                  border: "border-emerald-200/80",
                  badge: "bg-emerald-100 text-emerald-800 border border-emerald-200",
                },
              ].map((col) => {
                const columnTasks = filteredTasks.filter((t) => t.status === col.status);
                return (
                  <div
                    key={col.status}
                    className={`flex flex-col rounded-3xl border ${col.border} ${col.bg} p-4.5 min-h-[520px]`}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                      <span className="text-sm font-extrabold text-slate-900">
                        {col.title}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${col.badge}`}>
                        {columnTasks.length}
                      </span>
                    </div>

                    <div className="mt-4 flex-1 space-y-3.5">
                      {columnTasks.length === 0 ? (
                        <div className="flex h-36 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-xs font-semibold text-slate-400 bg-white/50">
                          No tasks in {col.title.toLowerCase()}
                        </div>
                      ) : (
                        columnTasks.map((task) => {
                          const canDeleteThisTask =
                            isAdminOrOwner ||
                            task.creatorId === user?.id ||
                            task.assigneeId === user?.id;

                          return (
                            <div
                              key={task.id}
                              className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                    task.priority === "HIGH"
                                      ? "bg-rose-50 text-rose-700 border border-rose-200/80"
                                      : task.priority === "MEDIUM"
                                      ? "bg-amber-50 text-amber-700 border border-amber-200/80"
                                      : "bg-slate-100 text-slate-700 border border-slate-200"
                                  }`}
                                >
                                  {task.priority} Priority
                                </span>

                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingTask(task)}
                                    className="text-slate-400 hover:text-indigo-600 p-1 text-xs cursor-pointer"
                                    title="Edit Task"
                                  >
                                    ✏️
                                  </button>
                                  {canDeleteThisTask && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTask(task)}
                                      className="text-slate-400 hover:text-rose-600 p-1 text-xs cursor-pointer"
                                      title="Delete Task"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </div>

                              <h4 className="mt-2.5 text-sm font-bold text-slate-900 leading-snug">
                                {task.title}
                              </h4>

                              {task.description && (
                                <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                  {task.description}
                                </p>
                              )}

                              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500 font-medium">
                                <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                                  👤 {task.assignee ? task.assignee.name : "Unassigned"}
                                </span>

                                {/* Quick Move Status Dropdown */}
                                <select
                                  value={task.status}
                                  onChange={(e) => handleQuickStatusChange(task.id, e.target.value)}
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700 focus:outline-hidden cursor-pointer"
                                >
                                  <option value="TODO">To Do</option>
                                  <option value="IN_PROGRESS">In Progress</option>
                                  <option value="DONE">Done</option>
                                </select>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VIEW: TABLE / LIST */
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold tracking-wider uppercase">
                  <tr>
                    <th className="px-6 py-3.5">Task Title</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Priority</th>
                    <th className="px-6 py-3.5">Assignee</th>
                    <th className="px-6 py-3.5">Due Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-medium">
                        No tasks match the filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => {
                      const canDeleteThisTask =
                        isAdminOrOwner ||
                        task.creatorId === user?.id ||
                        task.assigneeId === user?.id;

                      return (
                        <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">
                            <div>{task.title}</div>
                            {task.description && (
                              <div className="text-[11px] text-slate-500 font-normal line-clamp-1 mt-0.5">
                                {task.description}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                task.status === "DONE"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : task.status === "IN_PROGRESS"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {task.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                task.priority === "HIGH"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : task.priority === "MEDIUM"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-slate-700">
                            {task.assignee ? task.assignee.name : "Unassigned"}
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-medium">
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}
                          </td>
                          <td className="px-6 py-4 text-right space-x-3">
                            <button
                              type="button"
                              onClick={() => setEditingTask(task)}
                              className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                            >
                              Edit
                            </button>
                            {canDeleteThisTask && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task)}
                                className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
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
              <h3 className="text-xl font-extrabold text-slate-900">
                Team Roster ({team.members.length})
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Manage roles and collaboration permissions for this team
              </p>
            </div>

            {isAdminOrOwner && (
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(true)}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 transition cursor-pointer"
              >
                + Add Member by Email
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {team.members.map((member) => {
              const isMemberOwner = member.role === "OWNER" || member.userId === team.ownerId;
              const isMemberAdmin = member.role === "ADMIN";

              // Can current user remove this member?
              // Owner can remove anyone (except owner)
              // Admin can remove regular members
              const canRemove =
                (isOwner && !isMemberOwner) ||
                (currentUserRole === "ADMIN" && !isMemberOwner && !isMemberAdmin);

              return (
                <div
                  key={member.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-sm font-bold text-white uppercase shadow-2xs">
                      {member.user.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {member.user.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {member.user.email}
                      </p>
                      <span
                        className={`inline-block mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          isMemberOwner
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200/80"
                            : isMemberAdmin
                            ? "bg-purple-50 text-purple-700 border border-purple-200/80"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                        }`}
                      >
                        {isMemberOwner ? "👑 Owner" : isMemberAdmin ? "🛡️ Admin" : "👤 Member"}
                      </span>
                    </div>
                  </div>

                  {/* Role Switcher (Owner only) or Remove Member */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    {isOwner && !isMemberOwner ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400 font-semibold">Role:</span>
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-700 focus:outline-hidden cursor-pointer"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </div>
                    ) : (
                      <span />
                    )}

                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.userId, member.user.name)}
                        className="rounded-lg px-2.5 py-1 text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Remove member"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CHAT ROOM */}
      {activeTab === "chat" && (
        <TeamChat teamId={team.id} teamName={team.name} />
      )}

      {/* MODAL: CREATE TASK */}
      {isCreateTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-900">Create Task in {team.name}</h3>
              <button onClick={() => setIsCreateTaskOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateTask} className="mt-5 space-y-4">
              {taskError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{taskError}</div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700">Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement user authentication..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  placeholder="Task details and context..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Status</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Assignee</label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
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
                  <label className="block text-xs font-bold text-slate-700">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateTaskOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskLoading}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-900">Edit Task</h3>
              <button onClick={() => setEditingTask(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleUpdateTask} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={editingTask.description || ""}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Status</label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Assignee</label>
                  <select
                    value={editingTask.assigneeId || ""}
                    onChange={(e) => setEditingTask({ ...editingTask, assigneeId: e.target.value || null })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
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
                  <label className="block text-xs font-bold text-slate-700">Due Date</label>
                  <input
                    type="date"
                    value={editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().split("T")[0] : ""}
                    onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value || null })}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={taskLoading}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-900">Add Member to {team.name}</h3>
              <button onClick={() => setIsAddMemberOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddMember} className="mt-5 space-y-4">
              {memberError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{memberError}</div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  User Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="colleague@taskflow.com"
                  value={memberEmail}
                  onChange={(e) => {
                    setMemberEmail(e.target.value);
                    if (memberError) setMemberError(null);
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                />
                <p className="mt-1.5 text-[11px] text-slate-400 font-medium">
                  User must already have an account on TaskFlow.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Role
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                >
                  <option value="MEMBER">Member (Can create, view, update tasks)</option>
                  <option value="ADMIN">Admin (Can manage members and tasks)</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={memberLoading}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-900">Edit Team Details</h3>
              <button onClick={() => setIsEditTeamOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleEditTeam} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Team Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editTeamDesc}
                  onChange={(e) => setEditTeamDesc(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-2xs"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditTeamOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editTeamLoading}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
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
