import Link from "next/link";

export default function TeamsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10 dark:bg-indigo-950 dark:text-indigo-300 mb-6">
          <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
          Assignment 2 Preview
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl dark:text-white">
          Team Management is Coming Soon
        </h1>

        <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
          The team collaboration features — including team creation, member role
          assignments, and task delegation — are currently being prepared and will
          be launched in <strong>Assignment 2</strong>.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
          >
            ← Back to Task Dashboard
          </Link>
        </div>

        {/* Feature roadmap preview cards */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3 text-left">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 mb-4 font-bold text-lg">
              👥
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Create & Join Teams
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Form multiple teams, invite colleagues, and organize collaborative workspaces.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400 mb-4 font-bold text-lg">
              🛡️
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Role-Based Access
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Assign roles like Owner, Admin, and Member with customized permissions.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mb-4 font-bold text-lg">
              📋
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Team Task Delegation
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Directly assign specific tasks to team members with real-time status tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
