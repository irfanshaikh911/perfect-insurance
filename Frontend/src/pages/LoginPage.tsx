import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, LogIn, User } from "lucide-react";
import { loginApi } from "../lib/auth";
import { useStore } from "../data/store";

export function LoginPage() {
  const location = useLocation();
  const locationState = location.state as { registered?: boolean; agentCode?: string; message?: string } | null;

  const [agentCode, setAgentCode] = useState(() => locationState?.agentCode || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(() => locationState?.message || null);

  const navigate = useNavigate();
  const { saveAgent } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentCode.trim() || !password) {
      setError("Please enter both Agent Code and Password.");
      setSuccess(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const res = await loginApi(agentCode.trim(), password);

      // Sync user profile with application store
      saveAgent({
        name: res.user.name,
        firstName: res.user.name.split(" ")[0] || res.user.name,
        code: res.user.agent_code,
        branch: res.user.branch,
        phone: res.user.phone,
        email: res.user.email,
        yearlyTarget: res.user.yearly_target,
        emailReminders: true,
        whatsappReminders: true,
        browserNotifications: false,
        avatar: res.user.avatar || undefined,
      });

      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <Link to="/login" className="flex flex-col items-center group">
            <img
              src="/Perfect_Agent_Logo_with_Gold_Tick-removebg-preview.png"
              alt="Perfect Agent Logo"
              className="h-24 w-24 object-contain drop-shadow-md transition-transform group-hover:scale-105"
            />
            {/* <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
              Perfect Agent
            </h1> */}
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">
              LIC Agent Workspace
            </p>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your Agent Code to access your client CRM
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          {success && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                Agent Code
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  required
                  value={agentCode}
                  onChange={(e) => setAgentCode(e.target.value)}
                  placeholder="e.g. 01234567"
                  className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-10 text-sm outline-none ring-ring focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full h-10 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-xs"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin rounded-full" />
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Registration Link */}
          <div className="mt-6 border-t border-border/60 pt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Don't have an agent account yet?{" "}
              <Link
                to="/register"
                className="font-semibold text-primary hover:underline hover:text-primary/90"
              >
                Register as New Agent
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
