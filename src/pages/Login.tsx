import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authenticate } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authenticate(password)) {
      sessionStorage.setItem("learninghub_auth", "true");
      navigate("/admin");
    } else {
      toast({ title: "Invalid password", description: "Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8"
        style={{ boxShadow: "var(--shadow-elevated)" }}
      >
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="mb-2 text-center font-display text-2xl font-bold text-foreground">Admin Login</h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">Enter password to access the dashboard</p>

        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4"
        />
        <Button type="submit" className="w-full">
          Sign In
        </Button>
        <p className="mt-4 text-center text-xs text-muted-foreground">Enter admin password to continue</p>
      </form>
    </div>
  );
}
