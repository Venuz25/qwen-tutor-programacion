import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { Plus, FileText, Code, X, Paperclip, StopCircle, Send, Zap } from 'lucide-react';
import { io } from 'socket.io-client';
import VizCard from '../viz/VizCard';
import { parseVizPayload } from '../viz/VizEngine';

const BADGE_MAP = {
  TUTOR_BASE: { label: 'Modo Tutor', cls: 'badge-blue' },
  RESTRINGIDO: { label: 'Práctica Guiada', cls: 'badge-emerald' },
  DEBUGGING: { label: 'Debugging', cls: 'badge-red' },
  COMPETITIVO: { label: 'Competitivo', cls: 'badge-amber' },
  REVISION: { label: 'Revisión de Código', cls: 'badge-violet' },
};

const SUGGESTIONS = [
  { icon: '🐛', text: 'Tengo un error que no entiendo' },
  { icon: '📐', text: 'Explícame Big O notation' },
  { icon: '🏆', text: 'Dame un reto de programación' },
  { icon: '🔍', text: 'Revisa este código conmigo' },
];

// Componente principal para gestionar la vista y el estado del chat actual
const ChatSection = ({
  activeChatId, setActiveChatId, onCreate, onChatUpdated,
  compilerCode, compilerLanguage, output: compilerOutput,
  onRunCodeFromChat, onAutoFillCompiler, isCompetitiveMode,
}) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [welcomeInput, setWelcomeInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [lastState, setLastState] = useState(null);

  const username = localStorage.getItem('tutor_username') || '';
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const currentChatRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const fetchActiveChat = async () => {
      if (activeChatId !== currentChatRef.current) {
        abortControllerRef.current?.abort();
        setIsThinking(false);
        setAttachment(null);
        setIsMenuOpen(false);

        const savedState = localStorage.getItem(`chat_state_${activeChatId}`);
        setLastState(savedState || null);
        currentChatRef.current = activeChatId;

        if (activeChatId) {
          try {
            const res = await fetch(`http://localhost:5000/api/chats/${activeChatId}`, {
              headers: { 'x-user': username }
            });
            const data = await res.json();
            setMessages(data.messages || []);
          } catch (err) {
            console.error(err);
          }
        } else {
          setMessages([]);
        }
      }
    };
    fetchActiveChat();
  }, [activeChatId, username]);

  useEffect(() => {
    socketRef.current = io('http://localhost:5000');
    socketRef.current.on('animation_ready', (gifUrl) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `**Visualización generada** \n\n![Animación](http://localhost:5000${gifUrl})`
        }
      ]);
    });
    return () => socketRef.current.disconnect();
  }, []);

  // Lee el archivo seleccionado y lo asigna como adjunto
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachment({
        name: file.name,
        content: `\n\n**[ARCHIVO: ${file.name}]**\n\`\`\`text\n${ev.target.result}\n\`\`\``,
      });
    };
    reader.readAsText(file);
    setIsMenuOpen(false);
  };

  // Adjunta el estado actual del compilador como parte del mensaje
  const handleAttachCompiler = () => {
    if (!compilerCode) return;
    setAttachment({
      name: 'Código del compilador',
      content: `\n\n**[CÓDIGO COMPILADOR]**\n\`\`\`${compilerLanguage}\n${compilerCode}\n\`\`\`\n**[CONSOLA]**\n\`\`\`text\n${compilerOutput || 'Sin salida'}\n\`\`\``,
    });
    setIsMenuOpen(false);
  };

  // Cancela la generación de respuesta en curso
  const stopGeneration = () => {
    abortControllerRef.current?.abort();
    setIsThinking(false);
    setMessages((p) => [...p, { role: 'assistant', content: '🛑 *Evaluación interrumpida.*' }]);
  };

  // Envía la petición al servidor y maneja la respuesta del asistente
  const processMessageRequest = async (chatId, finalContent) => {
    try {
      const res = await fetch(`http://localhost:5000/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user': username
        },
        body: JSON.stringify({
          role: 'user', content: finalContent,
          compilerCode, compilerLanguage, compilerOutput, isCompetitiveMode,
          estado_anterior: lastState || 'TUTOR_BASE'
        }),
        signal: abortControllerRef.current.signal,
      });

      const botReply = await res.json();

      if (botReply.estado_detectado) {
        setLastState(botReply.estado_detectado);
        localStorage.setItem(`chat_state_${chatId}`, botReply.estado_detectado);
      }

      const plantillaRegex = /<plantilla lenguaje="([^"]+)">([\s\S]*?)<\/plantilla>/i;
      const match = botReply.content.match(plantillaRegex);
      if (match) {
        onAutoFillCompiler(match[2].trim(), match[1]);
        botReply.content = botReply.content.replace(plantillaRegex, '\n\n🚀 *Plantilla inicial colocada en el compilador. ¡Complétala!*');
      }

      if (chatId === currentChatRef.current) {
        setMessages((p) => [...p, botReply]);
        if (botReply.titulo_actualizado && onChatUpdated) onChatUpdated();
      }
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err);
    } finally {
      if (chatId === currentChatRef.current) setIsThinking(false);
    }
  };

  // Envía un mensaje dentro de un chat existente
  const sendMessage = async (overrideInput) => {
    const text = overrideInput ?? input;
    if ((!text.trim() && !attachment) || !activeChatId) return;

    const finalContent = attachment ? `${text}\n${attachment.content}` : text;
    setMessages((p) => [...p, { role: 'user', content: finalContent }]);
    setInput('');
    setAttachment(null);

    abortControllerRef.current = new AbortController();
    setIsThinking(true);

    await processMessageRequest(activeChatId, finalContent);
  };

  // Crea un nuevo chat y envía el primer mensaje
  const startFirstChat = async (overrideText) => {
    const text = overrideText ?? welcomeInput;
    const hasContent = text.trim() || attachment;
    
    const newChat = await onCreate();
    if (!newChat) return;

    currentChatRef.current = newChat._id;

    if (!hasContent) {
      setWelcomeInput('');
      return;
    }

    const finalContent = attachment ? `${text}\n${attachment.content}` : text;
    setMessages([...newChat.messages, { role: 'user', content: finalContent }]);
    setWelcomeInput('');
    setAttachment(null);

    abortControllerRef.current = new AbortController();
    setIsThinking(true);

    await processMessageRequest(newChat._id, finalContent);
  };

  const stateBadge = lastState ? BADGE_MAP[lastState] : null;

  if (!activeChatId) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: 'var(--bg-base)', fontFamily: 'var(--font-ui)', animation: 'fade-up 0.4s ease both' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, marginBottom: 20, background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(59,130,246,0.2)' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
          </svg>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, textAlign: 'center' }}>¿Qué vamos a programar hoy?</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32, textAlign: 'center' }}>Cuéntame tu duda y la resolveremos paso a paso.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', maxWidth: 520, marginBottom: 20 }}>
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => startFirstChat(s.text)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', animation: `fade-up 0.3s ease ${i * 60}ms both` }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-md)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-surface)'; }}
            >
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{s.text}</span>
            </button>
          ))}
        </div>

        <div style={{ width: '100%', maxWidth: 520, position: 'relative' }}>
          {attachment && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, padding: '5px 10px', marginBottom: 8, width: 'fit-content' }}>
              <Paperclip size={12} style={{ color: 'var(--blue)' }} />
              <span style={{ fontSize: 12, color: '#93c5fd', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.name}</span>
              <button onClick={() => setAttachment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={12} /></button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <AttachMenu isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} menuRef={menuRef} onFile={handleFileUpload} onCompiler={handleAttachCompiler} />
            <textarea
              ref={inputRef}
              value={welcomeInput}
              onChange={(e) => {
                setWelcomeInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  startFirstChat();
                }
              }}
              placeholder="Ej: Tengo un error en mi script de Python..."
              className="input-field custom-scrollbar"
              rows={1}
              style={{ flex: 1, resize: 'none', overflowY: 'auto', minHeight: '42px', maxHeight: '150px', paddingTop: '10px', paddingBottom: '10px' }}
            />
            <button onClick={() => startFirstChat()} className="btn-base btn-primary" style={{ flexShrink: 0 }}>
              <Zap size={14} /> Comenzar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-base)', position: 'relative', fontFamily: 'var(--font-ui)' }}>
      {stateBadge && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0, animation: 'fade-in 0.2s ease' }}>
          <span className={`badge ${stateBadge.cls}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
            {stateBadge.label}
          </span>
        </div>
      )}

      <div id="tour-chat-area" className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((msg, i) => (
          <MessageRow key={i} msg={msg} onRunCode={onRunCodeFromChat} />
        ))}

        {isThinking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, animation: 'fade-up 0.2s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, borderBottomLeftRadius: 3, padding: '12px 16px' }}>
              <div className="thinking-dot" />
              <div className="thinking-dot" />
              <div className="thinking-dot" />
            </div>
            <button
              onClick={stopGeneration}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '5px 10px', color: '#fca5a5', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
            >
              <StopCircle size={13} /> Detener
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '12px 16px', background: 'linear-gradient(to top, var(--bg-base) 80%, transparent)', flexShrink: 0 }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {attachment && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, padding: '4px 10px' }}>
              <Paperclip size={12} style={{ color: 'var(--blue)' }} />
              <span style={{ fontSize: 12, color: '#93c5fd', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.name}</span>
              <button onClick={() => setAttachment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={12} /></button>
            </div>
          )}

          <div id="tour-chat-input" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <AttachMenu isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} menuRef={menuRef} onFile={handleFileUpload} onCompiler={handleAttachCompiler} />
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (!isThinking && (input.trim() || attachment)) sendMessage();
                }
              }}
              disabled={isThinking}
              placeholder="Escribe tu mensaje..."
              className="input-field custom-scrollbar"
              rows={1}
              style={{ flex: 1, resize: 'none', overflowY: 'auto', minHeight: '42px', maxHeight: '150px', paddingTop: '10px', paddingBottom: '10px' }}
            />
            <button onClick={() => sendMessage()} disabled={isThinking || (!input.trim() && !attachment)} className="btn-base btn-primary" style={{ flexShrink: 0 }}>
              <Send size={14} /> Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para adjuntar archivos y el estado del compilador
