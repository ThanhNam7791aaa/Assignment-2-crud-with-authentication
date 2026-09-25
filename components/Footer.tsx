import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              TaskFlow
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              — Assignment 1: Task & Team Management App
            </span>
          </div>

          <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
            <span>Built with Next.js, Prisma, PostgreSQL & Tailwind CSS</span>
            <Link
              href="https://github.com/ThanhNam7791aaa/Assignment-1-Project-setup-and-deployment"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 font-medium"
            >
              GitHub Repo
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
