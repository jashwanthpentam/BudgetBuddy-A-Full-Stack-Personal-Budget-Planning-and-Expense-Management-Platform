import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: "/dashboard", icon: "📊", label: "Dashboard" },
    { path: "/income", icon: "💵", label: "Income" },
    { path: "/expenses", icon: "💳", label: "Expenses" },
    { path: "/budgets", icon: "📒", label: "Budgets" },
    { path: "/savings", icon: "🏦", label: "Savings" },
    { path: "/reports", icon: "📈", label: "Reports" },
    { path: "/notifications", icon: "🔔", label: "Notifications" },
    { path: "/settings", icon: "⚙️", label: "Settings" },
  ];

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <aside className="sidebar">

      <div className="logo-section">
        <h2>💰 BudgetBuddy</h2>
        <p>Personal Finance</p>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={
              location.pathname === item.path
                ? "nav-link active"
                : "nav-link"
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <button
        className="logout-btn"
        onClick={logout}
      >
        🚪 Logout
      </button>

    </aside>
  );
}