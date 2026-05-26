import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, Save, Loader2, Plus, Trash2, PenTool, 
  HelpCircle, User, Briefcase, CreditCard, Star, LogOut, ChevronDown, Info,
  Settings, Copy, FileText, Move, X, AlertCircle, FileSignature
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BrandLogo } from "@/components/layout/BrandLogo";

// Types
interface TemplateRole {
  id: string;
  name: string;
  color: string;
}

interface TemplateField {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  tooltip?: string;
  required: boolean;
  roleId: string | null;
}

const colorPalette = [
  "#258ffb", // Premium Blue
  "#10b981", // Emerald Green
  "#8b5cf6", // Purple
  "#f59e0b", // Amber Yellow
  "#ec4899", // Rose Pink
];

export default function TemplateBuilder() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Template states
  const [templateName, setTemplateName] = useState("Untitled Template");
  const [templateDesc, setTemplateDesc] = useState("Standard reusable document template.");
  const [roles, setRoles] = useState<TemplateRole[]>([
    { id: "role-1", name: "Client Signer", color: "#258ffb" },
    { id: "role-2", name: "Internal Admin", color: "#10b981" }
  ]);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("role-1");
  const [isSaving, setIsSaving] = useState(false);
  const [draggingField, setDraggingField] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isPremium] = useState(localStorage.getItem("is_premium") === "true");

  const canvasRef = useRef<HTMLDivElement>(null);

  // Load existing template if editing
  useEffect(() => {
    if (id) {
      const stored = localStorage.getItem(`template_${id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setTemplateName(parsed.title || parsed.name || "Untitled Template");
          setTemplateDesc(parsed.desc || parsed.description || "");
          if (parsed.roles && parsed.roles.length > 0) {
            setRoles(parsed.roles);
            setSelectedRole(parsed.roles[0].id);
          }
          if (parsed.fields) {
            setFields(parsed.fields);
          }
          toast({
            title: "Template Loaded",
            description: `Ready to edit "${parsed.title || parsed.name}"`
          });
        } catch (e) {
          console.error("Error loading template details:", e);
        }
      }
    }
  }, [id, toast]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Roles management
  const handleAddRole = () => {
    if (roles.length >= 5) {
      toast({
        title: "Role limit reached",
        description: "Standard templates support up to 5 signatory placeholder roles.",
        variant: "destructive"
      });
      return;
    }
    const nextIndex = roles.length;
    const newRole: TemplateRole = {
      id: `role-${Date.now()}`,
      name: `Signer Role ${nextIndex + 1}`,
      color: colorPalette[nextIndex % colorPalette.length]
    };
    setRoles([...roles, newRole]);
    setSelectedRole(newRole.id);
  };

  const handleRemoveRole = (roleId: string) => {
    if (roles.length <= 1) {
      toast({
        title: "Minimum role required",
        description: "A template requires at least one signatory placeholder role.",
        variant: "destructive"
      });
      return;
    }
    setRoles(roles.filter(r => r.id !== roleId));
    setFields(fields.filter(f => f.roleId !== roleId));
    if (selectedRole === roleId) {
      const remaining = roles.filter(r => r.id !== roleId);
      setSelectedRole(remaining[0].id);
    }
  };

  const handleUpdateRoleName = (roleId: string, name: string) => {
    setRoles(roles.map(r => r.id === roleId ? { ...r, name } : r));
  };

  // Field Placement Handlers
  const handleAddField = (type: string, xPos = 120, yPos = 150) => {
    let width = 140;
    let height = 36;
    
    if (type === "checkbox") {
      width = 24;
      height = 24;
    } else if (type === "date" || type === "label") {
      width = 120;
      height = 36;
    }

    const newField: TemplateField = {
      id: `tfield-${Date.now()}`,
      type,
      x: xPos,
      y: yPos,
      width,
      height,
      required: true,
      roleId: selectedRole
    };
    setFields([...fields, newField]);
  };

  // Mouse drag handlers inside canvas
  const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDraggingField(fieldId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingField || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    setFields(
      fields.map((f) =>
        f.id === draggingField
          ? { 
              ...f, 
              x: Math.max(0, Math.min(x, rect.width - f.width)), 
              y: Math.max(0, Math.min(y, rect.height - f.height)) 
            }
          : f
      )
    );
  };

  const handleMouseUp = () => {
    setDraggingField(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const type = e.dataTransfer.getData("text/plain");
    if (!type) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const dropX = e.clientX - rect.left;
    const dropY = e.clientY - rect.top;

    let width = 140;
    let height = 36;
    if (type === "checkbox") {
      width = 24;
      height = 24;
    } else if (type === "date" || type === "label") {
      width = 120;
      height = 36;
    }

    const x = Math.max(0, Math.min(dropX - width / 2, rect.width - width));
    const y = Math.max(0, Math.min(dropY - height / 2, rect.height - height));

    const newField: TemplateField = {
      id: `tfield-${Date.now()}`,
      type,
      x,
      y,
      width,
      height,
      required: true,
      roleId: selectedRole
    };
    setFields([...fields, newField]);
  };

  const handleDeleteField = (fieldId: string) => {
    setFields(fields.filter(f => f.id !== fieldId));
    setEditingField(null);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please specify a name for this template.",
        variant: "destructive"
      });
      return;
    }

    if (fields.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please place at least one signature or form field on the canvas.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    setTimeout(() => {
      const templateId = id || `temp-${Date.now()}`;
      const payload = {
        id: templateId,
        title: templateName,
        desc: templateDesc,
        roles,
        fields,
        updatedAt: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric"
        }),
        isCustom: true
      };

      // Store individual template
      localStorage.setItem(`template_${templateId}`, JSON.stringify(payload));

      // Append to the list of templates
      const listStored = localStorage.getItem("custom_templates_list") || "[]";
      try {
        const parsedList = JSON.parse(listStored);
        const filtered = parsedList.filter((item: any) => item.id !== templateId);
        filtered.unshift({
          id: templateId,
          title: templateName,
          desc: templateDesc,
          duration: `Last updated ${payload.updatedAt}`
        });
        localStorage.setItem("custom_templates_list", JSON.stringify(filtered));
      } catch (err) {
        console.error("Error updating templates list", err);
      }

      setIsSaving(false);
      toast({
        title: "Template Saved Successfully",
        description: `"${templateName}" is now available in your reusable templates list.`,
      });
      navigate("/dashboard?tab=templates");
    }, 1000);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#258ffb]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfdfe] antialiased">
      {/* Header bar matching Signaturely */}
      <header className="border-b border-slate-100 bg-white px-6 py-4 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.02)] shrink-0 transition-colors">
        <BrandLogo onClick={() => navigate("/dashboard")} className="cursor-pointer" />

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-semibold select-none">
            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[11px] font-bold">
              Premium
            </span>
            <span>Templates Studio</span>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-slate-50/50 p-1.5 rounded-lg transition-all bg-white select-none focus:outline-none">
                  <div className="h-7 w-7 rounded-full bg-[#10b981] border border-slate-100 flex items-center justify-center text-[10px] font-extrabold text-white shadow-sm shrink-0 uppercase">
                    {user.email ? user.email.slice(0, 2) : "US"}
                  </div>
                  <span className="text-xs font-bold text-slate-600 hidden md:inline max-w-[120px] truncate">
                    {user.email ? user.email.split("@")[0] : "User"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white w-52 p-1 border border-slate-100 shadow-md select-none">
                <DropdownMenuItem onClick={() => navigate("/dashboard?tab=team")} className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer">
                  <Briefcase className="mr-3 h-4 w-4 text-slate-400" />
                  Company
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard?tab=settings")} className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer mt-0.5">
                  <User className="mr-3 h-4 w-4 text-slate-400" />
                  Profile
                </DropdownMenuItem>
                <div className="border-t border-slate-100 my-1" />
                <DropdownMenuItem onClick={handleSignOut} className="text-xs font-bold text-destructive hover:text-destructive/95 py-2.5 cursor-pointer">
                  <LogOut className="mr-3 h-4 w-4 text-slate-400" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button onClick={() => toast({ title: "Template Builder Help", description: "This builder lets you position signature panels for your roles." })} className="h-[34px] w-[34px] rounded-full border border-slate-100 hover:border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 bg-white shadow-sm transition-all focus:outline-none">
              <HelpCircle className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Workspace */}
      <main className="container mx-auto px-6 py-5 max-w-[1400px] flex-1 flex flex-col">
        {/* Header Controls */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/dashboard?tab=templates")} 
              className="h-9 w-9 rounded-full border border-slate-100 hover:border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all focus:outline-none"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50/50 border border-blue-100 rounded-xl text-[#258ffb] shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                <FileSignature className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-base font-extrabold text-slate-800 tracking-tight leading-tight">
                    {templateName || "Untitled Template"}
                  </h1>
                  <span className="bg-blue-50 text-[#258ffb] border border-blue-100 font-extrabold px-2.5 py-0.5 text-[9px] rounded-full uppercase select-none tracking-wider shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                    Reusable Layout
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5 leading-normal">
                  Define signatory placeholders and drag input fields onto the reusable layout canvas.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2.5 items-center">
            <Button 
              onClick={handleSaveTemplate}
              disabled={isSaving}
              className="rounded-full bg-[#258ffb] hover:bg-[#1d7ee6] text-white h-9.5 px-6 font-bold text-xs shadow-sm transition-all flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {isSaving ? "Saving..." : "Save Template Layout"}
            </Button>
          </div>
        </div>

        {/* Builder Split Layout */}
        <div className="grid gap-6 lg:grid-cols-[280px_1fr_320px] flex-1 items-stretch">
          
          {/* Left Panel - Properties & Fields */}
          <div className="space-y-5">
            {/* Template Basic Info */}
            <Card className="border-slate-100/80 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)] bg-white p-5 space-y-4">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Template Properties</h3>
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400">TEMPLATE TITLE</Label>
                  <Input 
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Mutual NDA"
                    className="text-xs font-semibold h-9 rounded-lg border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400">DESCRIPTION</Label>
                  <textarea 
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    placeholder="Describe when to use this template layout..."
                    rows={3}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:border-[#258ffb]/50 focus:outline-none resize-none"
                  />
                </div>
              </div>
            </Card>

            {/* Field Palette */}
            <Card className="border-slate-100/80 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)] bg-white p-5 space-y-3.5">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                Field Palette
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-800 text-white border-0 text-[10px] rounded-lg p-2 max-w-xs shadow-md">
                      <p className="font-semibold">Drag fields onto the canvas or click them to place them under the currently active role.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h3>

              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { type: "signature", label: "Signature Field", color: "text-[#258ffb] bg-blue-50/50" },
                  { type: "text", label: "Text Input Box", color: "text-purple-500 bg-purple-50/50" },
                  { type: "checkbox", label: "Checkbox Option", color: "text-emerald-500 bg-emerald-50/50" },
                  { type: "date", label: "Date Picker Box", color: "text-amber-500 bg-amber-50/50" },
                  { type: "label", label: "Text Label Tag", color: "text-rose-500 bg-rose-50/50" },
                ].map((fieldOption) => (
                  <button
                    key={fieldOption.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", fieldOption.type);
                    }}
                    onClick={() => handleAddField(fieldOption.type)}
                    className="w-full flex items-center justify-between border border-slate-100 hover:border-slate-200 hover:bg-slate-50/40 p-2.5 rounded-xl transition-all text-xs font-bold text-slate-600 text-left select-none cursor-grab active:cursor-grabbing focus:outline-none"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={`h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-extrabold shrink-0 ${fieldOption.color}`}>
                        {fieldOption.type.slice(0, 2).toUpperCase()}
                      </span>
                      {fieldOption.label}
                    </span>
                    <Plus className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Center Canvas Workspace */}
          <div className="flex-1 flex flex-col items-center">
            {/* Visual Workspace Canvas */}
            <Card
              className="relative w-full max-w-[620px] bg-slate-50/40 border border-slate-100 rounded-2xl h-[780px] p-6 overflow-hidden flex flex-col justify-between shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] transition-colors"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <div 
                ref={canvasRef}
                className="relative w-full h-full bg-white border border-slate-100/60 rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.015)] p-8 flex flex-col select-none"
              >
                {/* Visual Contract Background Guide */}
                <div className="flex-1 border-b border-dashed border-slate-100 pb-4 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-150">
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">STANDARD TEMPLATE OUTLINE</span>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider">Page 1 of 1</span>
                  </div>

                  <div className="space-y-2.5 pt-4">
                    <h2 className="text-sm font-extrabold text-slate-700 tracking-tight">{templateName.toUpperCase()}</h2>
                    <p className="text-[11px] leading-relaxed text-slate-400">
                      This document outline serves as a visual framework for your reusable layout. Drag and drop signature panels and form fields on behalf of your designated signing roles. When users instantiate this template, these placeholders will transform into signature-ready input regions.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-6 border-t border-slate-100">
                    <h3 className="text-[11px] font-bold text-slate-650 tracking-tight">1. CORE ENGAGEMENT TERMS</h3>
                    <p className="text-[10px] leading-relaxed text-slate-400">
                      The parties involved mutually acknowledge and agree to comply with the legal conditions pre-configured within this signature pipeline layout. All associated records and data inputs will execute under strict compliance standards.
                    </p>
                  </div>

                  <div className="pt-20 space-y-4">
                    <h3 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">2. EXECUTION & SIGNATURES</h3>
                    <p className="text-[10px] text-slate-400 italic">
                      In witness whereof, the placeholders placed below signify dynamic legal consent zones.
                    </p>
                  </div>
                </div>

                {/* Footer canvas visual indicators */}
                <div className="pt-4 flex justify-between items-center text-[10px] font-bold text-slate-400 select-none">
                  <span>EZ-SIGN-NOW TEMPLATES</span>
                  <span>CONFIDENTIAL & SECURE</span>
                </div>

                {/* Placed Fields */}
                {fields.map((field) => {
                  const role = roles.find((r) => r.id === field.roleId);
                  const roleColor = role?.color || "#e2e8f0";
                  
                  return (
                    <div
                      key={field.id}
                      className="absolute flex items-center justify-between border px-2 py-1.5 shadow-sm rounded-xl transition-all cursor-move hover:shadow-md select-none group"
                      style={{
                        left: field.x,
                        top: field.y,
                        width: field.width,
                        height: field.height,
                        borderColor: roleColor,
                        backgroundColor: `${roleColor}10`
                      }}
                      onMouseDown={(e) => handleMouseDown(e, field.id)}
                      onDoubleClick={() => setEditingField(field.id)}
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="h-4.5 w-4.5 bg-white rounded-md border border-slate-100 flex items-center justify-center shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: roleColor }} />
                        </span>
                        <span className="text-[11px] font-bold text-slate-700 truncate">
                          {editingField === field.id ? (
                            <input 
                              value={field.label || field.type}
                              onChange={(e) => setFields(fields.map(f => f.id === field.id ? { ...f, label: e.target.value } : f))}
                              onKeyDown={(e) => { if (e.key === "Enter") setEditingField(null); }}
                              className="w-16 border-0 focus:ring-0 p-0 text-[11px] font-bold"
                              autoFocus
                            />
                          ) : (
                            field.label || field.type.toUpperCase()
                          )}
                        </span>
                      </span>

                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteField(field.id); }}
                          className="p-0.5 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-50 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Right Panel - Roles Config */}
          <div className="space-y-5">
            <Card className="border-slate-100/80 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)] bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Signatory Roles</h3>
                <Button 
                  onClick={handleAddRole}
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-full text-[10px] font-extrabold px-3 flex items-center gap-1 border-slate-200"
                >
                  <Plus className="h-3 w-3" />
                  Add Role
                </Button>
              </div>

              <p className="text-[11px] text-slate-450 leading-normal">
                Define the placeholder roles (e.g. Vendor, Approver) that need to fill signature fields.
              </p>

              <div className="space-y-3">
                {roles.map((role) => {
                  const roleFieldCount = fields.filter(f => f.roleId === role.id).length;
                  return (
                    <div 
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className={`p-3.5 border rounded-2xl transition-all cursor-pointer space-y-2.5 ${
                        selectedRole === role.id 
                          ? "border-[#258ffb] bg-blue-50/10 shadow-[0_4px_12px_rgba(37,143,251,0.02)]" 
                          : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/20"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="h-3.5 w-3.5 rounded-full shrink-0 border border-white shadow-sm" style={{ backgroundColor: role.color }} />
                          <input 
                            value={role.name}
                            onChange={(e) => handleUpdateRoleName(role.id, e.target.value)}
                            className="bg-transparent border-0 font-extrabold text-xs text-slate-700 focus:outline-none focus:ring-0 w-full p-0 leading-none"
                          />
                        </div>
                        {roles.length > 1 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleRemoveRole(role.id); }}
                            className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 pt-1">
                        <span className="uppercase">Role Fields</span>
                        <span className="bg-slate-100 text-slate-650 px-2 py-0.5 rounded-full">{roleFieldCount} active</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Instruction Banner */}
            <Card className="border-blue-100 bg-blue-50/20 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-[#258ffb]">
                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                <h4 className="text-xs font-extrabold">Builder Tip</h4>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 font-semibold">
                Select a role card above before dragging or clicking elements from the field palette. This assigns the newly placed field to that specific signatory placeholder automatically!
              </p>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
