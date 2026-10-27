import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Building,
  Eye,
  EyeOff,
  IndianRupee,
  Lock,
  Mail,
  Phone,
  User,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { registerApi } from "../lib/auth";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [agentCode, setAgentCode] = useState("");
  const [branch, setBranch] = useState("Branch 912 — Pune City");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [yearlyTarget, setYearlyTarget] = useState("2500000");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !agentCode.trim() || !branch.trim() || !phone.trim() || !email.trim()) {
      setError("Please fill out all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter carefully.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await registerApi({
        name: name.trim(),
        agent_code: agentCode.trim(),
        branch: branch.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        yearly_target: Number(yearlyTarget) || 0,
      });

      // Redirect to login page with prefilled credentials and success message
      navigate("/login", {
        state: {
          registered: true,
          agentCode: agentCode.trim(),
          message: "Registration completed successfully! Please sign in with your Agent Code and Password.",
        },
      });
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-xl space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <Link to="/login" className="flex flex-col items-center group">
            <img
              src="/Perfect_Agent_Logo_with_Gold_Tick-removebg-preview.png"
              alt="Perfect Agent Logo"
              className="h-20 w-20 object-contain drop-shadow-md transition-transform group-hover:scale-105"
            />
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              Register New Agent
            </h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-gold">
              LIC Agent Workspace
            </p>
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your account to manage clients, policies, quotations and pipeline
          </p>
        </div>

        {/* Registration Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Irfan Shaikh"
                    className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
                  />
                </div>
              </div>

              {/* Agent Code */}
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                  Agent Code *
                </label>
                <div className="relative">
                  <UserCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Branch */}
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                  Branch *
                </label>
                <div className="relative">
                  <Building className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="e.g. Branch 912 — Pune City"
                    className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                  Phone / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 919812340000"
                    className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="irfan.agent@example.com"
                    className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
                  />
                </div>
              </div>

              {/* Yearly Premium Target */}
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                  Yearly Target (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="number"
                    value={yearlyTarget}
                    onChange={(e) => setYearlyTarget(e.target.value)}
                    placeholder="e.g. 2500000"
                    className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
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

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
                  Re-enter Password *
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-xs"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin rounded-full" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Complete Registration & Enter
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 border-t border-border/60 pt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Already registered as an agent?{" "}
              <Link
                to="/login"
                className="font-semibold text-primary hover:underline hover:text-primary/90"
              >
                Sign In to your workspace
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
