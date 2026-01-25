import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { FieldPalette } from "@/components/documents/FieldPalette";
import { SignatoryManager, Signatory } from "@/components/documents/SignatoryManager";
import { DocumentCanvas, Field } from "@/components/documents/DocumentCanvas";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Send, Loader2 } from "lucide-react";

export default function PrepareDocument() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [document, setDocument] = useState<any>(null);
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedSignatory, setSelectedSignatory] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

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
          description: "The document you're looking for doesn't exist.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setDocument(data);

      // Fetch existing signatories
      const { data: sigData } = await supabase
        .from("signatories")
        .select("*")
        .eq("document_id", id)
        .order("order_num");

      if (sigData) {
        const colors = [
          "hsl(200, 98%, 39%)",
          "hsl(142, 76%, 36%)",
          "hsl(262, 83%, 58%)",
          "hsl(24, 100%, 50%)",
          "hsl(340, 82%, 52%)",
        ];
        setSignatories(
          sigData.map((s, i) => ({
            ...s,
            color: colors[i % colors.length],
          }))
        );
      }

      // Fetch existing fields
      const { data: fieldData } = await supabase
        .from("signature_fields")
        .select("*")
        .eq("document_id", id);

      if (fieldData) {
        setFields(
          fieldData.map((f) => ({
            id: f.id,
            type: f.field_type,
            x: Number(f.x_position),
            y: Number(f.y_position),
            width: Number(f.width),
            height: Number(f.height),
            label: f.label || undefined,
            tooltip: f.tooltip || undefined,
            required: f.required,
            signatoryIndex: null,
            value: f.value || undefined,
          }))
        );
      }

      setLoading(false);
    };

    fetchDocument();
  }, [id, user, navigate, toast]);

  const handleAddSignatory = async (signatory: Omit<Signatory, "id" | "status">) => {
    setSignatories([...signatories, signatory as Signatory]);
  };

  const handleRemoveSignatory = (index: number) => {
    setSignatories(signatories.filter((_, i) => i !== index));
    if (selectedSignatory === index) {
      setSelectedSignatory(null);
    }
  };

  const handleAddField = (type: string) => {
    const newField: Field = {
      id: `field-${Date.now()}`,
      type,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width: type === "checkbox" ? 40 : 200,
      height: type === "checkbox" ? 40 : 50,
      required: true,
      signatoryIndex: selectedSignatory,
    };
    setFields([...fields, newField]);
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);

    try {
      // Save signatories
      await supabase.from("signatories").delete().eq("document_id", id);
      
      if (signatories.length > 0) {
        const { error: sigError } = await supabase.from("signatories").insert(
          signatories.map((s, i) => ({
            document_id: id,
            email: s.email,
            name: s.name,
            order_num: i + 1,
          }))
        );
        if (sigError) throw sigError;
      }

      // Save fields
      await supabase.from("signature_fields").delete().eq("document_id", id);
      
      if (fields.length > 0) {
        const { error: fieldError } = await supabase.from("signature_fields").insert(
          fields.map((f) => ({
            document_id: id,
            field_type: f.type,
            x_position: f.x,
            y_position: f.y,
            width: f.width,
            height: f.height,
            label: f.label,
            tooltip: f.tooltip,
            required: f.required,
          }))
        );
        if (fieldError) throw fieldError;
      }

      toast({ title: "Changes saved" });
    } catch (error: any) {
      toast({
        title: "Error saving",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (signatories.length === 0) {
      toast({
        title: "No signatories",
        description: "Please add at least one signatory.",
        variant: "destructive",
      });
      return;
    }

    if (fields.length === 0) {
      toast({
        title: "No fields",
        description: "Please add at least one field for signing.",
        variant: "destructive",
      });
      return;
    }

    await handleSave();

    // Update document status
    const { error } = await supabase
      .from("documents")
      .update({ status: "pending" })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Document sent!",
      description: "Signatories will receive an email to sign the document.",
    });
    navigate("/dashboard");
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
      
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{document.title}</h1>
              <p className="text-sm text-muted-foreground">
                Add fields and signatories to your document
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Draft
            </Button>
            <Button onClick={handleSend}>
              <Send className="mr-2 h-4 w-4" />
              Send for Signing
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-[280px_1fr_280px]">
          {/* Left Sidebar - Field Palette */}
          <div className="space-y-4">
            <FieldPalette onAddField={handleAddField} />
          </div>

          {/* Center - Document Canvas */}
          <DocumentCanvas
            fields={fields}
            onFieldsChange={setFields}
            signatories={signatories}
            selectedSignatory={selectedSignatory}
          />

          {/* Right Sidebar - Signatories */}
          <div>
            <SignatoryManager
              signatories={signatories}
              onAdd={handleAddSignatory}
              onRemove={handleRemoveSignatory}
              onReorder={setSignatories}
              selectedSignatory={selectedSignatory}
              onSelectSignatory={setSelectedSignatory}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
