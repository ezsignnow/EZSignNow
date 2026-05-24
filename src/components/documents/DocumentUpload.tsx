import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, FileText, ChevronDown, Check, Upload, Sparkles, Mail, FileSpreadsheet } from "lucide-react";

export function DocumentUpload() {
  const [activeTab, setActiveTab] = useState<"upload" | "bulk">("upload");
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Tab 1: Single File Upload States
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Tab 2: Bulk Send States
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvDragActive, setCsvDragActive] = useState(false);
  const [csvRecipients, setCsvRecipients] = useState<{ name: string; email: string }[]>([]);
  const [bulkTitle, setBulkTitle] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkSendStep, setBulkSendStep] = useState("");

  // Handler for local file drag
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave" || e.type === "drop") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // CSV Drag and Drop Handlers
  const handleCsvDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setCsvDragActive(true);
    } else if (e.type === "dragleave" || e.type === "drop") {
      setCsvDragActive(false);
    }
  }, []);

  const handleCsvDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCsvDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".csv")) {
        setCsvFile(droppedFile);
        // Load mock recipients
        setCsvRecipients([
          { name: "Alice Vance", email: "alice.vance@corp.com" },
          { name: "Bob Vance", email: "bob.vance@corp.com" },
          { name: "Charles Vance", email: "charles.vance@ezsignnow.com" }
        ]);
        toast({
          title: "CSV File Loaded",
          description: "Loaded 3 recipients from list.",
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a valid CSV list file",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setCsvFile(selected);
      setCsvRecipients([
        { name: "Alice Vance", email: "alice.vance@corp.com" },
        { name: "Bob Vance", email: "bob.vance@corp.com" },
        { name: "Charles Vance", email: "charles.vance@ezsignnow.com" }
      ]);
      toast({
        title: "CSV File Loaded",
        description: "Loaded 3 recipients from list.",
      });
    }
  };

  const handleAutofillCsv = () => {
    const blob = new Blob(["Name,Email\nAlice Vance,alice.vance@corp.com\nBob Vance,bob.vance@corp.com\nCharles Vance,charles.vance@ezsignnow.com"], { type: "text/csv" });
    const mockFile = new File([blob], "recipients_list.csv", { type: "text/csv" });
    setCsvFile(mockFile);
    setCsvRecipients([
      { name: "Alice Vance", email: "alice.vance@corp.com" },
      { name: "Bob Vance", email: "bob.vance@corp.com" },
      { name: "Charles Vance", email: "charles.vance@ezsignnow.com" }
    ]);
    if (!bulkTitle) {
      setBulkTitle("Non-Disclosure Agreement (NDA)");
    }
    toast({
      title: "Autofilled CSV Contacts",
      description: "Successfully loaded pre-validated sandbox email list.",
    });
  };

  // Simulating Cloud Uploads
  const simulateCloudImport = (provider: string) => {
    toast({
      title: `Connecting to ${provider}...`,
      description: "This is a sandbox mock. Simulating a document import...",
    });
    setUploading(true);
    
    setTimeout(() => {
      const mockPdfContent = "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n5 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Mocked Document) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000219 00000 n \n0000000307 00000 n \ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n372\n%%EOF";
      const blob = new Blob([mockPdfContent], { type: "application/pdf" });
      const simulatedFile = new File([blob], `${provider}_Imported_Doc.pdf`, { type: "application/pdf" });
      setFile(simulatedFile);
      setUploading(false);
      toast({
        title: "Import Successful",
        description: `Simulated a file import from ${provider}.`,
      });
    }, 1500);
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop() || "pdf";
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(fileName);

      const title = file.name.replace(".pdf", "");

      const { data: docData, error: docError } = await supabase
        .from("documents")
        .insert({
          owner_id: user.id,
          title: title,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          status: "draft",
        })
        .select()
        .single();

      if (docError) throw docError;

      toast({
        title: "Document uploaded!",
        description: "Now add signatories and fields to your document.",
      });

      navigate(`/document/${docData.id}/prepare`);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Bulk Send Dispatch Logic with full anim simulation & DB inserts!
  const handleBulkSend = () => {
    if (!selectedTemplate || !csvFile || !bulkTitle || !user) {
      toast({
        title: "Validation Incomplete",
        description: "Please select a template, upload a CSV list, and fill in the title.",
        variant: "destructive"
      });
      return;
    }

    setIsBulkSending(true);
    setBulkProgress(0);
    setBulkSendStep("Preparing bulk distribution template...");

    const intervals = [
      { progress: 10, step: "Reading CSV recipient contacts list..." },
      { progress: 33, step: "Sending custom signature copy to Alice Vance (alice.vance@corp.com)..." },
      { progress: 66, step: "Sending custom signature copy to Bob Vance (bob.vance@corp.com)..." },
      { progress: 90, step: "Sending custom signature copy to Charles Vance (charles.vance@ezsignnow.com)..." },
      { progress: 100, step: "Bulk Dispatch complete! Updating pipeline..." }
    ];

    let currentStep = 0;
    const runStep = () => {
      if (currentStep < intervals.length) {
        const item = intervals[currentStep];
        setTimeout(() => {
          setBulkProgress(item.progress);
          setBulkSendStep(item.step);
          currentStep++;
          runStep();
        }, 800);
      } else {
        // Complete the process
        setTimeout(async () => {
          try {
            // Bulk insert pending entries into Supabase so they actually display in the dashboard!
            const { error } = await supabase
              .from("documents")
              .insert([
                { owner_id: user.id, title: `${bulkTitle} - Alice Vance`, file_name: `${bulkTitle.replace(/\s+/g, "_")}.pdf`, status: "pending", file_size: 104230 },
                { owner_id: user.id, title: `${bulkTitle} - Bob Vance`, file_name: `${bulkTitle.replace(/\s+/g, "_")}.pdf`, status: "pending", file_size: 104230 },
                { owner_id: user.id, title: `${bulkTitle} - Charles Vance`, file_name: `${bulkTitle.replace(/\s+/g, "_")}.pdf`, status: "pending", file_size: 104230 },
              ]);

            if (error) throw error;

            toast({
              title: "🌟 Bulk Send Successful!",
              description: `Successfully dispatched signature copies to 3 recipients.`,
            });
            setIsBulkSending(false);
            navigate("/dashboard?tab=documents");
          } catch (err: any) {
            toast({
              title: "Database Sync Error",
              description: err.message,
              variant: "destructive"
            });
            setIsBulkSending(false);
          }
        }, 600);
      }
    };

    runStep();
  };

  // SVGs for Cloud Providers
  const GoogleDriveIcon = () => (
    <svg viewBox="0 0 87.3 78" className="h-7 w-7 shrink-0">
      <path d="M58.3 70.8L29.1 20.3 14.6 45.5l29.1 50.5c3.2-5.4 14.6-25.2 14.6-25.2z" fill="#00832d" />
      <path d="M58.3 70.8L87.3 20.3H29.1l-14.5 25.2h58.2c-4.4 7.5-14.5 25.3-14.5 25.3z" fill="#0066da" />
      <path d="M29.1 20.3L0 70.8h58.3l14.5-25.3H14.6c4.5-7.7 14.5-25.2 14.5-25.2z" fill="#ffba00" />
    </svg>
  );

  const OneDriveIcon = () => (
    <svg viewBox="0 0 256 256" className="h-7 w-7 shrink-0">
      <path fill="#0364B8" d="M192.5 98.7c-2.3-37.4-33-66.9-70.5-66.9-24.1 0-45.5 12-58.2 30.5-1.5-.1-3-.2-4.5-.2-23.7 0-43.2 18-45.6 41C5.1 106.6 0 115.3 0 125c0 24.3 19.7 44 44 44h168c24.3 0 44-19.7 44-44 0-14.2-6.7-26.8-17.1-34.9-1.9-2.2-4.1-4.2-6.4-6.4z"/>
    </svg>
  );

  const DropboxIcon = () => (
    <svg viewBox="0 0 256 256" className="h-7 w-7 shrink-0">
      <path fill="#0061FE" d="M128 171.1L30.6 112 128 52.9 225.4 112 128 171.1zM30.6 112L128 171.1 30.6 230.2 0 186.6 30.6 112zm194.8 0l-97.4 59.1 97.4 59.1 30.6-43.6-30.6-74.6zM128 52.9l-97.4-59.1L0 37.4 97.4 96.5 128 52.9zm0 0l97.4-59.1L256 37.4l-97.4 59.1-30.6-43.6z"/>
    </svg>
  );

  const BoxIcon = () => (
    <svg viewBox="0 0 256 256" className="h-7 w-7 shrink-0">
      <path fill="#0061D5" d="M165.7 131.5c15.6-1.5 25.1-12.7 25.1-27.4 0-18.7-13.6-30.2-34.8-30.2H103v108.6h55c23.6 0 38.6-11.9 38.6-31 0-13.7-8.1-25.1-22.9-28.5L185 163h-25.6l-10-31.5h-10zm-42.9-42h11c11.1 0 16.5 5 16.5 14.8 0 9.7-5.4 14.6-16.5 14.6h-11v-29.4zm0 43.8h13.2c12.2 0 18.2 5.5 18.2 16.2 0 10.7-6 16.2-18.2 16.2h-13.2V133.3z"/>
    </svg>
  );

  return (
    <div className="w-full max-w-[850px] mx-auto font-sans bg-transparent py-4 relative">
      
      {/* Simulation Overlay for Bulk Sending */}
      {isBulkSending && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-200">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-[#258ffb] stroke-[2.5]" />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-slate-700 select-none">
              {bulkProgress}%
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-extrabold text-slate-800">Processing Bulk Send Dispatch</h3>
            <p className="text-xs font-bold text-slate-400 max-w-[400px] leading-relaxed">
              {bulkSendStep}
            </p>
          </div>

          {/* Simple progress track */}
          <div className="w-full max-w-[320px] h-[6px] bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#258ffb] rounded-full transition-all duration-300"
              style={{ width: `${bulkProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-8 border-b border-border/80 mb-8 pl-1 select-none">
        <button 
          onClick={() => setActiveTab("upload")}
          className={`pb-4 text-sm font-semibold transition-all ${
            activeTab === "upload" 
              ? "text-[#258ffb] border-b-2 border-[#258ffb]" 
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Upload File
        </button>
        <button 
          onClick={() => setActiveTab("bulk")}
          className={`pb-4 text-sm font-semibold transition-all ${
            activeTab === "bulk" 
              ? "text-[#258ffb] border-b-2 border-[#258ffb]" 
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Bulk Send
        </button>
      </div>

      {/* Tab Conditional Rendering */}
      {activeTab === "upload" ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
            {/* Left Column: File Uploader */}
            <div className="flex-1 space-y-3">
              <h3 className="text-sm font-bold text-slate-800">File Uploader</h3>
              
              <div
                className={`relative flex flex-col items-center justify-center rounded-sm border-[1.5px] border-dashed p-8 text-center transition-all min-h-[200px] ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-slate-300 hover:border-slate-400 bg-slate-50/30"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="flex flex-col items-center justify-center gap-3 w-full animate-in zoom-in-95 duration-200">
                    <FileText className="h-10 w-10 text-[#258ffb]" />
                    <div className="text-center w-full truncate px-4">
                      <p className="font-semibold text-slate-800 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="mt-2 h-8 text-xs text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/30 rounded-full px-4"
                    >
                      <X className="mr-1.5 h-3 w-3" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-[13px] font-bold text-slate-700 mb-4">
                      Drop files here
                    </p>
                    <p className="text-[11px] text-slate-400 mb-4">
                      Or
                    </p>
                    <Button 
                      variant="outline" 
                      className="rounded-full h-9 px-8 border-[#258ffb]/30 text-[#258ffb] hover:bg-[#258ffb]/5 hover:text-[#258ffb] transition-all font-semibold text-[13px]"
                      onClick={() => document.getElementById("file-upload")?.click()}
                      disabled={uploading}
                    >
                      Upload File
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Cloud Import */}
            <div className="flex-1 space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Import files from:</h3>
              
              <div className="grid grid-cols-2 gap-3 min-h-[200px]">
                <button 
                  onClick={() => simulateCloudImport("Google Drive")}
                  disabled={uploading}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-4 hover:border-[#258ffb]/40 hover:shadow-sm transition-all"
                >
                  <GoogleDriveIcon />
                  <span className="text-[13px] font-semibold text-slate-600">Google Drive</span>
                </button>

                <button 
                  onClick={() => simulateCloudImport("OneDrive")}
                  disabled={uploading}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-4 hover:border-[#258ffb]/40 hover:shadow-sm transition-all"
                >
                  <OneDriveIcon />
                  <span className="text-[13px] font-semibold text-slate-600">One Drive</span>
                </button>

                <button 
                  onClick={() => simulateCloudImport("Dropbox")}
                  disabled={uploading}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-4 hover:border-[#258ffb]/40 hover:shadow-sm transition-all"
                >
                  <DropboxIcon />
                  <span className="text-[13px] font-semibold text-slate-600">Dropbox</span>
                </button>

                <button 
                  onClick={() => simulateCloudImport("Box")}
                  disabled={uploading}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-4 hover:border-[#258ffb]/40 hover:shadow-sm transition-all"
                >
                  <BoxIcon />
                  <span className="text-[13px] font-semibold text-slate-600">Box</span>
                </button>
              </div>
            </div>
          </div>

          {/* Template Chooser & Submit */}
          <div className="mt-8 space-y-6 max-w-[400px] border-t border-slate-50 pt-6">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Choose Template</h3>
              <div className="relative">
                <select 
                  className="w-full appearance-none rounded border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-400 outline-none focus:border-[#258ffb]/50 cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>Choose a Template</option>
                  <option value="nda">Non-Disclosure Agreement (NDA)</option>
                  <option value="contract">Independent Contractor Agreement</option>
                  <option value="w9">W-9 Form</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`h-[42px] px-6 rounded-[24px] font-bold text-[13px] transition-all w-auto min-w-[160px] ${
                !file 
                  ? "bg-[#91a0b3] text-white hover:bg-[#91a0b3] opacity-100 cursor-not-allowed shadow-none" 
                  : "bg-[#258ffb] hover:bg-[#1a7ae0] text-white shadow-md shadow-[#258ffb]/20"
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing...
                </>
              ) : (
                "Prepare Document"
              )}
            </Button>
          </div>
        </div>
      ) : (
        /* Bulk Send Content View fully matching Signaturely */
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Main Title Banner */}
          <div className="border-b border-slate-50 pb-4">
            <h2 className="text-base font-extrabold text-slate-800">Get Your Template Signed by Many</h2>
          </div>

          {/* Section 1: Choose Template */}
          <div className="space-y-2.5 max-w-[500px]">
            <label className="text-[13px] font-bold text-slate-700">Choose the template you would like to sign.</label>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5 leading-normal">Template must have only one signer with preparer.</p>
            <div className="relative mt-2">
              <select 
                value={selectedTemplate} 
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full appearance-none rounded border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-600 outline-none focus:border-[#258ffb]/50 cursor-pointer"
              >
                <option value="" disabled>Choose a Template</option>
                <option value="nda">Non-Disclosure Agreement (NDA)</option>
                <option value="contract">Independent Contractor Agreement</option>
                <option value="w9">W-9 Form</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Separator line */}
          <div className="border-b border-slate-100" />

          {/* Section 2: Upload CSV Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-800">Upload CSV</h3>
                <p className="text-[11px] font-medium text-slate-400 leading-normal">Send a signature request to a group of people all at once. Just upload a CSV file with names and email addresses.</p>
              </div>
              <button 
                onClick={handleAutofillCsv}
                className="text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Sparkles className="h-3 w-3" />
                Autofill CSV Contacts
              </button>
            </div>

            {/* CSV Drag Zone */}
            <div
              className={`relative flex flex-col items-center justify-center rounded-lg border-[1.5px] border-dashed p-7 text-center transition-all ${
                csvDragActive
                  ? "border-primary bg-primary/5"
                  : "border-slate-300 hover:border-slate-400 bg-slate-50/20"
              }`}
              onDragEnter={handleCsvDrag}
              onDragLeave={handleCsvDrag}
              onDragOver={handleCsvDrag}
              onDrop={handleCsvDrop}
            >
              {csvFile ? (
                <div className="flex flex-col items-center justify-center gap-2.5 w-full animate-in zoom-in-95 duration-200">
                  <FileSpreadsheet className="h-9 w-9 text-emerald-500" />
                  <div className="text-center w-full px-4 space-y-1">
                    <p className="text-xs font-bold text-slate-800 truncate">{csvFile.name}</p>
                    <p className="text-[10px] font-semibold text-slate-400">
                      {csvRecipients.length} recipients parsed
                    </p>
                  </div>
                  
                  {/* parsed recipients sub-table */}
                  <div className="w-full max-w-[360px] bg-slate-50 border border-slate-100 rounded p-2 text-left mt-1 max-h-[100px] overflow-y-auto">
                    {csvRecipients.map((r, idx) => (
                      <div key={r.email} className="flex justify-between items-center text-[10px] py-1 border-b border-slate-100 last:border-0 font-semibold text-slate-500">
                        <span className="truncate">{idx + 1}. {r.name}</span>
                        <span className="text-slate-400 italic text-[9px] truncate">{r.email}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCsvFile(null);
                      setCsvRecipients([]);
                    }}
                    className="mt-2.5 h-8 text-[11px] text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/30 rounded-full px-4"
                  >
                    <X className="mr-1.5 h-3 w-3" />
                    Clear List
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-[12px] font-bold text-slate-700 mb-3.5">
                    Drop CSV here
                  </p>
                  <p className="text-[10px] text-slate-400 mb-3.5">
                    Or
                  </p>
                  <Button 
                    variant="outline" 
                    className="rounded-full h-8 px-6 border-[#258ffb]/30 text-[#258ffb] hover:bg-[#258ffb]/5 hover:text-[#258ffb] transition-all font-bold text-xs"
                    onClick={() => document.getElementById("csv-upload")?.click()}
                  >
                    Upload CSV
                  </Button>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleCsvChange}
                  />
                </>
              )}
            </div>
          </div>

          {/* Section 3: Document Title */}
          <div className="space-y-1.5 max-w-[500px]">
            <label className="text-[12px] font-bold text-slate-700">Document Title</label>
            <input 
              type="text" 
              value={bulkTitle} 
              onChange={(e) => setBulkTitle(e.target.value)} 
              placeholder="NDA Agreement for Signing" 
              className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded focus:border-[#258ffb]/50 focus:outline-none"
              required
            />
          </div>

          {/* Section 4: Message for Signers */}
          <div className="space-y-1.5 max-w-[500px]">
            <label className="text-[12px] font-bold text-slate-700">Message for Signers (Optional)</label>
            <textarea 
              value={bulkMessage} 
              onChange={(e) => setBulkMessage(e.target.value)} 
              placeholder="Add an optional message for signers." 
              rows={4}
              className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded focus:border-[#258ffb]/50 focus:outline-none resize-none"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-2 border-t border-slate-50">
            <Button
              onClick={handleBulkSend}
              disabled={!selectedTemplate || !csvFile || !bulkTitle}
              className={`h-[42px] px-8 rounded-[24px] font-bold text-[13px] transition-all w-auto min-w-[180px] ${
                (!selectedTemplate || !csvFile || !bulkTitle)
                  ? "bg-[#91a0b3] text-white hover:bg-[#91a0b3] opacity-100 cursor-not-allowed shadow-none" 
                  : "bg-[#258ffb] hover:bg-[#1a7ae0] text-white shadow-md shadow-[#258ffb]/20"
              }`}
            >
              Bulk Send
            </Button>
          </div>

        </div>
      )}
      
    </div>
  );
}
