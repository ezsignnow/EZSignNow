import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getAbsoluteUrl } from "@/utils/url";
import { 
  FileSignature, 
  Loader2, 
  CheckCircle2, 
  Sparkles, 
  ArrowLeft 
} from "lucide-react";

import { BrandLogo } from "@/components/layout/BrandLogo";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  
  // reCAPTCHA States
  const [captchaChecked, setCaptchaChecked] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleCaptchaClick = () => {
    if (captchaChecked) {
      setCaptchaChecked(false);
      return;
    }
    setCaptchaLoading(true);
    setTimeout(() => {
      setCaptchaLoading(false);
      setCaptchaChecked(true);
    }, 1200);
  };

  const triggerGoogleRedirect = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAbsoluteUrl("/dashboard")
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast({
        title: "Google Auth Error",
        description: err.message || "Failed to initialize Google login",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "signup" && !captchaChecked) {
      toast({
        title: "Verification required",
        description: "Please check the reCAPTCHA box to confirm you are not a robot.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        
        toast({
          title: "Account created!",
          description: "Welcome to EZSignNow.",
        });
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  // Onboarding Stepper Header
  const stepperHeader = (
    <div className="flex items-center justify-center gap-2 mb-6 text-xs font-semibold select-none">
      <div className="flex items-center gap-1">
        <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
          !emailSent ? "bg-blue-600 text-white shadow shadow-blue-600/20" : "bg-blue-100 text-blue-800"
        }`}>
          {emailSent ? <Check className="h-3 w-3" /> : "1"}
        </span>
        <span className={!emailSent ? "text-slate-900 font-bold" : "text-slate-500"}>Create an account</span>
      </div>
      <div className="h-[1px] w-8 bg-slate-200"></div>
      <div className="flex items-center gap-1">
        <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
          emailSent ? "bg-blue-600 text-white shadow shadow-blue-600/20" : "bg-slate-200 text-slate-500"
        }`}>
          2
        </span>
        <span className={emailSent ? "text-slate-900 font-bold" : "text-slate-500"}>Activate your trial</span>
      </div>
    </div>
  );



  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <Link to="/">
            <BrandLogo />
          </Link>
        </div>

        {/* Stepper (Only on Signup flow) */}
        {mode === "signup" && stepperHeader}

        {/* Regular Form */}
        <div className="bg-white border border-slate-200 shadow-md rounded-md overflow-hidden">
          <div className="p-6 text-center border-b border-slate-100">
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === "login" ? "Sign in to account" : "Create free account"}
            </h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-xs font-semibold text-slate-700">Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="h-10 border-slate-300 focus-visible:ring-blue-500"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-10 border-slate-300 focus-visible:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold text-slate-700">Password</Label>
                    {mode === "login" && (
                      <a href="#" className="text-xs text-blue-600 hover:underline">Forgot password?</a>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-10 border-slate-300 focus-visible:ring-blue-500"
                  />
                </div>

                {/* Mock reCAPTCHA checkbox */}
                {mode === "signup" && (
                  <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-3 select-none mt-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleCaptchaClick}
                        disabled={captchaLoading}
                        className={`h-6 w-6 rounded border bg-white flex items-center justify-center transition-all ${
                          captchaChecked ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400"
                        }`}
                      >
                        {captchaLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                        ) : captchaChecked ? (
                          <Check className="h-4 w-4 text-blue-600 font-bold" />
                        ) : null}
                      </button>
                      <span className="text-xs font-medium text-slate-700">I'm not a robot</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 opacity-60">
                      <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA" className="h-5 w-5 object-contain" />
                      <span className="text-[7px] text-slate-500 font-semibold">reCAPTCHA</span>
                    </div>
                  </div>
                )}
                
                <div className="pt-2">
                  <Button type="submit" className="w-full h-11 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {mode === "login" ? "Sign In" : "Create account"}
                  </Button>
                </div>

                {/* OR Google Sign Up / Sign In divider */}
                <div className="relative w-full flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-wider">OR</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* Google OAuth Login Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={triggerGoogleRedirect}
                  className="w-full h-11 border-slate-300 hover:bg-slate-50 font-medium text-xs flex gap-2 items-center justify-center text-slate-700"
                >
                  <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.33 0 3.327 2.682 1.486 6.582l3.78 3.183z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.273c0-.818-.073-1.609-.209-2.373H12v4.582h6.473a5.536 5.536 0 0 1-2.4 3.636l3.782 3.182c2.209-2.036 3.636-5.036 3.636-9.027z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.266 14.235A7.077 7.077 0 0 1 4.909 12c0-.79.136-1.555.357-2.264l-3.78-3.182A11.905 11.905 0 0 0 0 12c0 2.055.518 4.009 1.486 5.764l3.78-3.529z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.245 0 5.973-1.073 7.964-2.909l-3.782-3.182c-1.045.7-2.382 1.118-4.182 1.118-3.218 0-5.936-2.164-6.909-5.082l-3.782 3.527C3.327 21.318 7.33 24 12 24z"
                    />
                  </svg>
                  {mode === "login" ? "Sign In with Google" : "Sign Up with Google"}
                </Button>
                
                <p className="text-center text-xs text-slate-600 mt-4">
                  {mode === "login" ? (
                    <>
                      Don't have an account?{" "}
                      <Link to="/signup" className="font-semibold text-blue-600 hover:underline">
                        Sign up
                      </Link>
                    </>
                  ) : (
                    <>
                      Have an account?{" "}
                      <Link to="/login" className="font-semibold text-blue-600 hover:underline">
                        Sign In
                      </Link>
                    </>
                  )}
                </p>
              </form>
            </div>
          </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-slate-500 mt-8">
          © {new Date().getFullYear()} EZSignNow | <a href="#" className="hover:underline">Terms and Conditions</a>
        </div>
      </div>
    </div>
  );
}



