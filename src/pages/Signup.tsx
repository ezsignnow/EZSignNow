import { AuthForm } from "@/components/auth/AuthForm";

export default function Signup() {
  return (
    <div className="min-h-screen flex bg-background overflow-hidden">
      <AuthForm mode="signup" />
    </div>
  );
}
