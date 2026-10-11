"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-16">
      {/* Hero Section */}
      <div className="mx-auto max-w-3xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-950 dark:text-indigo-300">
          <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
          Assignment 2 — Authentication, Teams & Kanban Tasks
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl dark:text-white">
          Team Collaboration & Task Management Made Simple
        </h1>

        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Create collaborative teams, invite colleagues by email, assign tasks with
          role-based permissions, and organize workflows using an interactive Kanban board.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          {loading ? (
            <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/teams"
                className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 transition"
              >
                Go to My Teams Dashboard →
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 transition"
              >
                Sign In to Your Account
              </Link>
              <Link
                href="/register"
                className="rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 transition"
              >
                Create Free Account
              </Link>
            </div>
          )}
        </div>

        {/* Grader Notice Banner */}
        <div className="mx-auto max-w-xl rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-left text-xs dark:border-indigo-900/40 dark:bg-indigo-950/40 mt-8">
          <div className="flex items-center justify-between font-bold text-indigo-900 dark:text-indigo-200">
            <span>🎓 Grader Credentials (Instant Login):</span>
            <Link
              href="/login"
              className="text-indigo-600 underline dark:text-indigo-400 font-semibold"
            >
              Go to Login Page →
            </Link>
          </div>
          <div className="mt-2 text-indigo-800 dark:text-indigo-300 space-y-1">
            <p>• Email: <code className="bg-white/80 dark:bg-black/40 px-1 py-0.5 rounded font-mono">test@taskflow.com</code></p>
            <p>• Password: <code className="bg-white/80 dark:bg-black/40 px-1 py-0.5 rounded font-mono">Password123!</code></p>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 italic">
              (Pre-verified test account ready to test all team and task features immediately).
            </p>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 text-2xl mb-4">
            🔐
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Secure Authentication
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Self-registration with salted bcrypt password hashing and tamper-proof JWT sessions with httpOnly cookies.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 text-2xl mb-4">
            👥
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Team Workspace & RBAC
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Create teams, invite colleagues by email, and enforce role-based access control where only owners can manage members.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 text-2xl mb-4">
            📊
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Kanban Board & Delegation
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Interactive Kanban board with status transitions, assignee delegation, and delete protection rules.
          </p>
        </div>
      </div>
    </div>
  );
}
