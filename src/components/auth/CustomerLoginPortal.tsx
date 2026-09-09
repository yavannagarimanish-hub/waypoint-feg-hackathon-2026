import React, { useState } from 'react';
import {
  authenticatePrototypeUser,
  registerPrototypeUser,
  createDefaultUser,
} from '../../services/socialUserService';
import { UserProfile } from '../../types/social';
import {
  LogIn,
  UserPlus,
  ShieldCheck,
  Zap,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
} from 'lucide-react';

interface CustomerLoginPortalProps {
  onLoginSuccess: (user: UserProfile) => void;
  onSwitchToAdmin?: () => void;
}

export const CustomerLoginPortal: React.FC<CustomerLoginPortalProps> = ({
  onLoginSuccess,
  onSwitchToAdmin,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  // Sign In fields
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up fields
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Status & Validation
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const result = authenticatePrototypeUser(signInEmail, signInPassword);
    if (result.success && result.user) {
      onLoginSuccess(result.user);
    } else {
      setErrorMessage(result.error || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const result = registerPrototypeUser(
      signUpName,
      signUpEmail,
      signUpPassword,
      signUpConfirmPassword
    );

    if (result.success && result.user) {
      onLoginSuccess(result.user);
    } else {
      setErrorMessage(result.error || 'Registration failed. Please check required fields.');
    }
  };

  const handleDemoAccount = () => {
    setErrorMessage(null);
    const defaultUser = createDefaultUser();
    // Re-authenticate default user
    const result = authenticatePrototypeUser(defaultUser.email || defaultUser.username, 'demo123');
    if (result.success && result.user) {
      onLoginSuccess(result.user);
    } else {
      onLoginSuccess(defaultUser);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-200 flex flex-col justify-between selection:bg-[#1752bf] selection:text-white">
      {/* Minimal Top Brand Bar */}
      <header className="h-14 border-b border-[#1c1c28] bg-[#111118]/80 backdrop-blur-sm px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/psk-logo.svg"
            alt="PSK"
            className="h-7 w-[100px] object-contain shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
          <span className="font-black text-xs uppercase tracking-wider bg-[#1447a6] px-1.5 py-0.5 rounded text-blue-200 font-mono">
            Waypoint
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-zinc-400">
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Customer Portal</span>
          </div>
          {onSwitchToAdmin && (
            <button
              onClick={onSwitchToAdmin}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1a1a26] hover:bg-[#252538] text-[11px] font-bold text-zinc-300 hover:text-white border border-[#2d2d42] transition"
              title="Switch to Operator Admin Portal"
            >
              <span>Operator Portal (/admin) →</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Centered Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-md bg-[#13131c] border border-[#232333] rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
          {/* Header Banner */}
          <div className="bg-gradient-to-b from-[#181826] to-[#13131c] px-6 pt-8 pb-4 text-center border-b border-[#1f1f2e]">
            <div className="w-12 h-12 rounded-2xl bg-[#1752bf]/20 border border-[#1752bf]/50 flex items-center justify-center text-blue-400 mx-auto mb-3 shadow-inner">
              {mode === 'signin' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              {mode === 'signin'
                ? 'Continue your session with WAYPOINT.'
                : 'Establish your prototype customer profile.'}
            </p>

            {/* Mode Switcher Tabs */}
            <div className="flex bg-[#0c0c12] p-1 rounded-xl border border-[#212130] mt-5">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMessage(null);
                }}
                className={
                  'flex-1 py-1.5 text-xs font-bold rounded-lg transition ' +
                  (mode === 'signin'
                    ? 'bg-[#1752bf] text-white shadow'
                    : 'text-zinc-400 hover:text-white')
                }
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                }}
                className={
                  'flex-1 py-1.5 text-xs font-bold rounded-lg transition ' +
                  (mode === 'signup'
                    ? 'bg-[#1752bf] text-white shadow'
                    : 'text-zinc-400 hover:text-white')
                }
              >
                Create Account
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Error Notification */}
            {errorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-start gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* SIGN IN FORM */}
            {mode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Email or Username
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={signInEmail}
                      onChange={e => setSignInEmail(e.target.value)}
                      placeholder="e.g. fan@waypoint.psk"
                      required
                      className="w-full bg-[#0c0c12] border border-[#28283a] focus:border-[#1752bf] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type={showSignInPassword ? 'text' : 'password'}
                      value={signInPassword}
                      onChange={e => setSignInPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-[#0c0c12] border border-[#28283a] focus:border-[#1752bf] rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword(!showSignInPassword)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-white p-0.5"
                    >
                      {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#1752bf] hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg mt-2"
                >
                  Sign in
                </button>
              </form>
            )}

            {/* CREATE ACCOUNT FORM */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={signUpName}
                      onChange={e => setSignUpName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      required
                      className="w-full bg-[#0c0c12] border border-[#28283a] focus:border-[#1752bf] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={signUpEmail}
                      onChange={e => setSignUpEmail(e.target.value)}
                      placeholder="e.g. alex@waypoint.psk"
                      required
                      className="w-full bg-[#0c0c12] border border-[#28283a] focus:border-[#1752bf] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <input
                        type={showSignUpPassword ? 'text' : 'password'}
                        value={signUpPassword}
                        onChange={e => setSignUpPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full bg-[#0c0c12] border border-[#28283a] focus:border-[#1752bf] rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute right-2 top-2.5 text-zinc-400 hover:text-white p-0.5"
                      >
                        {showSignUpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Confirm *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <input
                        type={showSignUpPassword ? 'text' : 'password'}
                        value={signUpConfirmPassword}
                        onChange={e => setSignUpConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full bg-[#0c0c12] border border-[#28283a] focus:border-[#1752bf] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition font-sans"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#1752bf] hover:bg-blue-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg mt-2"
                >
                  Create account
                </button>
              </form>
            )}

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-[#232333] w-full" />
              <span className="bg-[#13131c] px-3 text-[11px] text-zinc-500 font-mono uppercase tracking-widest absolute">
                or
              </span>
            </div>

            {/* FAST PATH: PROTOTYPE DEMO ACCOUNT */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleDemoAccount}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1c1c28] hover:bg-[#252538] border border-[#35354c] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow"
                title="Immediate 1-click evaluation access"
              >
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Continue with Demo Account</span>
              </button>
              <p className="text-[11px] text-center text-zinc-500 font-mono">
                Instant evaluator access with synthetic profile (<strong className="text-zinc-400">Luka Modric Fan</strong>)
              </p>
            </div>
          </div>

          {/* Responsible & Safe Prototype Footer */}
          <div className="bg-[#0f0f16] px-6 py-3.5 border-t border-[#1e1e2c] flex items-center gap-2.5 text-[11px] text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Prototype Sandbox:</strong> Client-side authentication only. Passwords are validated for interaction realism but never stored or transmitted.
            </span>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-[#1c1c28] py-3 px-4 text-center text-[11px] text-zinc-500">
        <span>PSK Waypoint • Customer User Portal</span>
        <span className="mx-2">•</span>
        <span>FEG Innovation Hackathon 2026</span>
      </footer>
    </div>
  );
};

