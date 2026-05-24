import { AuthForm } from "@/components/auth/AuthForm";

export default function Login() {
  return (
    <div className="min-h-screen flex bg-background overflow-hidden">
      <AuthForm mode="login" />
    </div>
  );
}
