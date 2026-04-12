import { useState, useRef, useEffect, useCallback } from 'react';
import MessageBubble from './MessageBubble';

const SUGGESTIONS = [
  '📋 What are the steps for equipment safety inspection?',
  '⚠️ What is the emergency shutdown procedure?',
  '🔧 How do I handle a chemical spill according to SOP?',
  '📝 What are the quality control checkpoints?',
];

const fmt = (d) =>
  d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * ChatWindow — main chat interface with SSE streaming.
 */
export default function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInput(e.target.value);
    const ta = textareaRef.current;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
  };

  const sendMessage = useCallback(async (query) => {
    const q = (query || input).trim();
    if (!q || streaming) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Add user message
    const userMsg = { id: Date.now(), role: 'user', content: q, time: fmt(new Date()) };
    setMessages((prev) => [...prev, userMsg]);

    // Add placeholder AI message
    const aiId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      { id: aiId, role: 'ai', content: '', isStreaming: true, sources: null, time: null },
    ]);

    setStreaming(true);

    try {
      const token = localStorage.getItem('opsmind_token');
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query: q, topK: 5 }),
      });

      if (!res.ok) {
        let errData = {};
        try {
          errData = await res.json();
        } catch (e) {
          // Fallback for non-JSON errors
        }
        throw new Error(errData.error || `Server error (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let finalSources = null;

      const processChunk = (raw) => {
        buffer += raw;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;

          let parsed;
          try {
            parsed = JSON.parse(dataStr);
          } catch {
            continue; // skip malformed events
          }

          const { type, content } = parsed;
          console.log(`[SSE] Received ${type}`);

          if (type === 'chunk') {
            accumulated += content;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId
                  ? { ...m, content: accumulated, isStreaming: true }
                  : m
              )
            );
          } else if (type === 'sources') {
            finalSources = content;
          } else if (type === 'done') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiId
                  ? {
                    ...m,
                    content: accumulated,
                    isStreaming: false,
                    sources: finalSources,
                    time: fmt(new Date()),
                  }
                  : m
              )
            );
          } else if (type === 'error') {
            throw new Error(content);
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        processChunk(decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId
            ? {
              ...m,
              content: `⚠️ ${err.message}`,
              isStreaming: false,
              time: fmt(new Date()),
            }
            : m
        )
      );
    } finally {
      setStreaming(false);
    }
  }, [input, streaming]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col overflow-hidden h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-10 py-8 flex flex-col gap-7 scroll-smooth">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-7 text-center p-10">
            <div className="w-[90px] h-[90px] rounded-full bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center text-[2.8rem] shadow-[0_0_60px_rgba(0,212,255,0.25),0_0_120px_rgba(139,92,246,0.15)] animate-orb-float relative after:content-[''] after:absolute after:-inset-2 after:rounded-full after:border after:border-[rgba(0,212,255,0.2)] after:animate-orb-ring">
              🤖
            </div>
            <div>
              <h1 className="text-[2rem] font-extrabold bg-gradient-to-br from-brand-cyan to-brand-purple text-transparent bg-clip-text tracking-tight">OpsMind AI</h1>
              <p className="text-[0.95rem] text-text-secondary max-w-[480px] leading-relaxed mx-auto mt-2">
                Your enterprise SOP assistant. Upload your procedure documents
                in the sidebar, then ask any question — I'll find precise,
                cited answers from your documents.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-[580px]">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className="px-4.5 py-3.5 bg-bg-glass border border-border-subtle rounded-md text-[0.82rem] text-text-secondary cursor-pointer transition-all duration-220 text-left leading-relaxed hover:border-brand-cyan hover:text-text-primary hover:bg-[rgba(0,212,255,0.06)] hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(0,212,255,0.1)]"
                  onClick={() => sendMessage(s.replace(/^[^\s]+ /, ''))}
                  id={`suggestion-${i}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </>
        )}

        {/* Typing indicator while waiting for first token */}
        {streaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex gap-3.5 animate-fade-in-up">
            <div className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center text-[1rem] shrink-0 mt-[2px] bg-gradient-to-br from-brand-cyan to-brand-purple shadow-[0_0_16px_rgba(0,212,255,0.2)]">
              🤖
            </div>
            <div className="flex items-center gap-[5px] px-4.5 py-3.5 bg-bg-glass border border-border-subtle rounded-[14px_14px_14px_4px] w-fit">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-typing-bounce" />
              <div className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-typing-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan opacity-60 animate-typing-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="px-10 py-5 bg-[rgba(8,12,20,0.85)] backdrop-blur-[20px] border-t border-border-subtle shrink-0">
        <div className="flex items-end gap-3 bg-bg-elevated border border-border-subtle rounded-[28px] py-2.5 pr-2.5 pl-5 transition-all duration-220 focus-within:border-border-active focus-within:shadow-[0_0_0_3px_rgba(0,212,255,0.06),0_0_30px_rgba(0,212,255,0.15)]">
          <textarea
            ref={textareaRef}
            id="chat-input"
            className="flex-1 bg-transparent border-none outline-none text-text-primary font-inter text-[0.9rem] leading-relaxed resize-none max-h-[180px] overflow-y-auto py-1 placeholder:text-text-muted"
            placeholder="Ask anything about your SOP documents… (Enter to send)"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={streaming}
          />
          <button
            id="send-btn"
            className="w-[42px] h-[42px] rounded-[14px] bg-gradient-to-br from-brand-cyan to-brand-purple border-none cursor-pointer flex items-center justify-center text-[1.1rem] shrink-0 transition-all duration-220 shadow-[0_2px_12px_rgba(0,212,255,0.2)] text-white hover:not-disabled:scale-105 hover:not-disabled:shadow-[0_4px_20px_rgba(0,212,255,0.35)] active:not-disabled:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-text-muted disabled:shadow-none"
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming}
            title="Send message"
          >
            {streaming ? '⏳' : '↑'}
          </button>
        </div>
        <p className="text-[0.7rem] text-text-muted text-center mt-2">
          Shift+Enter for new line · Powered by Gemini 2.5 Flash + MongoDB Atlas
        </p>
      </div>
    </div>
  );
}
