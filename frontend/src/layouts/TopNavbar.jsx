export default function TopNavbar({ title }) {
  const username = localStorage.getItem("username") || "User";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="top-navbar">

      <div>
        <h2 className="page-heading">{title}</h2>
        <p className="page-date">{today}</p>
      </div>

      <div className="user-section">

        <div className="notification">
          🔔
        </div>

        <div className="user-info">
          <span className="welcome">
            Welcome,
          </span>

          <strong>{username}</strong>
        </div>

      </div>

    </header>
  );
}