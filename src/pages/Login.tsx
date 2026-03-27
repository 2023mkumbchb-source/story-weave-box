import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Lock, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";

const ADMIN_PASSWORD = "Davis";

export default function Login() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const ogUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${location.pathname}${location.search}`
      : location.pathname;
  const title = "Admin Login | OmpathStudy Kenya";
  const description =
    "Sign in to manage OmpathStudy content and settings. Admin access is restricted to authorized staff for the Kenya medical education platform.";
  const keywords =
    "OmpathStudy, admin login, medical education Kenya, content management, staff portal";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("learninghub_auth", "true");
      toast({ title: "Logged in!" });
      navigate("/admin");
    } else {
      toast({ title: "Incorrect password", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-6">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={ogUrl} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Helmet>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8"
        style={{ boxShadow: "var(--shadow-elevated)" }}
      >
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="mb-2 text-center font-serif text-2xl font-bold text-foreground">
          Admin Login
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Enter your password to access the dashboard
        </p>
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4"
          required
        />
        <Button type="submit" className="w-full gap-2" disabled={loading}>
          <LogIn className="h-4 w-4" /> Sign In
        </Button>
        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-primary hover:underline">← Continue as guest</Link>
        </div>
      </form>
    </div>
  );
}
