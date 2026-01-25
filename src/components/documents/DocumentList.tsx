import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Edit3,
  Trash2,
  Eye,
  Send
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Document {
  id: string;
  title: string;
  file_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { icon: typeof Clock; label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { icon: Edit3, label: "Draft", variant: "secondary" },
  pending: { icon: Clock, label: "Pending", variant: "default" },
  completed: { icon: CheckCircle2, label: "Completed", variant: "outline" },
  cancelled: { icon: XCircle, label: "Cancelled", variant: "destructive" },
};

export function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchDocuments = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading documents",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("documents").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting document",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Document deleted" });
      fetchDocuments();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-24 p-6" />
          </Card>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium text-foreground">No documents yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload your first document to get started
          </p>
          <Button asChild className="mt-4">
            <Link to="/upload">Upload Document</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => {
        const status = statusConfig[doc.status] || statusConfig.draft;
        const StatusIcon = status.icon;

        return (
          <Card key={doc.id} className="group transition-shadow hover:shadow-md">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{doc.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {doc.file_name} • {format(new Date(doc.created_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Badge variant={status.variant} className="gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>

                <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  {doc.status === "draft" && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/document/${doc.id}/prepare`}>
                        <Edit3 className="mr-1 h-4 w-4" />
                        Prepare
                      </Link>
                    </Button>
                  )}
                  {doc.status === "pending" && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/document/${doc.id}/view`}>
                        <Eye className="mr-1 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  )}
                  {doc.status === "completed" && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/document/${doc.id}/view`}>
                        <Eye className="mr-1 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete document?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the document and all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(doc.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
