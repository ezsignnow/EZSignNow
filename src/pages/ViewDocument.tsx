import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { SignaturePad, SignaturePadRef } from "@/components/signature/SignaturePad";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  Users,
  PenLine,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ViewDocument() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const signaturePadRef = useRef<SignaturePadRef>(null);
  
  const [document, setDocument] = useState<any>(null);
  const [signatories, setSignatories] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!id || !user) return;

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .eq("owner_id", user.id)
        .single();

      if (error || !data) {
        toast({
          title: "Document not found",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setDocument(data);

      const { data: sigData } = await supabase
        .from("signatories")
        .select("*")
        .eq("document_id", id)
        .order("order_num");

      setSignatories(sigData || []);

      const { data: fieldData } = await supabase
        .from("signature_fields")
        .select("*")
        .eq("document_id", id);

      setFields(fieldData || []);
      setLoading(false);
    };

    fetchDocument();
  }, [id, user, navigate, toast]);

  const handleSign = async () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      toast({
        title: "Please provide a signature",
        variant: "destructive",
      });
      return;
    }

    setSigning(true);
    const signatureData = signaturePadRef.current.getSignature();

    // For demo purposes, we'll update all signatories to signed
    // In a real app, you'd identify which signatory is signing
    try {
      await supabase
        .from("signatories")
        .update({ 
          status: "signed", 
          signed_at: new Date().toISOString(),
          signature_data: signatureData
        })
        .eq("document_id", id);

      // Check if all signed
      const { data: updatedSigs } = await supabase
        .from("signatories")
        .select("*")
        .eq("document_id", id);

      const allSigned = updatedSigs?.every((s) => s.status === "signed");

      if (allSigned) {
        await supabase
          .from("documents")
          .update({ status: "completed" })
          .eq("id", id);
      }

      toast({
        title: "Document signed!",
        description: "Your signature has been recorded.",
      });
      
      setSignDialogOpen(false);
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error signing",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!document) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{document.title}</h1>
            <p className="text-sm text-muted-foreground">
              Created {format(new Date(document.created_at), "MMMM d, yyyy")}
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
          {/* Document Preview */}
          <Card>
            <CardContent className="flex h-[600px] items-center justify-center p-8">
              <div className="text-center">
                <FileText className="mx-auto h-16 w-16 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium text-foreground">
                  {document.file_name}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Document preview would appear here
                </p>
                {document.status === "pending" && (
                  <Button className="mt-6" onClick={() => setSignDialogOpen(true)}>
                    <PenLine className="mr-2 h-4 w-4" />
                    Sign Document
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Document Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {document.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-amber-500" />
                  )}
                  <span className="font-medium capitalize text-foreground">
                    {document.status}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Signatories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Signatories ({signatories.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {signatories.map((sig) => (
                  <div
                    key={sig.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium text-foreground">{sig.name}</p>
                      <p className="text-xs text-muted-foreground">{sig.email}</p>
                    </div>
                    {sig.status === "signed" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <div className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">
                        Pending
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Fields Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Fields ({fields.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between rounded border border-border p-2"
                  >
                    <span className="text-sm text-foreground capitalize">
                      {field.label || field.field_type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {field.required ? "Required" : "Optional"}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Sign Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign Document</DialogTitle>
            <DialogDescription>
              Draw your signature below to sign this document.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <SignaturePad ref={signaturePadRef} width={380} height={150} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSign} disabled={signing}>
              {signing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PenLine className="mr-2 h-4 w-4" />
              )}
              Sign Document
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
