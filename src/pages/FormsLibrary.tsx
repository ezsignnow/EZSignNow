import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { 
  FileText, 
  Search, 
  Sparkles, 
  ArrowRight, 
  Download, 
  Eye, 
  CheckCircle2, 
  Clock, 
  X,
  FileSignature,
  Scale,
  Building,
  UserCheck,
  Coins
} from "lucide-react";
import { toast } from "sonner";

interface FormTemplate {
  id: string;
  title: string;
  description: string;
  category: "legal" | "realestate" | "hr" | "tax";
  categoryLabel: string;
  downloads: string;
  popularity: string;
  fields: string[];
  docContent: string[];
}

export default function FormsLibrary() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "legal" | "realestate" | "hr" | "tax">("all");
  const [previewingForm, setPreviewingForm] = useState<FormTemplate | null>(null);

  // Vetted professional signNow-equivalent templates
  const forms: FormTemplate[] = [
    {
      id: "w-9-form",
      title: "W-9 Form (Request for Taxpayer ID & Certification)",
      description: "Standard IRS tax form used to certify a taxpayer identification number (TIN) for freelance contractors and vendors.",
      category: "tax",
      categoryLabel: "Tax & IRS Forms",
      downloads: "142K+ uses",
      popularity: "9.9/10 Rating",
      fields: ["Taxpayer Name", "Business Entity Type", "EIN or SSN", "Certification Signature", "Date"],
      docContent: [
        "FORM W-9 (Rev. October 2026)",
        "Department of the Treasury - Internal Revenue Service",
        "Request for Taxpayer Identification Number and Certification",
        "----------------------------------------------------------------",
        "1. Name (as shown on your income tax return): [                     ]",
        "2. Business name/disregarded entity name, if different: [           ]",
        "3. Federal tax classification: [ ] Individual/Sole Proprietor  [ ] LLC",
        "4. Exemptions (codes if any): [     ]",
        "5. Address (number, street, and apt. or suite no.): [               ]",
        "6. City, state, and ZIP code: [                                     ]",
        "----------------------------------------------------------------",
        "Part I: Taxpayer Identification Number (TIN)",
        "Enter your TIN in the appropriate box. For individuals, this is your social security number (SSN). For other entities, it is your employer identification number (EIN).",
        "Social Security Number: [ *** - ** - **** ]   or   EIN: [ ** - ******* ]",
        "----------------------------------------------------------------",
        "Part II: Certification",
        "Under penalties of perjury, I certify that:",
        "1. The number shown on this form is my correct taxpayer identification number.",
        "2. I am not subject to backup withholding because: (a) I am exempt...",
        "3. I am a U.S. citizen or other U.S. person.",
        "SIGN HERE: [ SIGNATURE REQUIRED ]                      Date: [ DATE ]"
      ]
    },
    {
      id: "mutual-nda",
      title: "Mutual Non-Disclosure Agreement (NDA)",
      description: "Legally binding mutual confidentiality contract for two organizations sharing proprietary business data, trade secrets, or code.",
      category: "legal",
      categoryLabel: "Legal & Corporate",
      downloads: "98K+ uses",
      popularity: "4.8/5 (340 reviews)",
      fields: ["Company A Representative", "Company B Representative", "Effective Date", "Exclusion Scope", "Signatures"],
      docContent: [
        "MUTUAL NON-DISCLOSURE AGREEMENT",
        "This Confidentiality Agreement is entered into on [ EFFECTIVE DATE ] by and between:",
        "Party A: [ COMPANY A REPRESENTATIVE ] and",
        "Party B: [ COMPANY B REPRESENTATIVE ], hereinafter collectively referred to as the 'Parties'.",
        "----------------------------------------------------------------",
        "1. Definition of Confidential Information.",
        "For purposes of this Agreement, 'Confidential Information' shall include all information or material that has or could have commercial value or other utility in the business in which Disclosing Party is engaged.",
        "2. Exclusions from Confidentiality.",
        "Receiving Party's obligations under this Agreement do not extend to information that is: (a) publicly known, (b) discovered or created by the Receiving Party...",
        "3. Term of Agreement.",
        "The non-disclosure provisions of this Agreement shall survive the termination of this Agreement for a period of five (5) years.",
        "----------------------------------------------------------------",
        "IN WITNESS WHEREOF, the parties have executed this Mutual NDA.",
        "Party A Representative: [ SIGNATURE A ]                 Date: [ DATE A ]",
        "Party B Representative: [ SIGNATURE B ]                 Date: [ DATE B ]"
      ]
    },
    {
      id: "residential-lease",
      title: "Residential Lease Agreement",
      description: "Standard real estate rental lease contract establishing tenancy conditions, monthly rental payments, and security deposits.",
      category: "realestate",
      categoryLabel: "Real Estate & Rental",
      downloads: "115K+ uses",
      popularity: "9.8/10 Score",
      fields: ["Landlord Name", "Tenant Name", "Property Address", "Monthly Rent Amount", "Lease Term", "Signatures"],
      docContent: [
        "RESIDENTIAL LEASE AGREEMENT",
        "This Lease Agreement is made on [ LEASE DATE ] by and between:",
        "Landlord: [ LANDLORD NAME ] and",
        "Tenant: [ TENANT NAME ].",
        "----------------------------------------------------------------",
        "1. Description of Premises.",
        "Landlord hereby leases to Tenant the residential property located at:",
        "Street Address: [ PROPERTY ADDRESS ]",
        "2. Lease Term.",
        "The term of this lease shall begin on [ START DATE ] and terminate on [ END DATE ].",
        "3. Rental Payments.",
        "Tenant agrees to pay Landlord monthly rent in the amount of: $[ RENT AMOUNT ] on the first day of each calendar month.",
        "4. Security Deposit.",
        "Tenant shall deposit $[ DEPOSIT AMOUNT ] as security for any damage caused to the Premises.",
        "----------------------------------------------------------------",
        "IN WITNESS WHEREOF, Landlord and Tenant have signed this Residential Lease.",
        "Landlord Signature: [ SIGN LANDLORD ]                  Date: [ DATE ]",
        "Tenant Signature: [ SIGN TENANT ]                      Date: [ DATE ]"
      ]
    },
    {
      id: "independent-contractor-agreement",
      title: "Independent Contractor Agreement",
      description: "B2B service agreement establishing freelance/consulting terms, scopes of work, ownership of IP assets, and payment triggers.",
      category: "hr",
      categoryLabel: "HR & Employment",
      downloads: "87K+ uses",
      popularity: "4.9/5 (210 reviews)",
      fields: ["Client Name", "Contractor Name", "Scope of Work Description", "Hourly Rate / Fee", "IP Ownership Assignment", "Signatures"],
      docContent: [
        "INDEPENDENT CONTRACTOR SERVICE AGREEMENT",
        "This Services Agreement is entered into by and between:",
        "Client: [ CLIENT NAME ] and",
        "Contractor: [ CONTRACTOR NAME ] on this [ CONTRACT DATE ].",
        "----------------------------------------------------------------",
        "1. Services Rendered.",
        "Contractor agrees to perform the following development, design, or consulting services:",
        "Scope description: [ SCOPE OF WORK DESCRIPTION ]",
        "2. Payment Terms.",
        "Client shall compensate Contractor at the rate of $[ HOURLY RATE ] per hour, payable bi-weekly upon receipt of timesheets.",
        "3. Independent Contractor Status.",
        "Contractor is an independent contractor, not an employee. Contractor is responsible for all corporate taxes, health benefits, and operational expenses.",
        "4. Intellectual Property.",
        "All work product generated by Contractor under this agreement belongs exclusively to the Client.",
        "----------------------------------------------------------------",
        "Client Representative: [ SIGN CLIENT ]                 Date: [ DATE ]",
        "Contractor Signature: [ SIGN CONTRACTOR ]             Date: [ DATE ]"
      ]
    },
    {
      id: "standard-invoice",
      title: "Signable Commercial Invoice",
      description: "Professional billing template with signature sign-off fields for secure vendor approvals, payment confirmations, and auditing records.",
      category: "tax",
      categoryLabel: "Tax & IRS Forms",
      downloads: "56K+ uses",
      popularity: "Top Choice",
      fields: ["Seller Company", "Buyer Company", "Line Items & Total", "Due Date", "Approving Signature"],
      docContent: [
        "COMMERCIAL INVOICE & ORDER APPROVAL",
        "Invoice Number: INV-2026-0899                         Date: [ DATE ]",
        "----------------------------------------------------------------",
        "Seller Name: [ SELLER COMPANY ]",
        "Buyer Name: [ BUYER COMPANY ]",
        "----------------------------------------------------------------",
        "Item description                          Qty     Price     Total",
        "1. SaaS Custom Deployment Integration     1       $4,500    $4,500",
        "2. Enterprise Legal Consulting Seats       10      $50       $500",
        "----------------------------------------------------------------",
        "Subtotal:                                                   $5,000",
        "Taxes (0% exempt):                                          $0",
        "TOTAL DUE:                                                  $5,000",
        "Due Date: [ DUE DATE ]",
        "----------------------------------------------------------------",
        "By signing below, the Buyer approves this invoice for immediate payment dispatch.",
        "Buyer Approving Authority: [ SIGN BUYER ]             Date: [ DATE ]"
      ]
    },
    {
      id: "general-power-of-attorney",
      title: "General Power of Attorney (PoA)",
      description: "Legal template delegating authority to a designated agent to manage financial affairs, real estate, and corporate signings.",
      category: "legal",
      categoryLabel: "Legal & Corporate",
      downloads: "64K+ uses",
      popularity: "9.7/10 Rating",
      fields: ["Principal Name", "Attorney-in-Fact Name", "Granted Powers Scope", "Witness Signatures", "Notary Seal"],
      docContent: [
        "GENERAL POWER OF ATTORNEY",
        "I, [ PRINCIPAL NAME ], residing at [ Address ], hereby appoint:",
        "Attorney-in-Fact: [ ATTORNEY-IN-FACT NAME ], residing at [ Address ],",
        "to act in my name, place, and stead in any way which I myself could do.",
        "----------------------------------------------------------------",
        "1. Granted Powers.",
        "My Attorney-in-Fact shall have full authority to handle: (a) Real estate transactions, (b) Banking & finance, (c) Tax filings, (d) Business operations.",
        "2. Revocation & Term.",
        "This Power of Attorney is durable and shall not be affected by my subsequent disability or incapacity, unless revoked by me in writing.",
        "----------------------------------------------------------------",
        "Principal Signature: [ SIGN PRINCIPAL ]                 Date: [ DATE ]",
        "Witness 1: [ SIGN WITNESS 1 ]                          Date: [ DATE ]",
        "Witness 2: [ SIGN WITNESS 2 ]                          Date: [ DATE ]"
      ]
    }
  ];

  const handleUseTemplate = (form: FormTemplate) => {
    toast.success(`Importing "${form.title}" layout into active Template Builder...`);
    setPreviewingForm(null);
    // Simulate loading the form into the document builder / trial flow
    setTimeout(() => {
      navigate(`/try-for-free?template=${form.id}`);
    }, 800);
  };

  const filteredForms = forms.filter(form => {
    const matchesSearch = form.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          form.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          form.fields.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategory === "all" || form.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "legal": return <Scale className="h-4 w-4" />;
      case "realestate": return <Building className="h-4 w-4" />;
      case "hr": return <UserCheck className="h-4 w-4" />;
      case "tax": return <Coins className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-background">
      <SEO 
        title="Free Signable PDF Forms Library & Templates | EZSignNow"
        description="Search, preview, and sign dozens of standard IRS, legal, real estate, and HR templates online. Switch from signNow and sign contracts instantly."
        keywords="free signable forms, IRS W-9 online, signable NDA template, lease contract electronic signature, free PDF templates, e-sign W-9 form"
        faqs={[
          {
            question: "Are forms in the EZSignNow Forms Library free to use?",
            answer: "Yes! All templates in our Forms Library (including IRS W-9s, NDAs, and Lease Agreements) can be previewed, edited, and sent for electronic signature completely free."
          },
          {
            question: "Are these electronic signature forms court-admissible?",
            answer: "Absolutely. EZSignNow compiles fully with the US ESIGN Act, UETA, and European Union eIDAS standards, generating a legally binding audit trail with IP address and geolocation stamping."
          }
        ]}
      />
      <Navbar />

      {/* Hero Banner */}
      <section className="relative overflow-hidden pt-32 pb-16 bg-gradient-to-br from-slate-900 via-secondary to-slate-950 text-white border-b border-border/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="container mx-auto px-4 max-w-6xl relative z-10 text-left">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span>Compliant & Ready-To-Sign Templates</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.1]">
              Free E-Signable <span className="text-primary bg-clip-text bg-gradient-to-r from-primary to-cyan-400">Forms Library</span>
            </h1>
            
            <p className="text-slate-300 text-sm sm:text-md max-w-3xl leading-relaxed">
              Why rebuild basic templates? Search through our directory of standard IRS tax documents, NDAs, rental leases, and HR consulting agreements. Preview them instantly and send them to clients with secure geolocation auditing.
            </p>
          </div>
        </div>
      </section>

      {/* Main Directory Area */}
      <section className="py-16 flex-grow">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* Left sidebar filters */}
            <div className="w-full md:w-64 bg-white dark:bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6 shrink-0 text-left">
              <div>
                <h3 className="font-extrabold text-sm text-foreground uppercase tracking-wider mb-3">Browse Categories</h3>
                <div className="flex flex-col gap-1.5">
                  {[
                    { id: "all", label: "All Templates", icon: <FileText className="h-4 w-4" /> },
                    { id: "legal", label: "Legal & Corporate", icon: <Scale className="h-4 w-4" /> },
                    { id: "realestate", label: "Real Estate", icon: <Building className="h-4 w-4" /> },
                    { id: "hr", label: "HR & Hiring", icon: <UserCheck className="h-4 w-4" /> },
                    { id: "tax", label: "Tax & IRS", icon: <Coins className="h-4 w-4" /> }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id as any)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        activeCategory === cat.id 
                          ? "bg-primary text-white shadow-md shadow-primary/10" 
                          : "text-muted-foreground hover:bg-slate-50 dark:hover:bg-accent/10 hover:text-foreground"
                      }`}
                    >
                      {cat.icon}
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-border/60">
                <div className="bg-slate-50 dark:bg-accent/15 rounded-2xl p-4 border border-border/50 text-xs">
                  <p className="font-extrabold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ESIGN & UETA Vetted
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                    All document fields dynamically align to legally binding, court-admissible standards natively.
                  </p>
                </div>
              </div>
            </div>

            {/* Right templates grid */}
            <div className="flex-grow w-full space-y-8">
              {/* Search Bar */}
              <div className="relative bg-white dark:bg-card border border-border/80 rounded-full shadow-sm">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search templates (e.g. W-9, NDA, lease, contract fields)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent pl-12 pr-4 py-4 text-sm text-foreground outline-none rounded-full"
                />
              </div>

              {/* Template Cards Grid */}
              <div className="grid gap-6 sm:grid-cols-2">
                {filteredForms.map((form) => (
                  <div
                    key={form.id}
                    className="group bg-white dark:bg-card border border-border/80 rounded-3xl p-6 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300 text-left relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity" />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-primary bg-primary/5 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {getCategoryIcon(form.category)}
                          {form.categoryLabel}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{form.downloads}</span>
                      </div>

                      <h3 className="text-md font-extrabold text-foreground leading-snug group-hover:text-primary transition-colors">
                        {form.title}
                      </h3>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {form.description}
                      </p>

                      {/* Display field tags */}
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Interactive Fields</p>
                        <div className="flex flex-wrap gap-1">
                          {form.fields.slice(0, 3).map((field, idx) => (
                            <span key={idx} className="bg-slate-100 dark:bg-accent/15 px-2 py-0.5 rounded text-[9px] text-muted-foreground font-semibold">
                              {field}
                            </span>
                          ))}
                          {form.fields.length > 3 && (
                            <span className="bg-slate-100 dark:bg-accent/15 px-2 py-0.5 rounded text-[9px] text-muted-foreground font-semibold">
                              +{form.fields.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-border/50 grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => setPreviewingForm(form)}
                        variant="outline"
                        size="sm"
                        className="text-xs font-bold h-9 border-border hover:bg-slate-50 dark:hover:bg-accent/10"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Preview
                      </Button>
                      <Button
                        onClick={() => handleUseTemplate(form)}
                        size="sm"
                        className="text-xs font-bold h-9 bg-primary hover:bg-primary/95 text-white"
                      >
                        <FileSignature className="h-3.5 w-3.5 mr-1" />
                        Use Form
                      </Button>
                    </div>
                  </div>
                ))}

                {filteredForms.length === 0 && (
                  <div className="col-span-2 text-center py-16 bg-white dark:bg-card border border-dashed border-border rounded-3xl">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-bold text-foreground">No template forms found</p>
                    <p className="text-xs text-muted-foreground mt-1">Try expanding your filters or search keywords.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Simulated High-Fidelity PDF Preview Modal */}
      {previewingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-card rounded-3xl border border-border w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-[scaleIn_0.2s_ease-out]">
            {/* Modal Header */}
            <div className="p-6 border-b border-border/60 flex items-center justify-between bg-slate-900 text-white">
              <div className="space-y-1 text-left">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 border border-primary/20 text-[9px] font-black rounded-full text-primary-foreground uppercase tracking-widest">
                  Secure Live Preview
                </span>
                <h3 className="font-extrabold text-md md:text-lg">{previewingForm.title}</h3>
              </div>
              <button 
                onClick={() => setPreviewingForm(null)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Scrollable simulated document canvas */}
            <div className="p-6 overflow-y-auto bg-slate-100 flex-grow max-h-[55vh] flex justify-center">
              <div className="bg-white text-slate-800 border border-slate-300 w-full max-w-2xl min-h-[700px] p-8 md:p-10 shadow-lg rounded-sm font-mono text-[10px] leading-relaxed text-left flex flex-col justify-between">
                <div>
                  {previewingForm.docContent.map((line, idx) => {
                    const isSign = line.includes("SIGN") || line.includes("REQUIRED");
                    return (
                      <p 
                        key={idx} 
                        className={`mb-2.5 pb-0.5 whitespace-pre-wrap ${
                          isSign 
                            ? "bg-yellow-100 dark:bg-yellow-950/20 border border-dashed border-yellow-400 p-2.5 text-yellow-800 rounded font-bold" 
                            : ""
                        }`}
                      >
                        {line}
                      </p>
                    );
                  })}
                </div>

                <div className="pt-8 border-t border-slate-200 text-center text-[9px] text-slate-400">
                  Document generated via EZSignNow Cryptographic Seal Engine. Court-Admissible.
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-6 border-t border-border/60 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-accent/5">
              <div className="text-left">
                <p className="text-xs font-bold text-foreground">Ready to sign or distribute?</p>
                <p className="text-[10px] text-muted-foreground">Sets up signature overlays dynamically on import.</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  onClick={() => setPreviewingForm(null)}
                  variant="outline"
                  className="w-full sm:w-auto h-10 px-5 text-xs font-bold border-border"
                >
                  Close Preview
                </Button>
                <Button
                  onClick={() => handleUseTemplate(previewingForm)}
                  className="w-full sm:w-auto h-10 px-6 text-xs font-bold bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-1.5 shadow-md shadow-primary/10"
                >
                  <FileSignature className="h-4 w-4" />
                  Use Form Template
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
