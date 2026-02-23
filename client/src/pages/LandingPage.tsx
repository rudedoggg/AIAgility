import { useState } from "react";
import { Target, Beaker, FileText, LayoutDashboard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import heroImage from "@/assets/images/hero-dashboard.png";

function AuthForm({ defaultMode = "signin" }: { defaultMode?: "signin" | "signup" }) {
  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) {
          setError(signUpError.message);
        } else {
          setConfirmationSent(true);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  if (confirmationSent) {
    return (
      <div className="space-y-4 text-center" data-testid="auth-confirmation">
        <h3 className="text-lg font-semibold">Check your email</h3>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
        </p>
        <Button variant="ghost" size="sm" onClick={() => { setConfirmationSent(false); setMode("signin"); }}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm" data-testid="auth-form">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          data-testid="input-email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          data-testid="input-password"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" data-testid="auth-error">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={loading} data-testid="button-auth-submit">
        {loading ? "Loading..." : mode === "signin" ? "Sign in" : "Sign up"}
      </Button>
      <p className="text-sm text-center text-muted-foreground">
        {mode === "signin" ? (
          <>Don't have an account?{" "}
            <button type="button" className="text-primary hover:underline" onClick={() => { setMode("signup"); setError(null); }} data-testid="link-toggle-auth">
              Sign up
            </button>
          </>
        ) : (
          <>Already have an account?{" "}
            <button type="button" className="text-primary hover:underline" onClick={() => { setMode("signin"); setError(null); }} data-testid="link-toggle-auth">
              Sign in
            </button>
          </>
        )}
      </p>
    </form>
  );
}

export default function LandingPage() {
  const [showAuth, setShowAuth] = useState<"signin" | "signup" | null>(null);

  return (
    <div className="min-h-screen bg-background" data-testid="landing-page">
      <nav className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold text-sm" data-testid="img-landing-logo">
              A
            </div>
            <span className="font-bold text-lg tracking-tight" data-testid="text-landing-app-name">AgilityAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" data-testid="button-landing-signin" onClick={() => setShowAuth("signin")}>Sign In</Button>
            <Button data-testid="button-landing-get-started" onClick={() => setShowAuth("signup")}>Get Started</Button>
          </div>
        </div>
      </nav>

      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" data-testid="auth-overlay">
          <div className="bg-background border rounded-xl shadow-lg p-8 w-full max-w-md mx-4 relative">
            <button
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              onClick={() => setShowAuth(null)}
              data-testid="button-close-auth"
            >
              &times;
            </button>
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-bold">
                A
              </div>
              <h2 className="text-xl font-semibold">
                {showAuth === "signin" ? "Welcome back" : "Create your account"}
              </h2>
            </div>
            <div className="flex justify-center">
              <AuthForm defaultMode={showAuth} />
            </div>
          </div>
        </div>
      )}

      <main className="pt-16">
        <section className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight leading-tight" data-testid="text-landing-headline">
                Make better decisions, faster
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg" data-testid="text-landing-subtext">
                AgilityAI helps teams structure goals, gather evidence, and produce
                decision-ready deliverables — all in one workspace with AI assistance.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button size="lg" className="gap-2 text-base px-6" data-testid="button-landing-cta" onClick={() => setShowAuth("signup")}>
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Button>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <span className="text-sm text-muted-foreground" data-testid="text-landing-trust-1">Free to use</span>
                <span className="text-sm text-muted-foreground">No credit card required</span>
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
              <img
                src={heroImage}
                alt="AgilityAI Dashboard"
                className="relative rounded-xl ring-1 ring-black/5 shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]"
                data-testid="img-landing-hero"
              />
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30 py-20">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-center mb-4" data-testid="text-landing-features-title">
              Everything you need to decide with confidence
            </h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
              Four integrated workspaces keep your thinking organized from first question to final deliverable.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard
                icon={<LayoutDashboard className="w-5 h-5" />}
                title="Dashboard"
                description="See project status, next steps, and executive summaries at a glance."
                testId="card-feature-dashboard"
              />
              <FeatureCard
                icon={<Target className="w-5 h-5" />}
                title="Brief"
                description="Define objectives, stakeholders, and constraints in structured sections."
                testId="card-feature-goals"
              />
              <FeatureCard
                icon={<Beaker className="w-5 h-5" />}
                title="Discovery"
                description="Organize evidence into categories with notes, links, and files."
                testId="card-feature-lab"
              />
              <FeatureCard
                icon={<FileText className="w-5 h-5" />}
                title="Deliverables"
                description="Turn research into decision-ready documents tracked with version history."
                testId="card-feature-deliverables"
              />
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-3xl mx-auto px-6 text-center space-y-6">
            <h2 className="text-2xl md:text-3xl font-serif font-bold" data-testid="text-landing-cta-title">
              Ready to make your next big decision?
            </h2>
            <p className="text-muted-foreground">
              Sign up in seconds and start organizing your project today.
            </p>
            <Button size="lg" className="gap-2 text-base px-8 mt-2" data-testid="button-landing-bottom-cta" onClick={() => setShowAuth("signup")}>
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-muted-foreground">
          <span data-testid="text-landing-copyright">AgilityAI</span>
          <span>Built with care</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, testId }: { icon: React.ReactNode; title: string; description: string; testId: string }) {
  return (
    <div
      className="rounded-xl border bg-background/50 hover:bg-background p-6 space-y-3 transition-colors"
      data-testid={testId}
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
