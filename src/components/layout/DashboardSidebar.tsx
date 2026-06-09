import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { 
  PenTool, 
  FileText, 
  Copy, 
  CheckSquare, 
  Users, 
  Layers, 
  Settings,
  Briefcase
} from "lucide-react";

export default function DashboardSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  let activeTab = searchParams.get("tab") || "sign";
  if (location.pathname === "/team") {
    activeTab = "team";
  } else if (location.pathname === "/company") {
    activeTab = "company";
  }

  const sidebarItems = [
    { id: "sign", label: "Sign", icon: PenTool },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "templates", label: "Templates", icon: Copy },
    { id: "forms", label: "Forms", icon: CheckSquare },
    { id: "team", label: "Team", icon: Users },
    { id: "company", label: "Company", icon: Briefcase },
    { id: "integrations", label: "Integrations", icon: Layers },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleNavigate = (id: string) => {
    if (id === "team") {
      navigate("/team");
    } else if (id === "company") {
      navigate("/company");
    } else if (id === "documents") {
      navigate("/dashboard?tab=documents&status=all");
    } else {
      navigate(`/dashboard?tab=${id}`);
    }
  };

  const isDocActive = activeTab === "documents";
  const docStatus = searchParams.get("status") || "all";

  return (
    <aside className="w-[200px] border-r border-slate-100 bg-white p-4 space-y-1 hidden md:block shrink-0 shadow-[1px_0_2px_rgba(0,0,0,0.01)]">
      {sidebarItems.map((item) => {
        const itemActive = activeTab === item.id;
        
        return (
          <div key={item.id} className="space-y-1">
            <button
              onClick={() => handleNavigate(item.id)}
              className={`w-full flex items-center gap-3.5 px-4.5 py-3 rounded-lg text-xs font-bold transition-all ${
                itemActive
                  ? "bg-[#258ffb]/5 text-[#258ffb] shadow-[inset_3px_0_0_#258ffb]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <item.icon className={`h-4.5 w-4.5 ${itemActive ? "text-[#258ffb]" : "text-slate-400"}`} />
              {item.label}
            </button>
            
            {/* Nested sub-menu for Documents when active */}
            {isDocActive && item.id === "documents" && (
              <div className="pl-6.5 py-1 space-y-1 select-none border-l border-slate-100 ml-5.5 animate-in slide-in-from-top-1.5 duration-200">
                {[
                  { id: "completed", label: "Completed", color: "bg-emerald-500" },
                  { id: "pending", label: "Awaiting Signature", color: "bg-amber-500" },
                  { id: "cancelled", label: "Voided", color: "bg-red-500" },
                  { id: "draft", label: "Draft", color: "bg-slate-400" },
                  { id: "received", label: "Received", color: "bg-[#258ffb]" },
                  { id: "trash", label: "Trash", color: "bg-slate-300" },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => navigate(`/dashboard?tab=documents&status=${sub.id}`)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-[11px] font-bold transition-all ${
                      docStatus === sub.id
                        ? "text-[#258ffb] bg-[#258ffb]/5"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${sub.color}`} />
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
