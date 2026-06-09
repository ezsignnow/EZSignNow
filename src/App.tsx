import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import NotFound from "./pages/NotFound";
import CompareSignNow from "./pages/CompareSignNow";
import Blog from "./pages/Blog";
import FormsLibrary from "./pages/FormsLibrary";
import TemplateSign from "./pages/TemplateSign";
import Security from "./pages/Security";
import Support from "./pages/Support";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/try-for-free" element={<TryForFree />} />
            <Route path="/try-trial" element={<TryTrial />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/document/:id/prepare" element={<PrepareDocument />} />
            <Route path="/document/:id/view" element={<ViewDocument />} />
            <Route path="/template/new" element={<TemplateBuilder />} />
            <Route path="/template/:id/edit" element={<TemplateBuilder />} />
            <Route path="/t/:id/sign" element={<TemplateSign />} />
            <Route path="/compare/signnow" element={<CompareSignNow />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/forms" element={<FormsLibrary />} />
            <Route path="/security" element={<Security />} />
            <Route path="/support" element={<Support />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
