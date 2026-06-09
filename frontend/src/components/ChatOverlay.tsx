import React, { useState, useRef, useEffect } from 'react';

interface Props {
  contractText: string;
  suggestedQuestions: string[];
  apiUrl: string;
}

export default function ChatOverlay({ contractText, suggestedQuestions, apiUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_text: contractText, messages: next }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Failed to get a response. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <div className="chat-panel-title">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 9.5C1 10.33 1.67 11 2.5 11H4l3 2 3-2h1.5c.83 0 1.5-.67 1.5-1.5v-7C13 1.67 12.33 1 11.5 1h-9C1.67 1 1 1.67 1 2.5v7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
              </svg>
              Ask Claude
            </div>
            <button className="chat-panel-close" onClick={() => setOpen(false)}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <div className="chat-panel-body">
            {messages.length === 0 ? (
              <div className="chat-chips">
                {suggestedQuestions.map((q, i) => (
                  <button key={i} className="chat-chip" onClick={() => send(q)}>{q}</button>
                ))}
              </div>
            ) : (
              <div className="chat-messages">
                {messages.map((m, i) => (
                  <div key={i} className={m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}>
                    {m.content}
                  </div>
                ))}
                {loading && (
                  <div className="chat-bubble-assistant chat-bubble-loading">
                    <span className="spinner spinner--sm" />
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="chat-input-row">
            <input
              ref={inputRef}
              className="chat-input"
              placeholder="Ask about this contract…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              disabled={loading}
            />
            <button
              className="chat-send-btn"
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <button
        className={`chat-fab${open ? ' chat-fab--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Ask Claude about this contract"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 2l14 14M16 2L2 16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M1.5 12C1.5 13.1 2.4 14 3.5 14H6l3 3 3-3h2.5c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2h-13C2.4 2 1.5 2.9 1.5 4v8z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
            <circle cx="6" cy="9" r="1" fill="white"/>
            <circle cx="9" cy="9" r="1" fill="white"/>
            <circle cx="12" cy="9" r="1" fill="white"/>
          </svg>
        )}
      </button>
    </>
  );
}
