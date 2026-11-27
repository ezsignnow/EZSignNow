import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket, faUser } from "@fortawesome/free-solid-svg-icons";
import { BrandLogo } from "./BrandLogo";
import { LanguageSwitcher, useT } from "@/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const t = useT();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link to="/">
            <BrandLogo subtitleClassName="hidden sm:block" />
          </Link>
          <div className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider">
            <Link to="/forms" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.forms")}</Link>
            <Link to="/compare/signnow" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.compare")}</Link>
            <Link to="/security" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.security")}</Link>
            <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.resources")}</Link>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <LanguageSwitcher variant="compact" className="px-2.5 sm:hidden" />
          <LanguageSwitcher className="hidden sm:inline-flex max-w-[11rem]" />
          {user ? (
            <>
              <Button variant="ghost" asChild>
                <Link to="/dashboard">{t("nav.dashboard")}</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <FontAwesomeIcon icon={faUser} className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem onClick={() => navigate("/dashboard?tab=settings")} className="text-popover-foreground cursor-pointer">
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <FontAwesomeIcon icon={faRightFromBracket} className="mr-2 h-4 w-4" />
                    {t("nav.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link to="/login">{t("nav.signIn")}</Link>
              </Button>
              <Button asChild>
                <Link to="/signup">{t("nav.getStarted")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}



