import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGaugeHigh,
  faFileLines,
  faGear,
  faRightFromBracket,
  faFolderOpen
} from "@fortawesome/free-solid-svg-icons";

export function Sidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get("tab");

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: faGaugeHigh, tab: null },
    { name: "Documents", path: "/dashboard?tab=documents", icon: faFileLines, tab: "documents" },
    { name: "Templates", path: "/dashboard?tab=templates", icon: faFolderOpen, tab: "templates" },
    { name: "Settings", path: "/dashboard?tab=settings", icon: faGear, tab: "settings" },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen fixed top-0 left-0">
      {/* Brand & Workspace */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <span className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold leading-none">ES</span>
          </div>
          EZSignNow
        </span>
      </div>

      <div className="px-6 py-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Workspace</div>
        <div className="flex items-center gap-3 bg-slate-800/50 p-2 rounded border border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-sm font-medium text-white truncate">{user?.email?.split('@')[0]}</span>
            <span className="text-[10px] text-slate-400 truncate">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === "/dashboard" && currentTab === item.tab;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-blue-600 text-white" 
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <FontAwesomeIcon icon={item.icon} className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-md text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
