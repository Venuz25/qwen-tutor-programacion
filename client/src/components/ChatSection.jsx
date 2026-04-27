import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import logoProgramacion from '../assets/programacion.png';
import { Plus, FileText, Code, X, Paperclip } from 'lucide-react';

const ChatSection = ({ 
  activeChatId, onCreate, onChatUpdated, 
  compilerCode, compilerLanguage, compilerOutput, onRunCodeFromChat 
}) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [welcomeInput, setWelcomeInput] = useState('');
  const [isThinking, setIsThinking] = useState(false); 
  const messagesEndRef = useRef(null);

  // --- NUEVOS ESTADOS PARA ADJUNTOS ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [attachment, setAttachment] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, isThinking]);

  useEffect(() => {
    setIsThinking(false); 
    setAttachment(null); // Limpiamos el adjunto si cambia de chat
    setIsMenuOpen(false);

    if (activeChatId) {
      setMessages([]);
      fetch(`http://localhost:5000/api/chats/${activeChatId}`)
        .then(res => res.json())
        .then(data => setMessages(data.messages || []))
        .catch(err => console.error("Error al cargar:", err));
    } else {
      setMessages([]);
    }
  }, [activeChatId]);

  // --- FUNCIONES PARA MANEJAR ADJUNTOS ---
  const handleAttachCompiler = () => {
    if (!compilerCode || compilerCode === '// Escribe tu código aquí...') return;
    
    setAttachment({
      name: `Código del Compilador (${compilerLanguage})`,
      content: `\n\n**[CÓDIGO ADJUNTO POR EL USUARIO]**\n\`\`\`${compilerLanguage}\n${compilerCode}\n\`\`\`\n**[SALIDA DE LA CONSOLA]**\n\`\`\`text\n${compilerOutput || 'Sin salida'}\n\`\`\``
    });
    setIsMenuOpen(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachment({
        name: file.name,
        content: `\n\n**[ARCHIVO ADJUNTO: ${file.name}]**\n\`\`\`text\n${event.target.result}\n\`\`\``
      });
    };
    reader.readAsText(file);
    setIsMenuOpen(false);
  };

  // --- ENVÍO DE MENSAJES ---
  const sendMessage = async () => {
    if (!input.trim() && !attachment) return; // Permitir enviar solo archivo
    const chatEnviado = activeChatId; 
    
    // Concatenamos el texto del usuario con el contenido del archivo/código
    const finalContent = attachment ? `${input}\n${attachment.content}` : input;
    const userMessage = { role: 'user', content: finalContent };
    
    // Lo mostramos en la UI inmediatamente
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachment(null); // Limpiamos el adjunto tras enviar
    setIsThinking(true);

    try {
      const response = await fetch(`http://localhost:5000/api/chats/${chatEnviado}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content: finalContent })
      });
      const botReply = await response.json();
      
      if (chatEnviado === activeChatId) {
        setMessages(prev => [...prev, botReply]);
        if (botReply.titulo_actualizado && onChatUpdated) onChatUpdated();
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (chatEnviado === activeChatId) setIsThinking(false);
    }
  };

  const startFirstChat = async () => {
    if (!welcomeInput.trim() && !attachment) return;
    const newChat = await onCreate();    
    
    const finalContent = attachment ? `${welcomeInput}\n${attachment.content}` : welcomeInput;
    const userMessage = { role: 'user', content: finalContent };
    
    setMessages([...newChat.messages, userMessage]);
    setWelcomeInput('');
    setAttachment(null);
    setIsThinking(true);

    try {
      const response = await fetch(`http://localhost:5000/api/chats/${newChat._id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'user', content: finalContent })
      });
      const botReply = await response.json();
      setMessages([...newChat.messages, userMessage, botReply]);
      if (botReply.titulo_actualizado && onChatUpdated) onChatUpdated();
    } catch (error) {
      console.error(error);
    } finally {
      setIsThinking(false);
    }
  };

  if (!activeChatId) {
    return (
        <div className="flex-1 flex items-center justify-center bg-slate-900 p-10 text-center">
             <div className="max-w-2xl w-full space-y-8">
                <img src={logoProgramacion} alt="Logo" className="w-32 h-32 mx-auto mb-4" />
                <h2 className="text-4xl font-bold text-white">¿Qué vamos a programar hoy?</h2>
                <div className="relative mt-6">
                    {attachment && (
                      <div className="absolute -top-10 left-0 flex items-center gap-2 bg-slate-800 border border-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg text-sm">
                        <Paperclip size={14} />
                        <span className="truncate max-w-[200px]">{attachment.name}</span>
                        <button onClick={() => setAttachment(null)} className="hover:text-red-400 ml-2"><X size={14} /></button>
                      </div>
                    )}
                    <input 
                        value={welcomeInput} onChange={(e) => setWelcomeInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && startFirstChat()}
                        placeholder="Ej: Tengo un error en la consola..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute right-2 top-2 flex items-center gap-2">
                       {/* Botón de Menú de Adjuntos (Bienvenida) */}
                       <div className="relative">
                          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-400 hover:text-white bg-slate-700 rounded-xl transition">
                             <Plus size={20} />
                          </button>
                          {isMenuOpen && (
                             <div className="absolute bottom-full right-0 mb-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 text-left">
                                <label className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700 cursor-pointer text-sm text-slate-200 transition">
                                   <FileText size={16} className="text-blue-400"/>
                                   <span>Subir archivo (.txt, .js)</span>
                                   <input type="file" accept=".txt,.js,.py,.cpp,.c,.java,.html,.css,.json" className="hidden" onChange={handleFileUpload} />
                                </label>
                                <button onClick={handleAttachCompiler} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 cursor-pointer text-sm text-slate-200 transition">
                                   <Code size={16} className="text-purple-400"/>
                                   <span>Adjuntar compilador</span>
                                </button>
                             </div>
                          )}
                       </div>
                       <button onClick={startFirstChat} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl">Empezar</button>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="flex-1 overflow-y-auto space-y-6 p-6 md:px-20 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    return !inline && match ? (
                      <div className="my-4 rounded-lg overflow-hidden border border-slate-700">
                        {/* BOTÓN DE EJECUTAR CÓDIGO DE LA IA */}
                        <div className="bg-slate-700 px-4 py-1.5 flex justify-between items-center text-xs text-slate-300 font-mono">
                          <span>{match[1]}</span>
                          {msg.role === 'assistant' && (
                            <button 
                              onClick={() => onRunCodeFromChat(codeString, match[1])}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded flex items-center gap-1.5 transition-colors shadow-md"
                            >
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                              Ejecutar
                            </button>
                          )}
                        </div>
                        <SyntaxHighlighter
                          style={atomDark} language={match[1]} PreTag="div"
                          customStyle={{ margin: 0, padding: '1rem', fontSize: '0.85rem' }} {...props}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    ) : (<code className="bg-slate-700 px-1.5 py-0.5 rounded text-blue-300 font-mono text-xs" {...props}>{children}</code>);
                  },
                  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                }}
              >
                {msg.content.replace(/```python(\w+)/g, '```python\n$1')}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-slate-800 p-4 rounded-2xl rounded-bl-none border border-slate-700 flex items-center space-x-2 w-16 h-[52px]">
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* --- BARRA DE ENTRADA CON EL MENÚ + --- */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          
          {/* Indicador visual de que hay un archivo cargado */}
          {attachment && (
            <div className="flex items-center gap-2 bg-slate-800 border border-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg w-max text-sm transition-all">
              <Paperclip size={14} />
              <span className="truncate max-w-[250px]">{attachment.name}</span>
              <button onClick={() => setAttachment(null)} className="hover:text-red-400 ml-2 transition">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex gap-2 relative items-center">
            {/* El botón de "+" con su menú */}
            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className="p-3 bg-slate-800 text-slate-300 rounded-xl border border-slate-700 hover:bg-slate-700 hover:text-white transition"
              >
                <Plus size={20} className={`transform transition-transform ${isMenuOpen ? 'rotate-45' : 'rotate-0'}`}/>
              </button>
              
              {isMenuOpen && (
                <div className="absolute bottom-full left-0 mb-3 w-56 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-50">
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700 cursor-pointer text-sm text-slate-200 transition border-b border-slate-700/50">
                    <FileText size={16} className="text-blue-400" />
                    <span>Subir archivo (.txt, .js)</span>
                    <input type="file" accept=".txt,.js,.py,.cpp,.c,.java,.html,.css,.json" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <button onClick={handleAttachCompiler} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 cursor-pointer text-sm text-slate-200 transition text-left">
                    <Code size={16} className="text-purple-400" />
                    <span>Adjuntar compilador</span>
                  </button>
                </div>
              )}
            </div>

            <input 
              value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isThinking} placeholder="Escribe tu duda o indica qué quieres que revise..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button onClick={sendMessage} disabled={isThinking || (!input.trim() && !attachment)} className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-500 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              Enviar
            </button>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default ChatSection;