import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getNotifications } from "../services/notificationService";

export default function TopNavbar({ title }) {
  const username = localStorage.getItem("username") || "User";
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadCount = async () => {
      try {
        const data = await getNotifications();

        if (!isMounted) return;

        const notifications = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];

        const unread = notifications.filter(
          (notification) => notification && !notification.is_read
        ).length;

        setUnreadCount(unread);
      } catch (error) {
        console.error("Failed to load notification count:", error);
      }
    };

    loadCount();

    const interval = setInterval(loadCount, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const displayCount = unreadCount > 99 ? "99+" : unreadCount;

  return (
    <header className="top-navbar">
      <div className="navbar-page-info">
        <img
          src="/budgetbuddy-mark.png"
          alt=""
          aria-hidden="true"
          className="navbar-brand-mark"
        />

        <div>
          <h2 className="page-heading">{title}</h2>
          <p className="page-date">{today}</p>
        </div>
      </div>

      <div className="user-section">
        <Link
          to="/notifications"
          className="notification"
          title={
            unreadCount > 0
              ? `${unreadCount} unread notifications`
              : "Notifications"
          }
          aria-label="Notifications"
        >
          <span className="notification-bell" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
              <path d="M10 21h4" />
            </svg>
          </span>

          {unreadCount > 0 && (
            <span className="notification-count">{displayCount}</span>
          )}
        </Link>

        <div className="user-info">
          <span className="welcome">Welcome,</span>
          <strong>{username}</strong>
        </div>
      </div>
    </header>
  );
}
