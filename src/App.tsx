import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/i18n";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import TryForFree from "./pages/TryForFree";
import TryTrial from "./pages/TryTrial";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import PrepareDocument from "./pages/PrepareDocument";
import ViewDocument from "./pages/ViewDocument";
import TemplateBuilder from "./pages/TemplateBuilder";
import PdfEditor from "./pages/PdfEditor";
import PdfTools from "./pages/PdfTools";
import PdfToolRunner from "./pages/PdfToolRunner";
import PdfWorkflows from "./pages/PdfWorkflows";
import NotFound from "./pages/NotFound";
import CompareSignNow from "./pages/CompareSignNow";
import Blog from "./pages/Blog";
import FormsLibrary from "./pages/FormsLibrary";
import TemplateSign from "./pages/TemplateSign";
import Security from "./pages/Security";
import Support from "./pages/Support";
import Company from "./pages/Company";
import Team from "./pages/Team";
import { AppLayout } from "./components/layout/AppLayout";
import { VisitorCounter } from "./components/VisitorCounter";
import { PageViewTracker } from "./components/analytics/PageViewTracker";
import AdminAnalytics from "./pages/AdminAnalytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <VisitorCounter />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <PageViewTracker />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/try-for-free" element={<TryForFree />} />
            <Route path="/try-trial" element={<TryTrial />} />
            
            <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/upload" element={<AppLayout><Upload /></AppLayout>} />
            <Route path="/document/:id/prepare" element={<AppLayout><PrepareDocument /></AppLayout>} />
            {/* Signing links in emails open this page, and signers often have no account. */}
            <Route path="/document/:id/view" element={<AppLayout requireAuth={false}><ViewDocument /></AppLayout>} />
            <Route path="/document/:id/edit" element={<AppLayout><PdfEditor /></AppLayout>} />
            <Route path="/edit" element={<AppLayout><PdfEditor /></AppLayout>} />
            <Route path="/tools" element={<AppLayout><PdfTools /></AppLayout>} />
            <Route path="/tools/workflows" element={<AppLayout><PdfWorkflows /></AppLayout>} />
            <Route path="/tools/:toolId" element={<AppLayout><PdfToolRunner /></AppLayout>} />
            <Route path="/template/new" element={<AppLayout><TemplateBuilder /></AppLayout>} />
            <Route path="/template/:id/edit" element={<AppLayout><TemplateBuilder /></AppLayout>} />
            <Route path="/t/:id/sign" element={<TemplateSign />} />
            <Route path="/compare/signnow" element={<CompareSignNow />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/forms" element={<FormsLibrary />} />
            <Route path="/security" element={<Security />} />
            <Route path="/support" element={<Support />} />
            <Route path="/company" element={<Company />} />
            <Route path="/team" element={<Team />} />
            {/* Admin-only, not linked anywhere. Access is checked by get_admin_analytics() in Supabase. */}
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/analytics/:accessKey" element={<AdminAnalytics />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;



