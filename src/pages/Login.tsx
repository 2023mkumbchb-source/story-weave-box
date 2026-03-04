import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, UserPlus, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        toast({ title: "Account created!", description: "Check your email to verify, then log in." });
        setIsSignUp(false);
      } else {
        await signIn(email, password);
        toast({ title: "Logged in!" });
        navigate("/admin");
      }
    } catch (err: any) {
      toast({ title: isSignUp ? "Sign up failed" : "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8"
        style={{ boxShadow: "var(--shadow-elevated)" }}
      >
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="mb-2 text-center font-display text-2xl font-bold text-foreground">
          {isSignUp ? "Create Account" : "Admin Login"}
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {isSignUp ? "Sign up for an admin account" : "Sign in to access the dashboard"}
        </p>

        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3"
          required
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4"
          required
          minLength={6}
        />
        <Button type="submit" className="w-full gap-2" disabled={loading}>
          {loading ? "..." : isSignUp ? <><UserPlus className="h-4 w-4" /> Sign Up</> : <><LogIn className="h-4 w-4" /> Sign In</>}
        </Button>

        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="mt-4 block w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>

        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-primary hover:underline">← Continue as guest</Link>
        </div>
      </form>
    </div>
  );
}
