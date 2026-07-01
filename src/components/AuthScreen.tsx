"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { Mail, Lock, User, ArrowRight, Loader2, CreditCard, AlertCircle } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"signin" | "signup" | "forgot">("signin");
  const [loading, setLoading] = useState(false);
  
  // Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      if (activeTab === "signin") {
        await signIn(email, password);
        showToast("Welcome back!");
      } else if (activeTab === "signup") {
        if (password !== confirmPassword) {
          setErrorMsg("Passwords do not match.");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMsg("Password must be at least 6 characters.");
          setLoading(false);
          return;
        }
        await signUp(email, password, name);
        showToast("Account registered successfully!");
      } else if (activeTab === "forgot") {
        await sendPasswordResetEmail(auth, email);
        showToast("Password reset email sent! Check your inbox.");
        setActiveTab("signin");
      }
    } catch (err: any) {
      console.error(err);
      let msg = "An unexpected error occurred. Please try again.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        msg = "Invalid email or password.";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "An account with this email already exists.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password is too weak.";
      } else if (err.code === "auth/invalid-email") {
        msg = "Invalid email address format.";
      }
      setErrorMsg(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 relative overflow-hidden p-6">
      
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center mt-10">
        
        {/* Floating Gradient Circles strictly behind the card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-10">
          <div className="absolute -top-10 -left-10 w-72 h-72 bg-gradient-to-br from-accent/60 to-purple-600/60 rounded-full blur-[80px] opacity-80 animate-orb-float" style={{ animationDuration: '15s' }} />
          <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-gradient-to-bl from-indigo-600/60 to-cyan-500/60 rounded-full blur-[80px] opacity-80 animate-orb-float" style={{ animationDelay: '-7s', animationDuration: '18s', animationDirection: 'reverse' }} />
        </div>

        {/* Logo Header */}
        <div className="flex items-center gap-3 mb-8 italic">
          <div className="bg-accent p-3.5 rounded-2xl shadow-xl shadow-accent/30 animate-pulse">
            <CreditCard className="w-8 h-8 text-white not-italic" />
          </div>
          <span className="text-3xl font-black text-white tracking-tighter">
            CHEQUE<span className="text-accent not-italic">PRO</span>
          </span>
        </div>

        {/* Card */}
        <div className="w-full bg-white/10 backdrop-blur-xl border border-white/10 shadow-2xl p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] text-white">
          
          {/* Tabs */}
          {activeTab !== "forgot" && (
            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 mb-8">
              <button
                type="button"
                onClick={() => { setActiveTab("signin"); setErrorMsg(""); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === "signin" 
                    ? "bg-white text-slate-950 shadow-lg" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("signup"); setErrorMsg(""); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === "signup" 
                    ? "bg-white text-slate-950 shadow-lg" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Register
              </button>
            </div>
          )}

          {activeTab === "forgot" && (
            <div className="mb-6">
              <h2 className="text-xl font-black tracking-tight">Reset Password</h2>
              <p className="text-slate-400 text-xs mt-1 font-medium">Enter your email and we'll send you a password reset link.</p>
            </div>
          )}

          {/* Error message */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs font-bold text-red-300 mb-6 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {activeTab === "signup" && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    required
                    type="text"
                    placeholder="Tony Stark"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent focus:bg-white/10 transition-all font-medium"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  type="email"
                  placeholder="tony@stark.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent focus:bg-white/10 transition-all font-medium"
                />
              </div>
            </div>

            {activeTab !== "forgot" && (
              <div>
                <div className="flex justify-between items-center mb-2 pl-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</label>
                  {activeTab === "signin" && (
                    <button
                      type="button"
                      onClick={() => { setActiveTab("forgot"); setErrorMsg(""); }}
                      className="text-[10px] font-black uppercase text-accent tracking-wider hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent focus:bg-white/10 transition-all font-medium"
                  />
                </div>
              </div>
            )}

            {activeTab === "signup" && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-accent focus:bg-white/10 transition-all font-medium"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-accent/25 hover:shadow-accent/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:pointer-events-none mt-6"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {activeTab === "signin" && "Sign In"}
                  {activeTab === "signup" && "Create Account"}
                  {activeTab === "forgot" && "Send Reset Link"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {activeTab === "forgot" && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => { setActiveTab("signin"); setErrorMsg(""); }}
                className="text-[10px] font-black uppercase text-slate-400 hover:text-white tracking-widest"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-8">
          Secured by Firebase Authentication
        </p>
      </div>
    </div>
  );
}
