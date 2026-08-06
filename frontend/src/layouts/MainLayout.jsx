import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";
import "./Layout.css";

export default function MainLayout({ children, title }) {
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-section">
        <TopNavbar title={title} />

        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}