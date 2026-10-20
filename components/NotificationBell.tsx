"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    // 1. Subscribe to Supabase Realtime for instant notification delivery
    const channelName = `notifications-user-${user.id}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `userId=eq.${user.id}`,
        },
        (payload: any) => {
          const newNotif = payload.new as NotificationItem;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    // 2. Periodic sync fallback (every 5 seconds)
    const interval = setInterval(() => {
      fetch("/api/notifications")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
          }
        })
        .catch(() => {});
    }, 5000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, link: string | null) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "PUT" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
        aria-label="Notifications"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white shadow-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="mt-2 max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No notifications yet</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 rounded-xl transition-colors ${
                    notif.read ? "bg-white hover:bg-slate-50" : "bg-indigo-50/50 hover:bg-indigo-50/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{notif.title}</span>
                        {!notif.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                      <span className="mt-1.5 block text-[10px] text-slate-400 font-medium">
                        {new Date(notif.createdAt).toLocaleDateString()} at{" "}
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {notif.link && (
                      <Link
                        href={notif.link}
                        onClick={() => {
                          handleMarkAsRead(notif.id, notif.link);
                          setIsOpen(false);
                        }}
                        className="rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100 transition whitespace-nowrap"
                      >
                        View →
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
