import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <Link to="/">
            <BrandLogo />
          </Link>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link to="/forms" className="hover:text-foreground transition-colors">Forms Library</Link>
            <Link to="/compare/signnow" className="hover:text-foreground transition-colors">signNow vs EZ</Link>
            <Link to="/security" className="hover:text-foreground transition-colors">Security</Link>
            <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link to="/login" className="hover:text-foreground transition-colors">Login</Link>
            <Link to="/signup" className="hover:text-foreground transition-colors">Sign Up</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} EZSignNow. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}



