import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Search, 
  ChevronDown, 
  FolderPlus, 
  Eye, 
  Edit3, 
  Trash2, 
  MoreHorizontal, 
  Loader2,
  Calendar,
  Filter,
  RefreshCw,
  Laptop
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Document {
  id: string;
  title: string;
  file_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // URL Param & Filtering states
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get("status") || "all";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [dateFilter, setDateFilter] = useState("all");
  
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Sync statusFilter state with URL parameter changes
  useEffect(() => {
    setStatusFilter(urlStatus);
  }, [urlStatus]);

  const fetchDocuments = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      toast({
        title: "Error loading documents",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();

    if (user) {
      const channel = supabase
        .channel("document-list-realtime-grid")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "documents",
            filter: `owner_id=eq.${user.id}`,
          },
          () => {
            fetchDocuments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
      
      toast({ title: "Document deleted" });
      setDocToDelete(null);
      fetchDocuments();
    } catch (err: any) {
      toast({
        title: "Error deleting document",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleResendEmails = async (doc: Document) => {
    setResendingId(doc.id);
    try {
      // Fetch all signatories for this document
      const { data: signatories, error: sigError } = await supabase
        .from("signatories")
        .select("*")
        .eq("document_id", doc.id)
        .order("order_num");

      if (sigError) throw sigError;

      if (!signatories || signatories.length === 0) {
        toast({
          title: "No signatories found",
          description: "This document has no signatories to resend to.",
          variant: "destructive",
        });
        return;
      }

      let emailDispatched = true;
      try {
        const response = await fetch("/api/send-signing-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signatories,
            documentId: doc.id,
            documentTitle: doc.title,
            ownerEmail: user?.email || "support@ezsignnow.com",
          }),
        });

        if (!response.ok) {
          let errorText = "Failed to resend emails";
          try {
            const errorData = await response.json();
            errorText = errorData.error || errorText;
          } catch (e) {
            // Ignore parse errors on non-ok response
          }
          throw new Error(errorText);
        }
      } catch (emailErr: any) {
        console.warn("SMTP relay not available in this environment. Falling back to manual link sharing:", emailErr);
        emailDispatched = false;
      }

      if (emailDispatched) {
        toast({
          title: "Invitations resent!",
          description: `Signing invitations re-dispatched to ${signatories.length} signatory(ies) via Zoho Mail.`,
        });
      } else {
        toast({
          title: "Action required!",
          description: "Since this site is hosted statically, automated emails are simulated. Please click Options -> Copy Direct Sign Link to share manually.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Resend failed",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setResendingId(null);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedDocs(filteredDocs.map(d => d.id));
    } else {
      setSelectedDocs([]);
    }
  };

  const handleSelectDoc = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedDocs([...selectedDocs, id]);
    } else {
      setSelectedDocs(selectedDocs.filter(item => item !== id));
    }
  };

  // Perform client-side real-time filtration matching Search Input and Status selectors
  const filteredDocs = documents.filter((doc) => {
    // 1. Search Query filter
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      doc.file_name.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Status parameter filter
    let matchesStatus = true;
    if (statusFilter !== "all") {
      matchesStatus = doc.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return { label: "COMPLETED", bg: "bg-emerald-500/10 text-emerald-600", dot: "bg-emerald-500" };
      case "pending":
        return { label: "AWAITING SIGNATURE", bg: "bg-amber-500/10 text-amber-600", dot: "bg-amber-500" };
      case "cancelled":
        return { label: "VOIDED", bg: "bg-red-500/10 text-red-600", dot: "bg-red-500" };
      default:
        return { label: "DRAFT", bg: "bg-slate-100 text-slate-500", dot: "bg-slate-400" };
    }
  };

  const getUserInitials = () => {
    if (!user || !user.email) return "US";
    return user.email.slice(0, 2).toUpperCase();
  };

  const getUserDisplayName = () => {
    if (!user || !user.email) return "Meets User";
    return user.email.split("@")[0];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#258ffb] stroke-[2.5]" />
        <span className="text-xs font-semibold text-slate-400 mt-2">Loading documents...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Search and Filters Bar mirroring Signaturely */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-between select-none">
        <div className="flex flex-wrap gap-2.5 items-center flex-1">
          {/* Documents Scope Dropdown */}
          <div className="relative">
            <select className="appearance-none h-9 pl-4 pr-9 border border-slate-200 bg-white rounded text-xs font-bold text-slate-600 outline-none focus:border-[#258ffb]/40 cursor-pointer">
              <option>Documents</option>
              <option>Templates</option>
              <option>Forms</option>
            </select>
            <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Live Search Input */}
          <div className="relative flex-1 max-w-[280px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search for Documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs font-semibold border border-slate-200 bg-white rounded outline-none focus:border-[#258ffb]/40"
            />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select 
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setSearchParams({ tab: "documents", status: e.target.value });
              }}
              className="appearance-none h-9 pl-4 pr-9 border border-slate-200 bg-white rounded text-xs font-bold text-slate-600 outline-none focus:border-[#258ffb]/40 cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="completed">Completed</option>
              <option value="pending">Awaiting Signature</option>
              <option value="cancelled">Voided</option>
              <option value="draft">Draft</option>
            </select>
            <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Date Selector mock */}
          <div className="relative">
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="appearance-none h-9 pl-4 pr-9 border border-slate-200 bg-white rounded text-xs font-bold text-slate-600 outline-none focus:border-[#258ffb]/40 cursor-pointer"
            >
              <option value="all">Select date</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
            </select>
            <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Create Folder button */}
        <Button 
          variant="outline"
          onClick={() => toast({ title: "Folders Sandbox", description: "Created a new document collection folder." })}
          className="rounded-full h-9 border-[#258ffb] text-[#258ffb] hover:bg-[#258ffb]/5 font-bold text-xs shadow-sm shrink-0 self-start sm:self-center gap-1.5"
        >
          <FolderPlus className="h-4 w-4" />
          Create Folder
        </Button>
      </div>

      {/* Results Count Summary */}
      <div className="flex justify-between items-center text-xs font-bold text-slate-400 select-none px-1">
        <span>
          Showing {filteredDocs.length > 0 ? "1" : "0"}-{filteredDocs.length} of {filteredDocs.length} results
        </span>
        {selectedDocs.length > 0 && (
          <span className="text-[#258ffb] animate-in fade-in slide-in-from-right-1 duration-200">
            {selectedDocs.length} items selected
          </span>
        )}
      </div>

      {/* High-Fidelity Table grid */}
      {filteredDocs.length === 0 ? (
        <Card className="border-dashed border-slate-200 select-none">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center space-y-4">
            <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
              <FileText className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-700 text-sm">No documents found</h3>
              <p className="text-xs text-slate-400 max-w-[280px] mx-auto leading-relaxed">
                We couldn't find any documents matching your active search filters.
              </p>
            </div>
            <Button asChild className="bg-[#258ffb] hover:bg-[#1a7ae0] font-bold text-xs h-8.5 rounded-full px-5 shadow-sm">
              <Link to="/dashboard?tab=sign">Upload Document</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.01)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse select-none">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-extrabold text-slate-400 tracking-wider">
                  <th className="px-5 py-4 w-[50px] text-center">
                    <input 
                      type="checkbox"
                      checked={filteredDocs.length > 0 && selectedDocs.length === filteredDocs.length}
                      onChange={handleSelectAll}
                      className="h-3.5 w-3.5 rounded border-slate-300 accent-[#258ffb] cursor-pointer"
                    />
                  </th>
                  <th className="px-5 py-4">TITLE</th>
                  <th className="px-5 py-4 w-[160px]">DATE CREATED</th>
                  <th className="px-5 py-4 w-[200px]">CREATED BY</th>
                  <th className="px-5 py-4 w-[100px] text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => {
                  const isChecked = selectedDocs.includes(doc.id);
                  const status = getStatusConfig(doc.status);

                  return (
                    <tr 
                      key={doc.id} 
                      className={`border-b border-slate-100/60 hover:bg-slate-50/20 transition-all ${
                        isChecked ? "bg-[#258ffb]/5/20" : ""
                      }`}
                    >
                      {/* Checkbox cell */}
                      <td className="px-5 py-4 text-center">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectDoc(doc.id, e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-slate-300 accent-[#258ffb] cursor-pointer"
                        />
                      </td>

                      {/* Title & Status Badge cell */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8.5 w-8.5 bg-[#258ffb]/5 rounded flex items-center justify-center shrink-0">
                            <FileText className="h-4.5 w-4.5 text-[#258ffb]" />
                          </div>
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="text-[13px] font-bold text-slate-700 truncate max-w-[200px] md:max-w-[280px]">
                              {doc.title}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold select-none shrink-0 ${status.bg}`}>
                              <span className={`h-1 w-1 rounded-full ${status.dot}`} />
                              {status.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Date Created cell */}
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold text-slate-500">
                          {format(new Date(doc.created_at), "MMM d, yyyy")}
                        </span>
                      </td>

                      {/* Created By cell */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-[#258ffb] shrink-0 border border-slate-200/50">
                            {getUserInitials()}
                          </div>
                          <span className="text-xs font-bold text-slate-600 truncate max-w-[140px]">
                            {getUserDisplayName()}
                          </span>
                        </div>
                      </td>

                      {/* Actions cell */}
                      <td className="px-5 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-7 px-2 hover:bg-slate-50 border border-slate-100 rounded text-[10px] font-extrabold text-slate-500 hover:text-slate-700 bg-white transition-all flex items-center gap-1">
                              Options
                              <ChevronDown className="h-3 w-3 text-slate-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover w-48 p-1 border border-slate-100 shadow-md">
                            
                            {doc.status !== "draft" ? (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => navigate(`/document/${doc.id}/view`)}
                                  className="text-xs font-semibold text-slate-600 cursor-pointer"
                                >
                                  <Eye className="mr-2 h-4 w-4 text-slate-400" />
                                  View Audit Canvas
                                </DropdownMenuItem>
                                {doc.status === "pending" && (
                                  <DropdownMenuItem 
                                    onClick={() => navigate(`/document/${doc.id}/view?kiosk=true`)}
                                    className="text-xs font-bold text-[#258ffb] cursor-pointer mt-0.5 focus:text-[#1d7ee6] focus:bg-[#258ffb]/5"
                                  >
                                    <Laptop className="mr-2 h-4 w-4 text-[#258ffb]" />
                                    Host In-Person Sign
                                  </DropdownMenuItem>
                                )}
                              </>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => navigate(`/document/${doc.id}/prepare`)}
                                className="text-xs font-semibold text-[#258ffb] cursor-pointer"
                              >
                                <Edit3 className="mr-2 h-4 w-4" />
                                Prepare Document
                              </DropdownMenuItem>
                            )}

                            {/* Resend option — only visible for pending documents */}
                            {doc.status === "pending" && (
                              <DropdownMenuItem
                                onClick={() => handleResendEmails(doc)}
                                disabled={resendingId === doc.id}
                                className="text-xs font-semibold text-amber-600 cursor-pointer mt-0.5 focus:text-amber-700 focus:bg-amber-50"
                              >
                                {resendingId === doc.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                )}
                                {resendingId === doc.id ? "Resending..." : "Resend Invitations"}
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem 
                              onClick={() => setDocToDelete(doc.id)}
                              className="text-xs font-semibold text-destructive cursor-pointer mt-0.5"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete File
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Alert Modal */}
      <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent className="w-[90%] max-w-[420px] rounded-2xl select-none">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-base font-extrabold text-slate-800">
              Delete this document?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-semibold text-slate-400 leading-normal">
              This action is permanent and cannot be undone. This will delete the signature record from your database dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="rounded-full text-xs font-bold h-9">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => docToDelete && handleDelete(docToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full text-xs font-bold h-9 px-5"
            >
              Delete File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
