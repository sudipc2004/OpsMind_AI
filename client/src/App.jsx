import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Settings, 
  ShieldCheck, 
  FileText, 
  MoreVertical,
  Cpu,
  ExternalLink,
  Bot,
  UploadCloud,
  X,
  ArrowRight,
  Database,
  Lock,
  Zap,
  Search,
  Sparkles,
  Activity,
  Layers,
  ChevronRight,
  Save,
  RefreshCw,
  Trash2,
  Hash,
  LogOut
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import Pusher from 'pusher-js';
import Landing from './components/Landing';
import Login from './components/Login';



// --- AnimatedLogo Component ---
const AnimatedLogo = ({ size = "normal" }) => {
  const containerSize = size === "large" ? "w-16 h-16" : "w-10 h-10";

  return (
    <div className={`relative flex items-center justify-center ${containerSize} rounded-[10px] shadow-[0_0_20px_rgba(110,86,207,0.3)] overflow-hidden border border-railway-accent/30`}>
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-railway-accent/20 rounded-full blur-md"
      />
      <motion.img 
        src="/logo.png" 
        alt="OpsMind Logo"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 w-full h-full object-cover scale-110"
      />
    </div>
  );
};

const App = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [currentView, setCurrentView] = useState('landing');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const chatEndRef = useRef(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [indexedDocs, setIndexedDocs] = useState([]);
  const [modelChoice, setModelChoice] = useState('groq');
  const [notifications, setNotifications] = useState([]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const token = localStorage.getItem('opsmind_token');
    if (token) {
      setIsLoggedIn(true);
    }

    // --- Pusher Real-time Activity ---
    const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
      cluster: import.meta.env.VITE_PUSHER_CLUSTER
    });

    const channel = pusher.subscribe('opsmind-activity');
    channel.bind('new-query', (data) => {
      const newNotif = { id: Date.now(), message: data.query };
      setNotifications(prev => [newNotif, ...prev].slice(0, 3));
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
      }, 5000);
    });

    return () => {
      pusher.unsubscribe('opsmind-activity');
    };
  }, []);


  const [systemPrompt, setSystemPrompt] = useState('');

  const fetchPrompt = async () => {
    try {
      const res = await fetch('/api/query/prompt');
      const data = await res.json();
      if (data.prompt) setSystemPrompt(data.prompt);
    } catch (err) {
      console.error('Failed to fetch prompt:', err);
    }
  };

  const updatePrompt = async () => {
    try {
      const res = await fetch('/api/query/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: systemPrompt })
      });
      if (res.ok) {
        setNotifications(prev => [{ id: Date.now(), message: "System prompt updated successfully" }, ...prev]);
      }
    } catch (err) {
      console.error('Update prompt failed:', err);
    }
  };

  const fetchDocs = async () => {
    try {
      const res = await fetch('/api/upload/docs');
      const data = await res.json();
      if (Array.isArray(data)) setIndexedDocs(data);
    } catch (err) {
      console.error('Failed to fetch docs:', err);
    }
  };

  const deleteDoc = async (source) => {
    if (!confirm(`Are you sure you want to delete "${source}"? This will remove all associated chunks.`)) return;
    try {
      const res = await fetch(`/api/upload/docs/${encodeURIComponent(source)}`, { method: 'DELETE' });
      if (res.ok) {
        setIndexedDocs(prev => prev.filter(d => d.name !== source));
        setNotifications(prev => [{ id: Date.now(), message: `Successfully deleted ${source}` }, ...prev]);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchPrompt();
      fetchDocs();
    }
  }, [isLoggedIn]);



  useEffect(() => {
    if (currentView === 'chat') {
      scrollToBottom();
    }
  }, [messages, isTyping, currentView]);

  const handleLogin = (token) => {
    setIsLoggedIn(true);
    setCurrentView('chat');
  };

  const handleLogout = () => {
    localStorage.removeItem('opsmind_token');
    setIsLoggedIn(false);
    setCurrentView('landing');
    setMessages([]);
    setHasInteracted(false);
  };

  const handleSend = async (e, directQuery = null) => {
    if (e) e.preventDefault();
    const query = (directQuery || input).trim();
    if (!query || isTyping) return;

    if (!isLoggedIn) {
      setCurrentView('auth');
      return;
    }

    if (currentView === 'landing' || currentView === 'admin') {
      setCurrentView('chat');
    }

    setHasInteracted(true);
    const userMessage = { id: Date.now(), role: 'user', content: query, time: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const assistantMessageId = Date.now() + 1;
    setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '', sources: [], isStreaming: true }]);

    try {
      const token = localStorage.getItem('opsmind_token');
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query, topK: 5, modelChoice }),
      });


      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let sources = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;
            
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'chunk') {
                accumulated += parsed.content;
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId ? { ...msg, content: accumulated } : msg
                ));
              } else if (parsed.type === 'sources') {
                sources = parsed.content;
              } else if (parsed.type === 'done') {
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId ? { ...msg, sources, isStreaming: false } : msg
                ));
              } else if (parsed.type === 'error') {
                throw new Error(parsed.content);
              }
            } catch (err) {
              console.error("Error parsing SSE data:", err);
            }
          }
        }
      }
    } catch (error) {
      console.error("Query error:", error);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId ? { ...msg, content: `⚠️ Error: ${error.message}`, isStreaming: false } : msg
      ));
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (files.length === 0) return;

    const newFiles = files.map(f => ({ 
      file: f, 
      name: f.name, 
      size: (f.size / 1024 / 1024).toFixed(2) + ' MB', 
      status: 'ready' 
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const processFiles = async () => {
    if (uploadedFiles.length === 0) return;
    
    const token = localStorage.getItem('opsmind_token');
    
    for (let i = 0; i < uploadedFiles.length; i++) {
      if (uploadedFiles[i].status !== 'ready') continue;
      
      const fileData = uploadedFiles[i];
      setUploadedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'processing' } : f));
      
      const formData = new FormData();
      formData.append('pdf', fileData.file);
      
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        
        setUploadedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'indexed' } : f));
        setIndexedDocs(prev => [...prev, { name: data.filename, pages: data.pages, chunks: data.chunks }]);
      } catch (err) {
        console.error("Upload error:", err);
        setUploadedFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error' } : f));
      }
    }
  };

  const removeFile = (idx) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const startNewSession = () => {
    setMessages([]);
    setHasInteracted(false);
    setCurrentView('chat');
  };

  // --- Page Variants for AnimatePresence (Slow Motion) ---
  const pageVariants = {
    initial: { opacity: 0, y: 30, scale: 0.95 },
    in: { opacity: 1, y: 0, scale: 1 },
    out: { opacity: 0, y: -30, scale: 0.95 }
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 1.2
  };

  const quickActions = [
    { title: "Summarize IT Policies", desc: "Get a brief overview of laptop usage and security.", icon: ShieldCheck },
    { title: "Onboarding Steps", desc: "List the 5 key tasks for new employees.", icon: Layers },
    { title: "Leave Approval Workflow", desc: "Explain the chain of command for PTO.", icon: Activity },
    { title: "Analyze Expense Reports", desc: "What are the limits on travel meals?", icon: Database },
  ];

  if (currentView === 'auth') {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="relative h-screen w-full bg-[#0B0A10] text-white font-sans overflow-hidden selection:bg-railway-accent selection:text-white">
      <AnimatePresence mode="wait">
        
        {/* 3D LANDING PAGE VIEW */}
        {currentView === 'landing' && (
          <motion.div 
            key="landing"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="absolute inset-0 flex flex-col overflow-hidden"
          >
            <Landing onEnter={() => {
              if (isLoggedIn) {
                setCurrentView('chat');
              } else {
                setCurrentView('auth');
              }
            }} />
          </motion.div>
        )}



        {/* CHAT AND ADMIN VIEWS */}
        {currentView !== 'landing' && (
          <motion.div 
            key="app-view"
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            className="absolute inset-0 flex h-screen w-full bg-[#0B0A10]"
          >
            {/* Sidebar */}
            <aside className="w-72 border-r border-white/10 flex flex-col bg-[#13111C]/80 backdrop-blur-xl z-20 shrink-0">
              <div 
                onClick={() => setCurrentView('landing')}
                className="p-6 flex items-center gap-4 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors duration-500 group"
              >
                <div className="group-hover:scale-110 transition-transform duration-500">
                  <AnimatedLogo size="small" />
                </div>
                <h1 className="text-2xl font-serif tracking-tight font-semibold">OpsMind</h1>
              </div>

              <div className="p-4">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startNewSession}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all duration-300 text-sm font-medium shadow-sm ${currentView === 'chat' && !hasInteracted ? 'bg-railway-accent/20 border-railway-accent text-white shadow-[0_0_15px_rgba(110,86,207,0.2)]' : 'border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-white/20 hover:bg-white/10'}`}
                >
                  <Plus size={16} /> Start New Query
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2 mt-4">Active Sessions</div>
                {messages.length > 0 && (
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md bg-railway-accent/10 border border-railway-accent/20 text-sm text-white group">
                    <MessageSquare size={14} className="text-railway-accent" />
                    <span className="truncate">Current Analysis</span>
                  </button>
                )}
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-2 mt-4">History</div>
                {[1, 2].map(i => (
                  <button key={i} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-white/5 transition-colors duration-300 text-sm text-gray-400 hover:text-white group">
                    <MessageSquare size={14} className="opacity-50 group-hover:opacity-100 group-hover:text-railway-accent transition-colors" />
                    <span className="truncate">Previous Session #{i}</span>
                  </button>
                ))}
              </div>

              <div className="p-4 border-t border-white/10 space-y-1">
                <button 
                  onClick={() => setCurrentView('admin')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors duration-300 text-sm group ${currentView === 'admin' ? 'bg-railway-accent/10 text-railway-accent font-medium' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <ShieldCheck size={16} className={currentView === 'admin' ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'} /> Knowledge Base
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-red-500/10 transition-colors duration-300 text-sm text-gray-400 hover:text-red-400 group"
                >
                  <LogOut size={16} className="opacity-50 group-hover:opacity-100" /> Sign Out
                </button>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-railway-accent/10 via-[#0B0A10] to-[#0B0A10] min-w-0">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

              <header className="h-16 flex items-center justify-between px-6 lg:px-8 z-10 border-b border-white/10 bg-[#0B0A10]/60 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <div className="px-3 py-1 rounded-md border border-railway-accent/30 bg-railway-accent/10 text-[10px] font-mono text-railway-accent uppercase tracking-widest hidden sm:block">
                    {currentView === 'chat' ? 'Engine: Gemini Pro RAG' : 'Admin: Ingestion Pipeline'}
                  </div>
                  <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
                  <div className="text-xs text-gray-400 flex items-center gap-2 font-mono">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live Engine: {modelChoice.toUpperCase()}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Model Switcher */}
                  <div className="flex bg-[#13111C] border border-white/10 rounded-lg p-0.5">
                    <button 
                      onClick={() => setModelChoice('groq')}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${modelChoice === 'groq' ? 'bg-railway-accent text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      GROQ
                    </button>
                    <button 
                      onClick={() => setModelChoice('gemini')}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${modelChoice === 'gemini' ? 'bg-railway-accent text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      GEMINI
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono px-3 py-1.5 rounded-md bg-[#13111C] border border-white/10">
                    <Database size={12} className="text-railway-accent" />
                    <span>Vectors: {indexedDocs.reduce((acc, d) => acc + d.chunks, 14024).toLocaleString()}</span>
                  </div>
                </div>
              </header>

              {/* Real-time Toast Notifications */}
              <div className="fixed top-20 right-6 z-50 flex flex-col gap-2">
                <AnimatePresence>
                  {notifications.map(notif => (
                    <motion.div 
                      key={notif.id}
                      initial={{ opacity: 0, x: 50, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 20, scale: 0.9 }}
                      className="bg-[#13111C]/90 backdrop-blur-xl border border-railway-accent/30 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 max-w-xs"
                    >
                      <div className="w-2 h-2 rounded-full bg-railway-accent animate-pulse"></div>
                      <div className="text-[11px] text-gray-300 font-mono">
                        <span className="text-railway-accent font-bold">New Activity:</span> {notif.message}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>


              {currentView === 'chat' ? (
                <div className="flex-1 flex overflow-hidden relative z-10">
                  {/* Chat Timeline */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8 custom-scrollbar">
                      <AnimatePresence initial={false}>
                        {!hasInteracted && messages.length === 0 ? (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                            className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto mt-10 md:mt-0"
                          >
                            <AnimatedLogo size="large" />
                            <h2 className="text-3xl font-serif mt-6 mb-3">Welcome to OpsMind</h2>
                            <p className="text-gray-400 mb-10 leading-relaxed">
                              Your corporate intelligence engine is ready. I have processed and indexed your standard operating procedures. What would you like to explore?
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                              {quickActions.map((action, idx) => (
                                <motion.button
                                  key={idx}
                                  whileHover={{ scale: 1.02, y: -2 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={(e) => handleSend(e, action.title)}
                                  className="flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-railway-accent/10 hover:border-railway-accent/50 transition-all text-left group"
                                >
                                  <div className="p-2 rounded-lg bg-[#13111C] border border-white/10 group-hover:border-railway-accent/30 group-hover:text-railway-accent transition-colors">
                                    <action.icon size={18} />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-white group-hover:text-railway-accent transition-colors">{action.title}</h4>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{action.desc}</p>
                                  </div>
                                </motion.button>
                              ))}
                            </div>
                          </motion.div>
                        ) : (
                          messages.map((msg) => (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.6 }}
                              className={`flex gap-3 md:gap-4 max-w-3xl mx-auto w-full ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                              {msg.role === 'user' ? (
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border bg-[#13111C] border-white/10 text-gray-300">
                                  <div className="text-[10px] font-mono">USR</div>
                                </div>
                              ) : (
                                <div className="flex-shrink-0">
                                  <AnimatedLogo size="small" />
                                </div>
                              )}
                              
                              <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[90%]`}>
                                <div className={`px-5 py-4 rounded-2xl text-[15px] leading-relaxed border shadow-sm ${
                                  msg.role === 'user' 
                                    ? 'bg-railway-accent/20 border-railway-accent/30 text-white rounded-tr-sm' 
                                    : 'bg-[#13111C]/80 border-white/10 text-white/90 backdrop-blur-sm'
                                }`}>
                                  <span className="font-serif text-[16px] md:text-lg leading-relaxed whitespace-pre-wrap">{msg.content}</span>
                                </div>
                                
                                {msg.sources?.length > 0 && (
                                  <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-3 flex flex-wrap gap-2 px-2"
                                  >
                                    <div className="w-full flex items-center gap-2 mb-1">
                                      <div className="h-px bg-white/10 flex-1"></div>
                                      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-mono">Verified Sources</span>
                                      <div className="h-px bg-white/10 flex-1"></div>
                                    </div>
                                    {msg.sources.map((s, idx) => (
                                      <motion.div 
                                        key={idx}
                                        whileHover={{ scale: 1.03 }}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-xs text-gray-400 hover:border-railway-accent/50 hover:bg-railway-accent/10 hover:text-railway-accent transition-all cursor-pointer group shadow-sm"
                                      >
                                        <FileText size={12} className="group-hover:text-railway-accent" />
                                        <span className="font-mono">{s.filename || s.title} <span className="opacity-50">p.{s.page}</span></span>
                                        <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </motion.div>
                                    ))}
                                  </motion.div>
                                )}
                              </div>
                            </motion.div>
                          ))
                        )}
                      </AnimatePresence>

                      {isTyping && messages[messages.length - 1]?.role === 'user' && (
                        <div className="flex gap-3 md:gap-4 max-w-3xl mx-auto w-full">
                          <div className="flex-shrink-0 opacity-80">
                            <AnimatedLogo size="small" />
                          </div>
                          <div className="flex items-center gap-1.5 px-5 py-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-railway-accent animate-bounce" style={{ animationDelay: '0s' }}></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-railway-accent animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-railway-accent animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} className="h-4" />
                    </div>

                    <div className="p-4 lg:p-6 pt-2 lg:pt-4 bg-gradient-to-t from-[#0B0A10] via-[#0B0A10]/95 to-transparent relative z-20">
                      <div className="max-w-3xl mx-auto w-full">
                        <AnimatePresence>
                          {!hasInteracted && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="flex gap-2 mb-3 px-2 overflow-x-auto custom-scrollbar pb-2"
                            >
                              <span className="text-xs text-gray-500 font-mono flex items-center mr-2"><Sparkles size={12} className="mr-1" /> Try asking:</span>
                              {["How to request PTO?", "IT Security Policy"].map(suggestion => (
                                <button 
                                  key={suggestion}
                                  onClick={(e) => handleSend(e, suggestion)}
                                  className="whitespace-nowrap px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-gray-300 hover:bg-railway-accent/20 hover:text-white transition-colors"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <form 
                          onSubmit={(e) => handleSend(e)}
                          className="relative flex items-center bg-[#13111C]/90 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] focus-within:border-railway-accent/50 focus-within:shadow-[0_0_20px_rgba(110,86,207,0.2)] transition-all duration-500"
                        >
                          <input 
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about corporate policies, procedures..." 
                            className="w-full bg-transparent border-none outline-none px-4 py-3.5 text-[15px] placeholder:text-gray-500 font-sans text-white"
                            disabled={isTyping}
                          />
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="submit"
                            disabled={!input.trim() || isTyping}
                            className="p-3 bg-white hover:bg-gray-200 disabled:opacity-50 disabled:bg-white/10 disabled:text-gray-500 text-[#0B0A10] rounded-xl transition-colors duration-300 mr-1 shadow-md"
                          >
                            <Send size={18} />
                          </motion.button>
                        </form>
                      </div>
                    </div>
                  </div>

                  {/* Right Context Panel (Desktop Only) */}
                  <aside className="hidden xl:flex w-80 border-l border-white/10 bg-[#13111C]/40 backdrop-blur-md flex-col overflow-y-auto custom-scrollbar">
                    <div className="p-6 border-b border-white/10">
                      <h3 className="text-sm font-medium text-white flex items-center gap-2">
                        <Activity size={16} className="text-railway-accent" /> System Context
                      </h3>
                    </div>
                    <div className="p-6 space-y-8">
                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Model Engine</div>
                        <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400">LLM</span>
                            <span className="text-sm font-medium text-white">Gemini Pro</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400">Embeddings</span>
                            <span className="text-sm font-medium text-white">text-embedding-004</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400">Response</span>
                            <span className="text-sm font-medium text-emerald-400 flex items-center gap-1"><Zap size={12}/> SSE Streaming</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Indexed Documents</div>
                        <div className="space-y-2">
                          {indexedDocs.length > 0 ? indexedDocs.map((doc, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5 hover:border-railway-accent/30 transition-colors cursor-pointer group">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <FileText size={14} className="text-gray-400 group-hover:text-railway-accent flex-shrink-0" />
                                <span className="text-xs text-gray-300 truncate font-mono">{doc.name}</span>
                              </div>
                              <ChevronRight size={14} className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )) : (
                            <div className="text-xs text-gray-500 italic p-4 text-center border border-dashed border-white/10 rounded-lg">
                              No documents indexed yet.
                            </div>
                          )}
                        </div>
                        <button onClick={() => setCurrentView('admin')} className="mt-3 text-xs text-railway-accent hover:text-white transition-colors flex items-center gap-1">
                          Manage knowledge base <ArrowRight size={10} />
                        </button>
                      </div>
                    </div>
                  </aside>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 lg:p-10 relative z-10 custom-scrollbar">
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-4xl mx-auto w-full space-y-10"
                  >
                    <div className="space-y-3 mt-4 md:mt-0 pb-6 border-b border-white/10">
                      <h2 className="text-3xl font-serif text-white font-medium">Knowledge Base Ingestion</h2>
                      <p className="text-gray-400 text-sm">Upload standard operating procedure PDFs to parse, chunk, and embed into the MongoDB Atlas vector database.</p>
                    </div>

                    <motion.div 
                      whileHover={{ scale: 1.01 }}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                      onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e); }}
                      className={`relative border-2 border-dashed rounded-2xl p-10 md:p-16 text-center transition-all duration-500 bg-[#13111C]/50 backdrop-blur-sm ${isDragging ? 'border-railway-accent bg-railway-accent/10 shadow-[0_0_40px_rgba(110,86,207,0.3)]' : 'border-white/10 hover:border-railway-accent/50 hover:bg-[#13111C]/80'}`}
                    >
                      <input 
                        type="file" 
                        multiple 
                        accept="application/pdf"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center gap-5">
                        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner relative">
                          {isDragging && <div className="absolute inset-0 rounded-full bg-railway-accent/20 animate-ping"></div>}
                          <UploadCloud size={32} className={isDragging ? 'text-railway-accent animate-bounce' : 'text-gray-400'} />
                        </div>
                        <div>
                          <p className="text-white font-medium mb-1 text-lg">Drag and drop PDF files here</p>
                          <p className="text-gray-500 text-sm">or click to browse from your computer</p>
                        </div>
                      </div>
                    </motion.div>

                    {uploadedFiles.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.6 }}
                        className="bg-[#13111C]/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-xl"
                      >
                        <div className="px-6 py-5 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 bg-white/5">
                          <h3 className="font-medium text-sm text-white flex items-center gap-2">
                            <Database size={16} className="text-railway-accent" />
                            Files queued for ingestion ({uploadedFiles.length})
                          </h3>
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={processFiles}
                            className="w-full sm:w-auto px-5 py-2.5 bg-white text-[#0B0A10] hover:bg-gray-200 rounded-lg text-sm font-bold transition-colors shadow-lg flex items-center justify-center gap-2"
                          >
                            Process & Index <Zap size={14} />
                          </motion.button>
                        </div>
                        <ul className="divide-y divide-white/5">
                          {uploadedFiles.map((file, idx) => (
                            <motion.li 
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.15, duration: 0.5 }}
                              key={idx} 
                              className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between group hover:bg-white/5 transition-colors gap-3 sm:gap-0"
                            >
                              <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className="w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                  <FileText size={18} className="text-gray-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-white font-mono truncate">{file.name}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{file.size}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 self-end sm:self-auto mt-2 sm:mt-0">
                                {file.status === 'ready' && <span className="text-[10px] sm:text-xs font-mono text-yellow-400 bg-yellow-400/10 px-2.5 py-1.5 rounded border border-yellow-400/20 whitespace-nowrap">Pending</span>}
                                {file.status === 'processing' && (
                                  <span className="text-[10px] sm:text-xs font-mono text-railway-accent bg-railway-accent/10 px-2.5 py-1.5 rounded border border-railway-accent/20 flex items-center gap-2 whitespace-nowrap">
                                    <div className="w-3 h-3 border-2 border-railway-accent border-t-transparent rounded-full animate-spin"></div>
                                    Embedding...
                                  </span>
                                )}
                                {file.status === 'indexed' && <span className="text-[10px] sm:text-xs font-mono text-emerald-400 bg-emerald-400/10 px-2.5 py-1.5 rounded border border-emerald-400/20 whitespace-nowrap">Indexed</span>}
                                {file.status === 'error' && <span className="text-[10px] sm:text-xs font-mono text-red-400 bg-red-400/10 px-2.5 py-1.5 rounded border border-red-400/20 whitespace-nowrap">Error</span>}
                                
                                {file.status === 'ready' && (
                                  <button onClick={() => removeFile(idx)} className="text-gray-500 hover:text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all p-2 rounded hover:bg-white/5">
                                    <X size={16} />
                                  </button>
                                )}
                              </div>
                            </motion.li>
                          ))}
                        </ul>
                      </motion.div>
                    )}

                    <div className="space-y-6 mt-16 pt-10 border-t border-white/10">
                      <div className="space-y-1">
                        <h3 className="text-xl font-serif text-white font-medium flex items-center gap-2">
                          <Cpu size={20} className="text-railway-accent" /> System Persona Editor
                        </h3>
                        <p className="text-gray-400 text-xs">Define how the AI behaves, its personality, and strict adherence rules for SOP documents.</p>
                      </div>
                      
                      <div className="bg-[#13111C]/50 border border-white/10 rounded-2xl p-6 space-y-4">
                        <textarea 
                          value={systemPrompt}
                          onChange={(e) => setSystemPrompt(e.target.value)}
                          rows={8}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-gray-300 font-mono focus:border-railway-accent/50 outline-none transition-all custom-scrollbar"
                          placeholder="Enter system prompt instructions..."
                        />
                        <div className="flex justify-end">
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={updatePrompt}
                            className="px-6 py-2.5 bg-railway-accent text-white rounded-xl text-sm font-medium shadow-lg shadow-railway-accent/20 flex items-center gap-2"
                          >
                            <Save size={16} /> Save Changes
                          </motion.button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 mt-16 pt-10 border-t border-white/10">

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="text-xl font-serif text-white font-medium">Manage Knowledge Base</h3>
                          <p className="text-gray-400 text-xs">View and remove previously indexed Standard Operating Procedures.</p>
                        </div>
                        <button 
                          onClick={fetchDocs}
                          className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          title="Refresh Document List"
                        >
                          <RefreshCw size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatePresence>
                          {indexedDocs.length > 0 ? indexedDocs.map((doc, idx) => (
                            <motion.div 
                              key={doc.name}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="group relative bg-[#13111C]/50 border border-white/10 p-5 rounded-2xl hover:border-railway-accent/40 transition-all duration-300"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 group-hover:border-railway-accent/30 transition-colors">
                                    <FileText size={20} className="text-railway-accent" />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-medium text-white truncate max-w-[180px] font-mono">{doc.name}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                      <span className="text-[10px] text-gray-500 flex items-center gap-1 font-mono">
                                        <Database size={10} /> {doc.chunks} chunks
                                      </span>
                                      <span className="text-[10px] text-gray-500 flex items-center gap-1 font-mono">
                                        <Hash size={10} /> ~{doc.pages} pages
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => deleteDoc(doc.name)}
                                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                  title="Delete Document"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </motion.div>
                          )) : (
                            <div className="col-span-2 py-10 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                              <p className="text-sm text-gray-500 italic">No documents currently indexed in the knowledge base.</p>
                            </div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>

                </div>
              )}
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default App;

