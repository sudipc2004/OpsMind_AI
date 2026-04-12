import { useState } from 'react';

/**
 * SourceCitation — collapsible panel showing RAG source chunks.
 */
export default function SourceCitation({ sources }) {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-1 border border-[rgba(139,92,246,0.2)] rounded-sm overflow-hidden">
      <button
        className="w-full py-2 px-3 bg-[rgba(139,92,246,0.08)] text-brand-purple font-inter text-[0.75rem] font-semibold flex items-center justify-start gap-1.5 cursor-pointer text-left border-none transition-colors duration-220 hover:bg-[rgba(139,92,246,0.14)] tracking-[0.03em]"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{open ? '▾' : '▸'}</span>
        <span>
          {sources.length} Source{sources.length !== 1 ? 's' : ''} Referenced
        </span>
      </button>

      {open && (
        <div className="p-2.5 flex flex-col gap-1.5 bg-black/20">
          {sources.map((src, i) => (
            <div key={i} className="py-2.5 px-3 bg-bg-glass border border-border-subtle rounded-sm text-[0.76rem] leading-relaxed transition-colors duration-220 hover:border-[rgba(139,92,246,0.35)]">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-brand-purple font-mono text-[0.72rem]">
                  📋 {src.source} — p.{src.page}
                </span>
                <span className="text-[0.68rem] text-text-muted bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 rounded">
                  {src.score != null ? `${(src.score * 100).toFixed(1)}% match` : ''}
                </span>
              </div>
              <p className="text-text-secondary italic mt-1">{src.preview}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
