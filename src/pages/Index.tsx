import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { 
  FileSignature, 
  Users, 
  Shield, 
  Zap, 
  CheckCircle2,
  ArrowRight,
  FileText,
  Clock,
  Globe
} from "lucide-react";
import heroImage from "@/assets/hero-esign.jpg";

const features = [
  {
    icon: FileSignature,
    title: "Digital Signatures",
    description: "Legally binding electronic signatures that work anywhere in the world.",
  },
  {
    icon: Users,
    title: "Multi-Party Signing",
    description: "Add multiple signatories and track the signing progress in real-time.",
  },
  {
    icon: Shield,
    title: "Secure & Compliant",
    description: "Bank-level encryption and full audit trails for every document.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Get documents signed in minutes, not days. No printing required.",
  },
];

const benefits = [
  "Unlimited document uploads",
  "Custom signature fields",
  "Text boxes, checkboxes & dates",
  "Multi-party signing workflows",
  "Real-time status tracking",
  "Secure cloud storage",
];

export default function Index() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/95 to-secondary/80" />
        </div>
        
        <div className="container relative mx-auto px-4 py-24 lg:py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-secondary-foreground sm:text-5xl lg:text-6xl">
              Sign Documents
              <span className="block text-primary">Effortlessly</span>
            </h1>
            <p className="mt-6 text-lg text-secondary-foreground/80">
              The simplest way to sign, send, and manage documents online. 
              Get legally binding signatures from anyone, anywhere, in minutes.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button size="lg" asChild className="text-base">
                <Link to="/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-base border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/10">
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Everything You Need
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features to streamline your document signing workflow
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-border bg-background p-6 transition-all hover:border-primary/50 hover:shadow-lg"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Three simple steps to get your documents signed
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                icon: FileText,
                title: "Upload Document",
                description: "Upload your PDF document and add custom fields for signatures, dates, and more.",
              },
              {
                step: "2",
                icon: Users,
                title: "Add Signatories",
                description: "Invite signers by email and assign specific fields to each person.",
              },
              {
                step: "3",
                icon: CheckCircle2,
                title: "Get Signatures",
                description: "Signers receive an email link to sign. Track progress in real-time.",
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                  {item.step}
                </div>
                <h3 className="mb-3 text-xl font-semibold text-foreground">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                Why Choose ezsignnow?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Join thousands of businesses that trust ezsignnow for their document signing needs.
              </p>
              <ul className="mt-8 space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
              <Button size="lg" className="mt-8" asChild>
                <Link to="/signup">Get Started Free</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Clock, value: "50%", label: "Faster signing" },
                { icon: FileText, value: "10K+", label: "Documents signed" },
                { icon: Globe, value: "50+", label: "Countries" },
                { icon: Shield, value: "99.9%", label: "Uptime" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border bg-card p-6 text-center"
                >
                  <stat.icon className="mx-auto h-8 w-8 text-primary" />
                  <p className="mt-3 text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-secondary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-secondary-foreground sm:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mt-4 text-lg text-secondary-foreground/80 max-w-2xl mx-auto">
            Start your free trial today. No credit card required.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link to="/signup">
              Create Free Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
