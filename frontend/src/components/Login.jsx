import { useState } from 'react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLoginOrSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        // Fallback for non-JSON or empty responses
      }

      if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);

      if (data.requireOtp) {
        setSuccess('Check your email (or terminal) for the 6-digit code!');
        setStep(2);
      } else if (data.token) {
        // Login immediately bypass OTP
        localStorage.setItem('opsmind_token', data.token);
        onLogin(data.token);
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        // Fallback for non-JSON or empty responses
      }

      if (!res.ok) throw new Error(data.error || `Verification failed (${res.status})`);

      // Success
      localStorage.setItem('opsmind_token', data.token);
      onLogin(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen relative overflow-hidden bg-bg-base">
      <div className="absolute w-[600px] h-[600px] bg-gradient-to-br from-brand-cyan to-brand-purple rounded-full filter blur-[120px] opacity-15 animate-orb-drift z-0" />
      <div className="bg-bg-glass backdrop-blur-[24px] border border-border-subtle rounded-[28px] p-12 w-full max-w-[440px] z-10 shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_40px_rgba(0,212,255,0.1)] flex flex-col gap-8 relative overflow-hidden">

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-20">
            <div className="w-[40px] h-[40px] rounded-full border-4 border-t-brand-cyan border-r-brand-purple border-b-transparent border-l-transparent animate-spin" />
          </div>
        )}

        <div className="text-center flex flex-col items-center gap-3">
          <div className="w-[54px] h-[54px] rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center text-[26px] font-extrabold text-white shadow-[0_0_30px_rgba(0,212,255,0.15)]">O</div>
          <h1 className="text-[1.6rem] font-extrabold text-gradient-brand">OpsMind AI</h1>
          <p className="text-[0.9rem] text-text-secondary">
            {step === 1 ? 'Sign in to your enterprise workspace' : 'Enter the verification code'}
          </p>
        </div>

        {error && <div className="text-[0.8rem] text-brand-rose bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.2)] p-2.5 rounded-md text-center">{error}</div>}
        {success && <div className="text-[0.8rem] text-brand-emerald bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] p-2.5 rounded-md text-center">{success}</div>}

        {step === 1 ? (
          <form onSubmit={handleLoginOrSignup} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-[0.8rem] font-semibold text-text-primary">Work Email</label>
              <input
                type="email"
                id="email"
                className="bg-[rgba(0,0,0,0.2)] border border-border-subtle rounded-[14px] p-3 px-4 text-text-primary text-[0.95rem] font-inter outline-none transition-all duration-220 focus:border-brand-cyan focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)] focus:bg-[rgba(0,212,255,0.03)]"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-[0.8rem] font-semibold text-text-primary">Password</label>
              <input
                type="password"
                id="password"
                className="bg-[rgba(0,0,0,0.2)] border border-border-subtle rounded-[14px] p-3 px-4 text-text-primary text-[0.95rem] font-inter outline-none transition-all duration-220 focus:border-brand-cyan focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)] focus:bg-[rgba(0,212,255,0.03)]"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="mt-2 p-3.5 rounded-[14px] font-semibold text-[0.95rem] font-inter cursor-pointer transition-all duration-220 flex items-center justify-center gap-3 border-none bg-gradient-to-br from-brand-cyan to-brand-purple text-white shadow-[0_4px_16px_rgba(139,92,246,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(139,92,246,0.4)]">
              Continue ➜
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="otp" className="text-[0.8rem] font-semibold text-text-primary">6-Digit OTP</label>
              <input
                type="text"
                id="otp"
                className="bg-[rgba(0,0,0,0.2)] border border-border-subtle rounded-[14px] p-3 px-4 text-text-primary text-[1.2rem] text-center font-mono tracking-[0.5em] outline-none transition-all duration-220 focus:border-brand-cyan focus:shadow-[0_0_0_3px_rgba(0,212,255,0.15)] focus:bg-[rgba(0,212,255,0.03)]"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
            </div>
            <button type="submit" disabled={otp.length !== 6} className="mt-2 p-3.5 rounded-[14px] font-semibold text-[0.95rem] font-inter cursor-pointer transition-all duration-220 flex items-center justify-center gap-3 border-none bg-gradient-to-br from-brand-cyan to-brand-purple text-white shadow-[0_4px_16px_rgba(139,92,246,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(139,92,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed">
              Verify & Sign In
            </button>
            <button type="button" onClick={() => setStep(1)} className="text-[0.8rem] text-text-secondary hover:text-white cursor-pointer bg-transparent border-none underline">
              ← Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
