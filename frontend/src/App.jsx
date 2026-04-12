import { useState, useEffect } from 'react';
import AdminUpload from './components/AdminUpload';
import ChatWindow from './components/ChatWindow';
import Login from './components/Login';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('opsmind_token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleDocAdded = (docInfo) => {
    setDocs((prev) => {
      // Avoid duplicates by name
      const exists = prev.find((d) => d.name === docInfo.name);
      if (exists) return prev.map((d) => d.name === docInfo.name ? docInfo : d);
      return [...prev, docInfo];
    });
  };

  // ── Unauthenticated State ──
  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  // ── Authenticated State ──
  return (
    <div className="grid grid-cols-[300px_1fr] grid-rows-[64px_1fr] h-screen overflow-hidden">
      {/* ── Header ── */}
      <header className="col-span-full flex items-center justify-between px-7 bg-[#080c14e6] backdrop-blur-[20px] border-b border-border-subtle z-[100]">
        <div className="flex items-center gap-3">
          <div className="w-[36px] h-[36px] rounded-[10px] bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center text-[18px] font-extrabold text-white shadow-[0_0_30px_rgba(0,212,255,0.15)] shrink-0">O</div>
          <div>
            <div className="text-[1.05rem] font-bold text-gradient-brand tracking-tight">OpsMind AI</div>
            <div className="text-[0.72rem] text-text-secondary font-normal mt-[1px]">Enterprise SOP Agent · RAG Architecture</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[0.78rem] text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-[rgba(0,212,255,0.1)] text-brand-cyan border border-[rgba(0,212,255,0.2)] tracking-wider uppercase">RAG</span>
            <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-[rgba(139,92,246,0.1)] text-[#8b5cf6] border border-[rgba(139,92,246,0.2)] tracking-wider uppercase">
              Gemini 2.5
            </span>
            <div className="w-[8px] h-[8px] rounded-full bg-brand-emerald shadow-[0_0_8px_#10b981] animate-pulse-dot" />
            <span>Live</span>
          </div>

          <div className="w-[1px] h-[20px] bg-border-subtle mx-1" />

          <button
            onClick={() => {
              localStorage.removeItem('opsmind_token');
              setIsLoggedIn(false);
            }}
            className="text-text-muted hover:text-white cursor-pointer transition-colors bg-transparent border-none font-semibold text-[0.75rem]"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <aside className="bg-bg-surface border-r border-border-subtle p-6 flex flex-col gap-6 overflow-y-auto">
        <AdminUpload onDocAdded={handleDocAdded} docs={docs} />
      </aside>

      {/* ── Main Chat ── */}
      <main className="flex flex-col overflow-hidden">
        <ChatWindow />
      </main>
    </div>
  );
}
