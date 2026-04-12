import SourceCitation from './SourceCitation';

/**
 * MessageBubble — renders a single chat message (user or AI).
 * Supports streaming text (isStreaming flag) and source citations.
 */
export default function MessageBubble({ message }) {
  const { role, content, sources, isStreaming, time } = message;
  const isAi = role === 'ai';

  // Render markdown-like formatting for AI messages
  const renderContent = (text) => {
    if (!text) {
      return isStreaming ? (
        <span className="text-text-muted italic opacity-60">Thinking...</span>
      ) : null;
    }

    // We do light markdown rendering without a library
    // Convert **bold**, `code`, ### headers, - bullets, > blockquote
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (/^### (.+)/.test(line)) {
        return <h3 key={i}>{line.replace(/^### /, '')}</h3>;
      }
      if (/^## (.+)/.test(line)) {
        return <h2 key={i}>{line.replace(/^## /, '')}</h2>;
      }
      if (/^# (.+)/.test(line)) {
        return <h1 key={i}>{line.replace(/^# /, '')}</h1>;
      }
      if (/^> (.+)/.test(line)) {
        return <blockquote key={i}>{line.replace(/^> /, '')}</blockquote>;
      }
      if (/^[-*] (.+)/.test(line)) {
        return <ul key={i}><li>{renderInline(line.replace(/^[-*] /, ''))}</li></ul>;
      }
      if (/^\d+\. (.+)/.test(line)) {
        return <ol key={i}><li>{renderInline(line.replace(/^\d+\. /, ''))}</li></ol>;
      }
      if (line.trim() === '') {
        return <br key={i} />;
      }
      return <p key={i} style={{ margin: '3px 0' }}>{renderInline(line)}</p>;
    });
  };

  const renderInline = (text) => {
    // Bold: **text**
    // Code: `text`
    const parts = [];
    const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      if (match[0].startsWith('**')) {
        parts.push(<strong key={match.index}>{match[2]}</strong>);
      } else if (match[0].startsWith('`')) {
        parts.push(<code key={match.index}>{match[3]}</code>);
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length === 0 ? text : parts;
  };

  return (
    <div className={`flex gap-3.5 animate-fade-in-up ${!isAi ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-[36px] h-[36px] rounded-[10px] flex items-center justify-center text-[1rem] shrink-0 mt-[2px] ${isAi ? 'bg-gradient-to-br from-brand-cyan to-brand-purple shadow-[0_0_16px_rgba(0,212,255,0.2)]' : 'bg-[rgba(139,92,246,0.2)] border border-[rgba(139,92,246,0.35)]'}`}>
        {isAi ? '🤖' : '👤'}
      </div>

      {/* Content */}
      <div className={`max-w-[72%] flex flex-col gap-2 ${!isAi ? 'items-end' : ''}`}>
        <div className={`px-4.5 py-3.5 text-[0.88rem] leading-[1.75] backdrop-blur-md ${isAi ? 'bg-bg-glass border border-border-subtle text-text-primary rounded-[14px_14px_14px_4px] prose-custom' : 'bg-gradient-to-br from-[rgba(0,212,255,0.15)] to-[rgba(139,92,246,0.15)] border border-[rgba(0,212,255,0.25)] text-text-primary rounded-[14px_14px_4px_14px]'}`}>
          {isAi ? renderContent(content) : content}
          {isStreaming && <span className="inline-block w-[2px] h-[1em] bg-brand-cyan ml-[2px] align-text-bottom animate-blink" />}
        </div>

        {/* Sources */}
        {isAi && sources && sources.length > 0 && (
          <SourceCitation sources={sources} />
        )}

        {/* Time */}
        {time && <span className="text-[0.68rem] text-text-muted px-1">{time}</span>}
      </div>
    </div>
  );
}
