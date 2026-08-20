import { Link, useLocation, useNavigate } from "react-router-dom";

const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 4-4 3 2 5-6" />
      <path d="M16 7h3v3" />
    </svg>
  ),
  income: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 9h18" />
      <path d="M15 14h3" />
    </svg>
  ),
  expenses: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </svg>
  ),
  budgets: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 4h12a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2V4Z" />
      <path d="M6 6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2" />
      <path d="M10 9h6M10 13h6M10 17h4" />
    </svg>
  ),
  savings: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 11a7 7 0 0 1 13.5-2.4L21 11v6a2 2 0 0 1-2 2H8a5 5 0 0 1-5-5v-1a2 2 0 0 1 2-2Z" />
      <path d="M7 8V5h3" />
      <path d="M16 13h.01" />
      <path d="M12 13h.01" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5" />
      <path d="M8 16l3-3 2 2 3-4" />
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
      <path d="M10 21h4" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      <path d="m19.4 15 .1.1a2 2 0 0 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4V19a2 2 0 0 1-4 0v-.1a2 2 0 0 0-3.4-1.4l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1A2 2 0 0 0 1.6 12H2a2 2 0 0 1 0-4h.1a2 2 0 0 0 1.4-3.4l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1A2 2 0 0 0 9.7.4H10a2 2 0 0 1 4 0h.1a2 2 0 0 0 3.4 1.4l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1A2 2 0 0 0 21.7 8h.1a2 2 0 0 1 0 4h-.1a2 2 0 0 0-2.3 3Z" transform="translate(0 1)" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M14 8l4 4-4 4" />
      <path d="M9 12h9" />
    </svg>
  ),
};

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: "/dashboard", icon: "dashboard", label: "Dashboard" },
    { path: "/analytics", icon: "analytics", label: "Analytics" },
    { path: "/income", icon: "income", label: "Income" },
    { path: "/expenses", icon: "expenses", label: "Expenses" },
    { path: "/budgets", icon: "budgets", label: "Budgets" },
    { path: "/savings", icon: "savings", label: "Savings" },
    { path: "/reports", icon: "reports", label: "Reports" },
    { path: "/notifications", icon: "notifications", label: "Notifications" },
    { path: "/settings", icon: "settings", label: "Settings" },
  ];

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <aside className="sidebar">
      <div>
        <div className="logo-section">
          <div className="brand-lockup">
            <img
              src="/budgetbuddy-mark.png"
              alt="BudgetBuddy"
              className="brand-mark"
            />
            <div className="brand-copy">
              <h2>BudgetBuddy</h2>
              <p>Finance Tracker</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={isActive ? "nav-link active" : "nav-link"}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="nav-icon">{icons[item.icon]}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <button className="logout-btn" onClick={logout} type="button">
        <span className="logout-icon">{icons.logout}</span>
        <span>Logout</span>
      </button>
    </aside>
  );
}
