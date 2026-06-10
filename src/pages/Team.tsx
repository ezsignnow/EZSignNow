import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Briefcase, Star, User, PenTool, 
  ChevronDown, LogOut, Headset, CreditCard, 
  Users, UserPlus, Clock, Mail
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAbsoluteUrl } from "@/utils/url";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { BrandLogo } from "@/components/layout/BrandLogo";

export default function Team() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [teamMembers, setTeamMembers] = useState([
    { email: "meets@example.com", role: "Admin", status: "Active" },
    { email: "sarah.jenkins@corp.com", role: "Member", status: "Active" },
    { email: "john.doe@techladder.com", role: "Viewer", status: "Active" }
  ]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [pendingInvites, setPendingInvites] = useState([
    { email: "m.chen@EZSignNow.com", role: "Member", invitedAt: "May 24, 2026" },
    { email: "alex.rivera@corp.com", role: "Manager", invitedAt: "May 25, 2026" }
  ]);
  const [collaborativeFeatures, setCollaborativeFeatures] = useState({
    shareTemplates: true,
    auditTrailsPublic: true,
    enforceSso: false
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    if (teamMembers.some(m => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
      toast({ title: "Already Member", description: "This email is already an active member of this workspace.", variant: "destructive" });
      return;
    }
    if (pendingInvites.some(i => i.email.toLowerCase() === inviteEmail.toLowerCase())) {
      toast({ title: "Already Invited", description: "This email already has an active pending workspace invitation.", variant: "destructive" });
      return;
    }

    const newInvite = {
      email: inviteEmail,
      role: inviteRole,
      invitedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    };
    
    setPendingInvites([...pendingInvites, newInvite]);
    setInviteEmail("");
    
    toast({
      title: "Invitation Sent",
      description: `Dynamic Zoho mail relay has sent an encrypted ${inviteRole} invite to ${inviteEmail}.`
    });
  };

  const handleRemoveMember = (email: string) => {
    setTeamMembers(teamMembers.filter(m => m.email !== email));
    toast({
      title: "Member Removed",
      description: `${email} has been revoked from the workspace.`
    });
  };

  const handleUpdateMemberRole = (email: string, newRole: string) => {
    setTeamMembers(teamMembers.map(m => m.email === email ? { ...m, role: newRole } : m));
    toast({
      title: "Role Updated",
      description: `${email} is now a ${newRole}.`
    });
  };

  const handleResendInvite = (email: string) => {
    toast({
      title: "Invitation Resent",
      description: `Dispatched fresh verification token to ${email}.`
    });
  };

  const handleRevokeInvite = (email: string) => {
    setPendingInvites(pendingInvites.filter(i => i.email !== email));
    toast({
      title: "Invitation Revoked",
      description: `Canceled pending invitation for ${email}.`
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      <header className="h-[60px] bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0 z-10 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <BrandLogo onClick={() => navigate("/dashboard")} className="cursor-pointer" />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 border-l border-slate-100 pl-4 ml-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-slate-50 py-1.5 px-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20">
                  <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-black shrink-0 border border-emerald-200">
                    {user?.email ? user.email.slice(0, 2).toUpperCase() : "U"}
                  </div>
                  <span className="text-xs font-bold text-slate-600 hidden md:inline max-w-[120px] truncate">
                    {user?.email ? user.email.split("@")[0] : "User"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover w-52 p-1 border border-slate-100/80 shadow-md select-none">
                <DropdownMenuItem onClick={() => navigate("/company")} className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer">
                  <Briefcase className="mr-3 h-4 w-4 text-slate-400" />
                  Company
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard?tab=settings")} className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer mt-0.5">
                  <User className="mr-3 h-4 w-4 text-slate-400" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  navigate("/dashboard?tab=settings");
                  setTimeout(() => toast({ title: "Edit Signature Active", description: "Select your default cursive script fonts below." }), 300);
                }} className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer mt-0.5">
                  <PenTool className="mr-3 h-4 w-4 text-slate-400" />
                  Edit Signature
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/try-trial")} className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer mt-0.5">
                  <CreditCard className="mr-3 h-4 w-4 text-slate-400" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  navigator.clipboard.writeText(getAbsoluteUrl(`/signup?ref=${user?.email?.split("@")[0] || "ezsignnow"}`));
                  toast({ title: "Share & Earn Copied!", description: "Your unique referral link has been copied to clipboard!" });
                }} className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 cursor-pointer mt-0.5">
                  <Star className="mr-3 h-4 w-4 text-slate-400" />
                  Share & Earn
                </DropdownMenuItem>
                <div className="border-t border-slate-100 my-1" />
                <DropdownMenuItem onClick={handleSignOut} className="text-xs font-bold text-destructive hover:text-destructive/95 py-2.5 cursor-pointer">
                  <LogOut className="mr-3 h-4 w-4 text-slate-400" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button onClick={() => navigate("/support")} className="h-[34px] flex items-center justify-center gap-1.5 px-3 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-600 font-bold text-[11px] shadow-sm transition-all focus:outline-none ml-1">
              <Headset className="h-4 w-4" />
              <span className="hidden sm:inline uppercase tracking-wider">Support</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />

        <main className="flex-1 overflow-y-auto bg-[#fafafa]">
          <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-200">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">Team Management</h1>
              <p className="text-sm text-slate-500 mt-1">Manage team members, roles, and collaboration settings.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Left Column: Invites & Collaboration Policies */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Invite Collaborator Form */}
                <Card className="border-slate-100/80 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)] bg-white p-5 space-y-4">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-[#22c55e]" />
                    Invite Collaborator
                  </h3>

                  <form onSubmit={handleInviteMember} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-400 font-semibold">EMAIL ADDRESS</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input 
                          type="email" 
                          placeholder="colleague@company.com" 
                          value={inviteEmail} 
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="text-xs font-semibold pl-9 h-9 rounded-lg border-slate-200"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-400 font-semibold">COLLABORATOR ROLE</Label>
                      <select 
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full text-xs font-semibold h-9 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none"
                      >
                        <option value="Member">Member (Create & send documents)</option>
                        <option value="Admin">Admin (Full administrative controls)</option>
                        <option value="Manager">Manager (Review team records)</option>
                        <option value="Viewer">Viewer (Read-only access)</option>
                      </select>
                    </div>

                    <Button 
                      type="submit"
                      className="w-full bg-[#22c55e] hover:bg-[#1a7ae0] font-bold text-xs h-9.5 rounded-full px-5 shadow-sm"
                    >
                      Send Invitation
                    </Button>
                  </form>
                </Card>

                {/* Collaborative Settings Switches */}
                <Card className="border-slate-100/80 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.01)] bg-white p-5 space-y-3.5">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Collaboration Policies</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                      <div>
                        <p className="text-[11.5px] font-bold text-slate-700 leading-tight">Shared Library</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Let members view & use saved templates.</p>
                      </div>
                      <button 
                        onClick={() => setCollaborativeFeatures({ ...collaborativeFeatures, shareTemplates: !collaborativeFeatures.shareTemplates })}
                        className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 outline-none focus:ring-0 ${
                          collaborativeFeatures.shareTemplates ? "bg-emerald-500" : "bg-slate-200"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-250 ${
                          collaborativeFeatures.shareTemplates ? "translate-x-4" : "translate-x-0"
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                      <div>
                        <p className="text-[11.5px] font-bold text-slate-700 leading-tight">Audit Trail Access</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Allow public viewing of signature certificate hashes.</p>
                      </div>
                      <button 
                        onClick={() => setCollaborativeFeatures({ ...collaborativeFeatures, auditTrailsPublic: !collaborativeFeatures.auditTrailsPublic })}
                        className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 outline-none focus:ring-0 ${
                          collaborativeFeatures.auditTrailsPublic ? "bg-emerald-500" : "bg-slate-200"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-250 ${
                          collaborativeFeatures.auditTrailsPublic ? "translate-x-4" : "translate-x-0"
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <p className="text-[11.5px] font-bold text-slate-700 leading-tight flex items-center gap-1">
                          Enforce SSO/MFA
                          <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Require multi-factor login for all members.</p>
                      </div>
                      <button 
                        onClick={() => {
                          toast({
                            title: "Enterprise Policy",
                            description: "Enforcing corporate SSO requires a premium Antigravity enterprise contract.",
                          });
                        }}
                        className="w-9 h-5 rounded-full bg-slate-100 flex items-center p-0.5 cursor-not-allowed border border-slate-200"
                      >
                        <div className="w-4 h-4 rounded-full bg-slate-350 shadow-sm translate-x-0" />
                      </button>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Column: Members and Pending Invites */}
              <div className="lg:col-span-2 space-y-6">
                {/* Active Collaborators list */}
                <Card className="border-slate-100/80 rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.02)] bg-white overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                      <Users className="h-4.5 w-4.5 text-[#22c55e]" />
                      Active Workspace Members ({teamMembers.length})
                    </h3>
                    <span className="text-[10px] font-bold text-slate-450 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Collaborators Plan
                    </span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse select-none">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400">EMAIL ADDRESS</th>
                          <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400">ACCESS ROLE</th>
                          <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 text-center">STATUS</th>
                          <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 text-right">ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMembers.map((member) => (
                          <tr key={member.email} className="border-b border-slate-100/60 hover:bg-slate-50/10 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8.5 w-8.5 bg-blue-50 border border-blue-100 text-[#22c55e] font-black rounded-full flex items-center justify-center text-xs shrink-0 shadow-sm uppercase">
                                  {member.email.slice(0, 2)}
                                </div>
                                <div>
                                  <p className="text-[12.5px] font-bold text-slate-700 leading-none">{member.email}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold mt-1">Invited via direct link</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              {member.email === "meets@example.com" ? (
                                <span className="text-[10.5px] font-bold text-slate-650 bg-slate-100/80 border border-slate-200/80 px-2 py-0.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.01)] uppercase select-none">
                                  {member.role}
                                </span>
                              ) : (
                                <select
                                  value={member.role}
                                  onChange={(e) => handleUpdateMemberRole(member.email, e.target.value)}
                                  className="text-xs font-bold text-slate-500 bg-white hover:text-slate-700 border border-slate-100 hover:border-slate-250 rounded px-1.5 py-0.5 focus:outline-none"
                                >
                                  <option value="Admin">Admin</option>
                                  <option value="Member">Member</option>
                                  <option value="Manager">Manager</option>
                                  <option value="Viewer">Viewer</option>
                                </select>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-[0_1px_2px_rgba(0,0,0,0.01)] uppercase select-none">
                                {member.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              {member.email !== "meets@example.com" && (
                                <button
                                  onClick={() => handleRemoveMember(member.email)}
                                  className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:underline p-1 cursor-pointer focus:outline-none"
                                >
                                  Remove
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* Pending invitations table */}
                {pendingInvites.length > 0 && (
                  <Card className="border-slate-100/80 rounded-2xl shadow-[0_4px_20px_-2px_rgba(0,0,0,0.02)] bg-white overflow-hidden">
                    <div className="p-5 border-b border-slate-100">
                      <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                        <Clock className="h-4.5 w-4.5 text-amber-500" />
                        Pending Collaborator Invitations ({pendingInvites.length})
                      </h3>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse select-none">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400">PENDING EMAIL</th>
                            <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400">ASSIGNED ROLE</th>
                            <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400">DATE SENT</th>
                            <th className="px-5 py-3.5 text-[10px] font-bold text-slate-400 text-right">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingInvites.map((invite) => (
                            <tr key={invite.email} className="border-b border-slate-100/60 hover:bg-slate-50/5 transition-colors">
                              <td className="px-5 py-4">
                                <span className="text-[12.5px] font-bold text-slate-700">{invite.email}</span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                                  {invite.role}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-xs text-slate-400 font-semibold">{invite.invitedAt}</span>
                              </td>
                              <td className="px-5 py-4 text-right flex justify-end gap-3.5">
                                <button
                                  onClick={() => handleResendInvite(invite.email)}
                                  className="text-xs font-bold text-[#22c55e] hover:text-[#1d7ee6] hover:underline cursor-pointer focus:outline-none"
                                >
                                  Resend Link
                                </button>
                                <button
                                  onClick={() => handleRevokeInvite(invite.email)}
                                  className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:underline cursor-pointer focus:outline-none"
                                >
                                  Revoke Invite
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
              
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}



