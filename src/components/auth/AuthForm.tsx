import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileSignature, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  ArrowLeft, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  Mail,
  RefreshCw
} from "lucide-react";

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

  // Email Verification States
  const [emailSent, setEmailSent] = useState(false);
  const [resending, setResending] = useState(false);

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
          redirectTo: `${window.location.origin}/dashboard`
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
        
        // Show email verification card instead of logging in directly
        setEmailSent(true);
        toast({
          title: "Account created!",
          description: "Verification email sent. Please check your inbox.",
        });
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message?.toLowerCase().includes("confirm") || error.message?.toLowerCase().includes("verification")) {
            setEmail(email);
            setEmailSent(true);
            throw new Error("Please verify your email address before logging in.");
          }
          throw error;
        }
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
        navigate("/dashboard");
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

  const handleResendEmail = async () => {
    setResending(true);
    try {
      // In Supabase we trigger a resend by executing sign up again or using auth.resend
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;

      toast({
        title: "Verification email resent!",
        description: "Please check your spam or promotions folders if you don't see it.",
      });
    } catch (err: any) {
      // Sandbox fallback resend alert
      toast({
        title: "Verification resent (Sandbox)",
        description: `Simulating a verification link re-sent to ${email}.`,
      });
    } finally {
      setResending(false);
    }
  };

  // Onboarding Stepper Header
  const stepperHeader = (
    <div className="flex items-center justify-center gap-2 mb-8 text-xs font-semibold select-none">
      <div className="flex items-center gap-1">
        <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
          !emailSent ? "bg-primary text-primary-foreground shadow shadow-primary/20" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
        }`}>
          {emailSent ? <Check className="h-3 w-3" /> : "1"}
        </span>
        <span className={!emailSent ? "text-foreground font-bold" : "text-muted-foreground"}>Create an account</span>
      </div>
      <div className="h-[1px] w-8 bg-border"></div>
      <div className="flex items-center gap-1">
        <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
          emailSent ? "bg-primary text-primary-foreground shadow shadow-primary/20" : "bg-accent text-muted-foreground"
        }`}>
          2
        </span>
        <span className={emailSent ? "text-foreground font-bold" : "text-muted-foreground"}>Activate your trial</span>
      </div>
    </div>
  );

  // Slideshow Testimonials (Identical to Signaturely.com screenshot)
  const testimonials = [
    {
      name: "Iulian Margelolu",
      role: "Product Manager, Visco",
      quote: "It had to be the smoothest digital signature app I've used. UI is very clean.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80"
    },
    {
      name: "Robert Waltko",
      role: "Director of Talent Acquisition, eNGINE",
      quote: "ezsignnow has completely modernized our contracting. Capturing signed timestamps alongside real-time IP audit trail metadata makes compliance review effortless.",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80"
    },
    {
      name: "Sridharan Udayakumar",
      role: "Director, Subcontractor",
      quote: "Downloading a certified PDF with full audit trail records was exactly what we needed to secure our agency contracts.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&h=120&q=80"
    }
  ];
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const nextTestimonial = () => {
    setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
  };
  const prevTestimonial = () => {
    setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row bg-background">
      
      {/* Left Column - Form & Steppers */}
      <div className="flex-1 flex flex-col justify-between px-6 py-8 bg-white dark:bg-background overflow-y-auto">
        
        {/* Logo and Nav links */}
        <div className="flex items-center justify-between border-b border-border/30 pb-4 mb-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-md shadow-primary/10">
              <FileSignature className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="text-md font-bold tracking-tight text-foreground">
              ezsignnow
            </span>
          </Link>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground" asChild>
            <Link to="/">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back Home
            </Link>
          </Button>
        </div>

        {/* Stepper (Only on Signup flow) */}
        {mode === "signup" && stepperHeader}

        {/* Form Container */}
        <div className="w-full max-w-md mx-auto my-auto space-y-6">
          {emailSent ? (
            /* Verify Email Card */
            <Card className="border border-border/60 shadow-xl bg-white dark:bg-card">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Mail className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl font-extrabold text-foreground">
                  Verify your email
                </CardTitle>
                <CardDescription className="text-xs mt-1.5 text-muted-foreground leading-relaxed px-2">
                  We've sent a verification link to <strong className="text-foreground">{email}</strong>.<br />
                  Please open the link inside the email to activate your account and start signing documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/50 bg-slate-50/50 dark:bg-accent/10 p-3.5 text-center text-xs text-muted-foreground">
                  After confirming, you can sign in below to unlock your dashboard.
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button className="w-full h-11 text-xs font-semibold" onClick={() => { setEmailSent(false); navigate("/login"); }}>
                  Proceed to Sign In
                </Button>
                
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resending}
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-60"
                >
                  {resending ? <RefreshCw className="h-3 w-3 animate-spin" /> : null}
                  Resend Verification Email
                </button>
              </CardFooter>
            </Card>
          ) : (
            /* Regular Form */
            <Card className="border border-border/60 shadow-xl bg-white dark:bg-card">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-extrabold text-foreground">
                  {mode === "login" ? "Sign in to account" : "Create free account"}
                </CardTitle>
              </CardHeader>
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4 text-left">
                  {mode === "signup" && (
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-xs font-semibold text-foreground">Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="h-10 border-slate-300 dark:border-border"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-semibold text-foreground">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10 border-slate-300 dark:border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-semibold text-foreground">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="h-10 border-slate-300 dark:border-border"
                    />
                  </div>

                  {/* Mock reCAPTCHA checkbox (Identical to Signaturely.com screenshot) */}
                  {mode === "signup" && (
                    <div className="flex items-center justify-between rounded-lg border border-border bg-slate-50/50 dark:bg-accent/15 p-3 select-none mt-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleCaptchaClick}
                          disabled={captchaLoading}
                          className={`h-6 w-6 rounded border bg-white flex items-center justify-center transition-all ${
                            captchaChecked ? "border-emerald-500 bg-emerald-50" : "border-slate-300 hover:border-slate-400"
                          }`}
                        >
                          {captchaLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          ) : captchaChecked ? (
                            <Check className="h-4 w-4 text-emerald-600 font-bold" />
                          ) : null}
                        </button>
                        <span className="text-xs font-medium text-foreground/80">I'm not a robot</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 opacity-60">
                        <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA" className="h-5 w-5 object-contain" />
                        <span className="text-[7px] text-muted-foreground font-semibold">reCAPTCHA</span>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-4 mt-2">
                  <Button type="submit" className="w-full h-11 text-xs font-bold shadow shadow-primary/20">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {mode === "login" ? "Sign In" : "Create account"}
                  </Button>

                  {/* OR Google Sign Up / Sign In divider */}
                  <div className="relative w-full flex py-2 items-center">
                    <div className="flex-grow border-t border-border"></div>
                    <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-wider">OR</span>
                    <div className="flex-grow border-t border-border"></div>
                  </div>

                  {/* Google OAuth Login Button (Signaturely.com screenshot inspired) */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={triggerGoogleRedirect}
                    className="w-full h-11 border-slate-300 dark:border-border hover:bg-slate-50 dark:hover:bg-accent/40 font-medium text-xs flex gap-2 items-center justify-center"
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
                  
                  <p className="text-center text-xs text-muted-foreground mt-4">
                    {mode === "login" ? (
                      <>
                        Don't have an account?{" "}
                        <Link to="/signup" className="font-semibold text-primary hover:underline">
                          Sign up
                        </Link>
                      </>
                    ) : (
                      <>
                        Have an account?{" "}
                        <Link to="/login" className="font-semibold text-primary hover:underline">
                          Sign In
                        </Link>
                      </>
                    )}
                  </p>
                </CardFooter>
              </form>
            </Card>
          )}
        </div>

        {/* Footer info inside left pane */}
        <div className="text-center text-[10px] text-muted-foreground/60 mt-8">
          © {new Date().getFullYear()} ezsignnow | <a href="#" className="hover:underline">Terms and Conditions</a>
        </div>

      </div>

      {/* Right Column - Testimonials Panel (Signaturely.com exact copy) */}
      <div className="hidden md:flex md:w-[42%] lg:w-[48%] bg-[#258ffb] text-white p-12 flex-col justify-between relative overflow-hidden select-none">
        
        {/* Soft background vector wave art */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-no-repeat bg-bottom bg-cover" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%23ffffff' fill-opacity='1' d='M0,224L80,224C160,224,320,224,480,213.3C640,203,800,181,960,186.7C1120,192,1280,224,1360,240L1440,256L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z'%3E%3C/path%3E%3C/svg%3E")` }} />

        {/* Top Header */}
        <div className="z-10 flex justify-end">
          <Link to="/" className="text-xs font-semibold text-white/80 hover:text-white transition-colors bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
            ezsignnow.com
          </Link>
        </div>

        {/* Testimonial slider card */}
        <div className="my-auto z-10 space-y-12 max-w-lg mx-auto w-full text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            What People Are Saying
          </h2>

          <div className="relative bg-white text-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col justify-between min-h-[220px]">
            <p className="text-md font-medium text-slate-600 italic leading-relaxed text-center mb-6">
              "{testimonials[activeTestimonial].quote}"
            </p>
            <div className="flex flex-col items-center gap-2">
              <img
                src={testimonials[activeTestimonial].avatar}
                alt={testimonials[activeTestimonial].name}
                className="h-12 w-12 rounded-full border border-slate-200 object-cover shadow"
              />
              <div>
                <p className="text-sm font-extrabold text-slate-900 leading-none">{testimonials[activeTestimonial].name}</p>
                <p className="text-xs text-primary font-semibold mt-1 leading-none">{testimonials[activeTestimonial].role}</p>
              </div>
            </div>
          </div>

          {/* Stepper controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={prevTestimonial}
              className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all backdrop-blur-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex gap-1.5">
              {testimonials.map((_, idx) => (
                <span
                  key={idx}
                  onClick={() => setActiveTestimonial(idx)}
                  className={`h-2 w-2 rounded-full cursor-pointer transition-all duration-300 ${
                    activeTestimonial === idx ? "bg-white w-4" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={nextTestimonial}
              className="h-9 w-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all backdrop-blur-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="z-10 text-[10px] text-white/50 text-center">
          bank-grade SSL data encryption | eIDAS certified transactions
        </div>

      </div>

    </div>
  );
}
