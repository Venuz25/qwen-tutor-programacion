import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { Plus, FileText, Code, X, Paperclip, StopCircle, Send, Zap } from 'lucide-react';

const BADGE_MAP = {
  DEBUGGING:        { label: 'Debugging',    cls: 'badge-red' },
  COMPETITIVO:      { label: 'Competitivo',  cls: 'badge-amber' },
  NIVEL_CERO:       { label: 'Nivel básico', cls: 'badge-blue' },
  FRUSTRACION:      { label: 'Modo apoyo',   cls: 'badge-blue' },
  PETICION_DIRECTA: { label: 'Guiado',       cls: 'badge-emerald' },
};

const SUGGESTIONS = [
  { icon: '🐛', text: 'Tengo un error que no entiendo' },
  { icon: '📐', text: 'Explícame Big O notation' },
  { icon: '🏆', text: 'Dame un reto de programación' },
  { icon: '🔍', text: 'Revisa este código conmigo' },
];

const ChatSection = ({
  activeChatId, setActiveChatId, onCreate, onChatUpdated,
  compilerCode, compilerLanguage, output: compilerOutput,
  onRunCodeFromChat, onAutoFillCompiler, isCompetitiveMode,
}) => {
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [welcomeInput, setWelcomeInput] = useState('');
  const [isThinking, setIsThinking]   = useState(false);
  const [isMenuOpen, setIsMenuOpen]   = useState(false);
  const [attachment, setAttachment]   = useState(null);
  const [lastState, setLastState]     = useState(null);

  const messagesEndRef     = useRef(null);
  const abortControllerRef = useRef(null);
  const currentChatRef     = useRef(null);
  const inputRef           = useRef(null);
  const menuRef            = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Close menu on outside click
  useEffect(() => {
    const handler = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (activeChatId !== currentChatRef.current) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setIsThinking(false);
      setAttachment(null);
      setIsMenuOpen(false);
      setLastState(null);
      currentChatRef.current = activeChatId;

      if (activeChatId) {
        fetch(`http://localhost:5000/api/chats/${activeChatId}`)
          .then(r => r.json())
          .then(d => setMessages(d.messages || []))
          .catch(console.error);
      } else {
        setMessages([]);
      }
    }
  }, [activeChatId]);

  const handleFileUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setAttachment({
        name: file.name,
        content: `\n\n**[ARCHIVO: ${file.name}]**\n\`\`\`text\n${ev.target.result}\n\`\`\``,
      });
    };
    reader.readAsText(file);
    setIsMenuOpen(false);
  };

  const handleAttachCompiler = () => {
    if (!compilerCode) return;
    setAttachment({
      name: 'Código del compilador',
      content: `\n\n**[CÓDIGO COMPILADOR]**\n\`\`\`${compilerLanguage}\n${compilerCode}\n\`\`\`\n**[CONSOLA]**\n\`\`\`text\n${compilerOutput || 'Sin salida'}\n\`\`\``,
    });
    setIsMenuOpen(false);
  };

  const stopGeneration = () => {
    abortControllerRef.current?.abort();
    setIsThinking(false);
    setMessages(p => [...p, { role: 'assistant', content: '🛑 *Evaluación interrumpida.*' }]);
  };

  const sendMessage = async (overrideInput) => {
    const text = overrideInput ?? input;
    if (!text.trim() && !attachment) return;
    if (!activeChatId) return;

    const finalContent = attachment ? `${text}\n${attachment.content}` : text;
    setMessages(p => [...p, { role: 'user', content: finalContent }]);
    setInput('');
    setAttachment(null);

    abortControllerRef.current = new AbortController();
    setIsThinking(true);

    try {
      const res = await fetch(`http://localhost:5000/api/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user', content: finalContent,
          compilerCode, compilerLanguage, compilerOutput, isCompetitiveMode,
        }),
        signal: abortControllerRef.current.signal,
      });
      let botReply = await res.json();

      if (botReply.estado_detectado) setLastState(botReply.estado_detectado);

      const plantillaRegex = /<plantilla lenguaje="([^"]+)">([\s\S]*?)<\/plantilla>/i;
      const match = botReply.content.match(plantillaRegex);
      if (match) {
        onAutoFillCompiler(match[2].trim(), match[1]);
        botReply.content = botReply.content.replace(plantillaRegex, '\n\n🚀 *Plantilla inicial colocada en el compilador. ¡Complétala!*');
      }

      if (activeChatId === currentChatRef.current) {
        setMessages(p => [...p, botReply]);
        if (botReply.titulo_actualizado && onChatUpdated) onChatUpdated();
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err);
    } finally {
      if (activeChatId === currentChatRef.current) setIsThinking(false);
    }
  };

  const startFirstChat = async (overrideText) => {
    const text = overrideText ?? welcomeInput;
    const hasContent = text.trim() || attachment;
    const newChat = await onCreate();
    if (!newChat) return;

    currentChatRef.current = newChat._id;

    if (!hasContent) { setWelcomeInput(''); return; }

    const finalContent = attachment ? `${text}\n${attachment.content}` : text;
    setMessages([...newChat.messages, { role: 'user', content: finalContent }]);
    setWelcomeInput('');
    setAttachment(null);

    abortControllerRef.current = new AbortController();
    setIsThinking(true);

    try {
      const res = await fetch(`http://localhost:5000/api/chats/${newChat._id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user', content: finalContent,
          compilerCode, compilerLanguage, compilerOutput, isCompetitiveMode,
        }),
        signal: abortControllerRef.current.signal,
      });
      let botReply = await res.json();

      if (botReply.estado_detectado) setLastState(botReply.estado_detectado);

      const plantillaRegex = /<plantilla lenguaje="([^"]+)">([\s\S]*?)<\/plantilla>/i;
      const match = botReply.content.match(plantillaRegex);
      if (match) {
        onAutoFillCompiler(match[2].trim(), match[1]);
        botReply.content = botReply.content.replace(plantillaRegex, '\n\n🚀 *Plantilla inicial en el compilador. ¡Complétala!*');
      }
      setMessages(p => [...p, botReply]);
      if (botReply.titulo_actualizado && onChatUpdated) onChatUpdated();
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err);
    } finally {
      setIsThinking(false);
    }
  };

  /* ─────────────── Welcome screen ─────────────── */
  if (!activeChatId) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', background: 'var(--bg-base)',
        fontFamily: 'var(--font-ui)',
        animation: 'fade-up 0.4s ease both',
      }}>
        {/* Logo mark */}
        <div style={{
          width: 56, height: 56, borderRadius: 16, marginBottom: 20,
          background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px rgba(59,130,246,0.2)',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textAlign: 'center' }}>
          ¿Qué vamos a programar hoy?
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32, textAlign: 'center' }}>
          Cuéntame tu duda y la resolveremos paso a paso.
        </p>

        {/* Suggestions */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          width: '100%', maxWidth: 520, marginBottom: 20,
        }}>
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => startFirstChat(s.text)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 10, padding: '11px 14px',
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s',
                animation: `fade-up 0.3s ease ${i * 60}ms both`,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-md)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-surface)'; }}
            >
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{s.text}</span>
            </button>
          ))}
        </div>

        {/* Main input */}
        <div style={{ width: '100%', maxWidth: 520, position: 'relative' }}>
          {attachment && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: 8, padding: '5px 10px', marginBottom: 8, width: 'fit-content',
            }}>
              <Paperclip size={12} style={{ color: 'var(--blue)' }} />
              <span style={{ fontSize: 12, color: '#93c5fd', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {attachment.name}
              </span>
              <button onClick={() => setAttachment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={12} />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <AttachMenu isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} menuRef={menuRef} onFile={handleFileUpload} onCompiler={handleAttachCompiler} />
            <input
              ref={inputRef}
              value={welcomeInput}
              onChange={e => setWelcomeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startFirstChat()}
              placeholder="Ej: Tengo un error en mi script de Python..."
              className="input-field"
              style={{ flex: 1 }}
            />
            <button onClick={() => startFirstChat()} className="btn-base btn-primary" style={{ flexShrink: 0 }}>
              <Zap size={14} />
              Comenzar
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────── Chat view ─────────────── */
  const stateBadge = lastState ? BADGE_MAP[lastState] : null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-base)', position: 'relative',
      fontFamily: 'var(--font-ui)',
    }}>
      {/* ── Top bar (state badge) ── */}
      {stateBadge && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '8px 16px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)', flexShrink: 0,
          animation: 'fade-in 0.2s ease',
        }}>
          <span className={`badge ${stateBadge.cls}`}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
            {stateBadge.label}
          </span>
        </div>
      )}

      {/* ── Messages ── */}
      <div
        className="custom-scrollbar"
        style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {messages.map((msg, i) => (
          <MessageRow
            key={i}
            msg={msg}
            onRunCode={onRunCodeFromChat}
          />
        ))}

        {isThinking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, animation: 'fade-up 0.2s ease' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, borderBottomLeftRadius: 3,
              padding: '12px 16px',
            }}>
              <div className="thinking-dot" />
              <div className="thinking-dot" />
              <div className="thinking-dot" />
            </div>
            <button
              onClick={stopGeneration}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 7, padding: '5px 10px',
                color: '#fca5a5', fontSize: 12, cursor: 'pointer',
                fontFamily: 'var(--font-ui)', transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            >
              <StopCircle size={13} /> Detener
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar ── */}
      <div style={{
        padding: '12px 16px',
        background: 'linear-gradient(to top, var(--bg-base) 80%, transparent)',
        flexShrink: 0,
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {attachment && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8,
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
              borderRadius: 8, padding: '4px 10px',
            }}>
              <Paperclip size={12} style={{ color: 'var(--blue)' }} />
              <span style={{ fontSize: 12, color: '#93c5fd', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {attachment.name}
              </span>
              <button onClick={() => setAttachment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                <X size={12} />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <AttachMenu isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} menuRef={menuRef} onFile={handleFileUpload} onCompiler={handleAttachCompiler} />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isThinking && sendMessage()}
              disabled={isThinking}
              placeholder="Escribe tu mensaje..."
              className="input-field"
              style={{ flex: 1 }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isThinking || (!input.trim() && !attachment)}
              className="btn-base btn-primary"
              style={{ flexShrink: 0 }}
            >
              <Send size={14} />
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Attach menu ─── */
const AttachMenu = ({ isOpen, setIsOpen, menuRef, onFile, onCompiler }) => (
  <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
    <button
      onClick={() => setIsOpen(!isOpen)}
      style={{
        width: 38, height: 38, borderRadius: 9,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.15s',
        color: 'var(--text-secondary)',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <Plus size={16} style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
    </button>

    {isOpen && (
      <div style={{
        position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
        background: 'var(--bg-card)', border: '1px solid var(--border-md)',
        borderRadius: 10, overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        minWidth: 200, zIndex: 50,
        animation: 'fade-up 0.15s ease',
      }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 14px', cursor: 'pointer',
          borderBottom: '1px solid var(--border)',
          transition: 'background 0.12s',
          color: 'var(--text-secondary)', fontSize: 13,
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <FileText size={14} style={{ color: 'var(--blue)', flexShrink: 0 }} />
          <span style={{ color: 'var(--text-primary)' }}>Subir archivo</span>
          <input type="file" accept=".txt,.js,.py,.cpp,.c,.java,.html,.css,.json,.csv,.md" style={{ display: 'none' }} onChange={onFile} />
        </label>
        <button
          onClick={onCompiler}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 14px', width: '100%', textAlign: 'left',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: 13,
            transition: 'background 0.12s', fontFamily: 'var(--font-ui)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Code size={14} style={{ color: '#a78bfa', flexShrink: 0 }} />
          <span style={{ color: 'var(--text-primary)' }}>Adjuntar compilador</span>
        </button>
      </div>
    )}
  </div>
);

/* ─── Single message row ─── */
const MessageRow = ({ msg, onRunCode }) => {
  const isUser = msg.role === 'user';
  return (
    <div
      className="msg-row"
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 2,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
        </div>
      )}

      <div style={{
        maxWidth: '78%',
        background: isUser ? '#1d4ed8' : 'var(--bg-card)',
        border: `1px solid ${isUser ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
        borderRadius: 14,
        borderBottomRightRadius: isUser ? 3 : 14,
        borderBottomLeftRadius:  isUser ? 14 : 3,
        padding: '11px 15px',
        color: 'var(--text-primary)',
        fontSize: 14,
        lineHeight: 1.65,
      }}>
        {(() => {
          let cleanText = msg.content ? msg.content.trim() : '';
          
          // 1. Separar si el modelo escribe ```pythonPegado
          cleanText = cleanText.replace(/```python(\w+)/g, '```python\n$1');
          
          // 2. Si TODO el mensaje está envuelto en ``` (y no es python), lo destruimos
          if (cleanText.startsWith('```') && cleanText.endsWith('```')) {
            const firstLineBreak = cleanText.indexOf('\n');
            if (firstLineBreak !== -1) {
              const firstLine = cleanText.slice(0, firstLineBreak).toLowerCase();
              // Si la primera línea no dice "python", quitamos la envoltura
              if (!firstLine.includes('python')) {
                cleanText = cleanText.slice(firstLineBreak + 1, -3).trim();
              }
            }
          }

          return (
            <div style={{ width: '100%', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // --- CÓDIGO EJECUTABLE ---
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    
                    if (match && match[1] !== 'markdown') {
                      return (
                        <div style={{ margin: '14px 0', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(99,130,180,0.2)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#111827', borderBottom: '1px solid rgba(99,130,180,0.12)' }}>
                            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8', textTransform: 'uppercase' }}>
                              {match[1]}
                            </span>
                            {msg.role === 'assistant' && (
                              <button onClick={() => onRunCode(codeString, match[1])} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                                ▶ Ejecutar
                              </button>
                            )}
                          </div>
                          <SyntaxHighlighter
                            style={oneDark} language={match[1]} PreTag="div"
                            customStyle={{ margin: 0, padding: '16px', fontSize: '13px', background: '#0d1117' }} {...props}
                          >
                            {codeString}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }
                    
                    // --- VARIABLES O COMANDOS INLINE ---
                    return (
                      <code style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }} {...props}>
                        {children}
                      </code>
                    );
                  },
                  
                  // --- ESTILOS DE TEXTO, TÍTULOS Y LISTAS ---
                  h1(props) { return <h1 style={{ fontSize: '1.6em', fontWeight: 'bold', margin: '18px 0 10px', color: '#ffffff' }} {...props} /> },
                  h2(props) { return <h2 style={{ fontSize: '1.4em', fontWeight: 'bold', margin: '18px 0 10px', color: '#e2e8f0' }} {...props} /> },
                  h3(props) { return <h3 style={{ fontSize: '1.2em', fontWeight: 'bold', margin: '16px 0 8px', color: '#cbd5e1' }} {...props} /> },
                  p(props) { return <p style={{ margin: '0 0 12px', lineHeight: '1.7' }} {...props} /> },
                  ul(props) { return <ul style={{ paddingLeft: '24px', margin: '12px 0', listStyleType: 'disc' }} {...props} /> },
                  ol(props) { return <ol style={{ paddingLeft: '24px', margin: '12px 0', listStyleType: 'decimal' }} {...props} /> },
                  li(props) { return <li style={{ marginBottom: '6px', lineHeight: '1.7' }} {...props} /> },
                  strong(props) { return <strong style={{ fontWeight: 'bold', color: '#60a5fa' }} {...props} /> },
                  hr(props) { return <hr style={{ borderColor: 'rgba(99,130,180,0.2)', margin: '20px 0' }} {...props} /> },
                  
                  // --- ESTILOS DE TABLAS ---
                  table(props) { return <div style={{ overflowX: 'auto', margin: '16px 0', border: '1px solid rgba(99,130,180,0.2)', borderRadius: '8px' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }} {...props} /></div> },
                  thead(props) { return <thead style={{ background: 'rgba(99,130,180,0.15)' }} {...props} /> },
                  th(props) { return <th style={{ padding: '12px 16px', borderBottom: '2px solid rgba(99,130,180,0.2)', fontWeight: 'bold', color: '#e2e8f0' }} {...props} /> },
                  td(props) { return <td style={{ padding: '10px 16px', borderBottom: '1px solid rgba(99,130,180,0.1)', color: '#cbd5e1' }} {...props} /> },
                }}
              >
                {cleanText}
              </ReactMarkdown>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default ChatSection;