const AttachMenu = ({ isOpen, setIsOpen, menuRef, onFile, onCompiler }) => (
  <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
    <button
      onClick={() => setIsOpen(!isOpen)}
      style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', color: 'var(--text-secondary)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-md)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <Plus size={16} style={{ transform: isOpen ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
    </button>

    {isOpen && (
      <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, background: 'var(--bg-card)', border: '1px solid var(--border-md)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', minWidth: 200, zIndex: 50, animation: 'fade-up 0.15s ease' }}>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.12s', color: 'var(--text-secondary)', fontSize: 13 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <FileText size={14} style={{ color: 'var(--blue)', flexShrink: 0 }} />
          <span style={{ color: 'var(--text-primary)' }}>Subir archivo</span>
          <input type="file" accept=".txt,.js,.py,.cpp,.c,.java,.html,.css,.json,.csv,.md" style={{ display: 'none' }} onChange={onFile} />
        </label>
        <button
          onClick={onCompiler}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13, transition: 'background 0.12s', fontFamily: 'var(--font-ui)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Code size={14} style={{ color: '#a78bfa', flexShrink: 0 }} />
          <span style={{ color: 'var(--text-primary)' }}>Adjuntar compilador</span>
        </button>
      </div>
    )}
  </div>
);

// Renderiza un único mensaje (usuario o asistente) con soporte para Markdown y componentes interactivos
const MessageRow = ({ msg, onRunCode }) => {
  const isUser = msg.role === 'user';
  let cleanContent = (msg.content || '').trim();
  let vizPayload = null;

  if (!isUser) {
    vizPayload = parseVizPayload(cleanContent);
    if (vizPayload) {
      cleanContent = cleanContent.replace(/```viz\n([\s\S]*?)\n```/, '').trim();
    }
  }

  if (cleanContent.toLowerCase().startsWith('```markdown') && cleanContent.endsWith('```')) {
    cleanContent = cleanContent.substring(11, cleanContent.length - 3).trim();
  }

  return (
    <div className="msg-row" style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
      {!isUser && (
        <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
          </svg>
        </div>
      )}

      <div
        className={isUser ? 'whitespace-pre-wrap' : ''}
        style={{ maxWidth: '78%', background: isUser ? '#1d4ed8' : 'var(--bg-card)', border: `1px solid ${isUser ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`, borderRadius: 14, borderBottomRightRadius: isUser ? 3 : 14, borderBottomLeftRadius: isUser ? 14 : 3, padding: '11px 15px', color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.65 }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const codeString = String(children).replace(/\n$/, '');
              const lang = match ? match[1].toLowerCase() : 'text';
              const isExecutable = ['python', 'javascript', 'js', 'cpp', 'c', 'c++', 'java', 'php'].includes(lang);

              if (!inline && (match || codeString.includes('\n'))) {
                return (
                  <div style={{ margin: '10px 0', borderRadius: 9, overflow: 'hidden', border: '1px solid rgba(99,130,180,0.18)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#111827', borderBottom: '1px solid rgba(99,130,180,0.12)' }}>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#64748b', textTransform: 'uppercase' }}>
                        {lang}
                      </span>
                      {msg.role === 'assistant' && isExecutable && (
                        <button onClick={() => onRunCode(codeString, lang)} className="code-run-btn">
                          ▶ Ejecutar
                        </button>
                      )}
                    </div>
                    <SyntaxHighlighter
                      style={oneDark}
                      language={lang}
                      PreTag="div"
                      customStyle={{ margin: 0, padding: '14px', fontSize: 12.5, fontFamily: 'JetBrains Mono, monospace', background: '#0d1117', lineHeight: 1.6 }}
                      {...props}
                    >
                      {codeString}
                    </SyntaxHighlighter>
                  </div>
                );
              }

              return (
                <code style={{ background: 'rgba(99,130,180,0.12)', border: '1px solid rgba(99,130,180,0.18)', padding: '1px 6px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: '0.88em', color: '#93c5fd' }} {...props}>
                  {children}
                </code>
              );
            },
            p: ({ children }) => <p style={{ margin: '0 0 8px', lineHeight: 1.65 }}>{children}</p>,
            ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: '6px 0', listStyleType: 'disc' }}>{children}</ul>,
            ol: ({ children }) => <ol style={{ paddingLeft: 18, margin: '6px 0', listStyleType: 'decimal' }}>{children}</ol>,
            li: ({ children }) => <li style={{ marginBottom: 3, lineHeight: 1.6 }}>{children}</li>,
            strong: ({ children }) => <strong style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{children}</strong>,
            h1: ({ children }) => <h1 style={{ fontSize: '1.4em', fontWeight: 700, margin: '12px 0 8px', color: 'var(--text-primary)' }}>{children}</h1>,
            h2: ({ children }) => <h2 style={{ fontSize: '1.2em', fontWeight: 600, margin: '10px 0 6px', color: 'var(--text-primary)' }}>{children}</h2>,
            h3: ({ children }) => <h3 style={{ fontSize: '1.05em', fontWeight: 600, margin: '8px 0 4px', color: 'var(--text-secondary)' }}>{children}</h3>,
            blockquote: ({ children }) => (
              <blockquote style={{ borderLeft: '3px solid var(--blue)', paddingLeft: 12, margin: '8px 0', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                {children}
              </blockquote>
            ),
            table: ({ children }) => (
              <div style={{ overflowX: 'auto', margin: '10px 0' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>{children}</table>
              </div>
            ),
            th: ({ children }) => <th style={{ padding: '6px 12px', background: 'rgba(99,130,180,0.15)', border: '1px solid rgba(99,130,180,0.2)', textAlign: 'left', fontWeight: 600 }}>{children}</th>,
            td: ({ children }) => <td style={{ padding: '6px 12px', border: '1px solid rgba(99,130,180,0.12)' }}>{children}</td>,
            hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />,
          }}
        >
          {cleanContent}
        </ReactMarkdown>

        {vizPayload && (
          <div style={{ marginTop: '12px' }}>
            <VizCard payload={vizPayload} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSection;