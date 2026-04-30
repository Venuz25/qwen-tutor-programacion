import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import logoProgramacion from '../assets/programacion.png';
import { Plus, FileText, Code, X, Paperclip, StopCircle } from 'lucide-react';

// --- 1. AÑADIMOS isCompetitiveMode a las props ---
const ChatSection = ({ 
  activeChatId, setActiveChatId, onCreate, onChatUpdated, 
  compilerCode, compilerLanguage, compilerOutput, onRunCodeFromChat, onAutoFillCompiler,
  isCompetitiveMode 
}) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [welcomeInput, setWelcomeInput] = useState('');
  const [isThinking, setIsThinking] = useState(false); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [attachment, setAttachment] = useState(null);
  
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null); 
  const currentChatRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isThinking]);

  useEffect(() => {
    if (activeChatId !== currentChatRef.current) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setIsThinking(false); 
      setAttachment(null); 
      setIsMenuOpen(false);
      currentChatRef.current = activeChatId;

      if (activeChatId) {
        fetch(`http://localhost:5000/api/chats/${activeChatId}`)
          .then(res => res.json())
          .then(data => setMessages(data.messages || []))
          .catch(err => console.error("Error cargando chat:", err));
      } else {
        setMessages([]);
      }
    }
  }, [activeChatId]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachment({ name: file.name, content: `\n\n**[ARCHIVO: ${file.name}]**\n\`\`\`text\n${event.target.result}\n\`\`\`` });
    };
    reader.readAsText(file); 
    setIsMenuOpen(false);
  };

  const handleAttachCompiler = () => {
    if (!compilerCode) return;
    setAttachment({
      name: `Código del Compilador`,
      content: `\n\n**[CÓDIGO COMPILADOR]**\n\`\`\`${compilerLanguage}\n${compilerCode}\n\`\`\`\n**[CONSOLA]**\n\`\`\`text\n${compilerOutput || 'Ninguna'}\n\`\`\``
    });
    setIsMenuOpen(false);
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsThinking(false);
      setMessages(prev => [...prev, { role: 'assistant', content: '🛑 *Evaluación interrumpida por el usuario.*' }]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() && !attachment) return;
    if (!activeChatId) return;

    const finalContent = attachment ? `${input}\n${attachment.content}` : input;
    setMessages(prev => [...prev, { role: 'user', content: finalContent }]);
    setInput(''); setAttachment(null);
    
    abortControllerRef.current = new AbortController();
    setIsThinking(true);

    try {
      const response = await fetch(`http://localhost:5000/api/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // --- 2. ENVIAMOS EL MODO COMPETITIVO AL BACKEND ---
        body: JSON.stringify({ 
            role: 'user', 
            content: finalContent, 
            compilerCode, 
            compilerLanguage, 
            compilerOutput,
            isCompetitiveMode 
        }),
        signal: abortControllerRef.current.signal
      });
      let botReply = await response.json();
      
      const plantillaRegex = /<plantilla lenguaje="([^"]+)">([\s\S]*?)<\/plantilla>/i;
      const match = botReply.content.match(plantillaRegex);
      if (match) {
          onAutoFillCompiler(match[2].trim(), match[1]);
          botReply.content = botReply.content.replace(plantillaRegex, "\n\n🚀 *He colocado una plantilla inicial en tu compilador. ¡Complétala y ejecútala!*");
      }
      
      if (activeChatId === currentChatRef.current) {
        setMessages(prev => [...prev, botReply]);
        
        if (botReply.titulo_actualizado && onChatUpdated) {
            console.log("🔄 El backend reportó un nuevo título. Actualizando Sidebar...");
            onChatUpdated();
        }
      }
    } catch (error) {
      if (error.name !== 'AbortError') console.error(error);
    } finally {
      if (activeChatId === currentChatRef.current) setIsThinking(false);
    }
  };

  const startFirstChat = async () => {
    const hasContent = welcomeInput.trim() || attachment;
    const newChat = await onCreate();
    if (!newChat) return;

    currentChatRef.current = newChat._id; 
    
    if (!hasContent) {
       setWelcomeInput('');
       return; 
    }

    const finalContent = attachment ? `${welcomeInput}\n${attachment.content}` : welcomeInput;
    const userMessage = { role: 'user', content: finalContent };
    
    setMessages([...newChat.messages, userMessage]);
    setWelcomeInput('');
    setAttachment(null);
    
    abortControllerRef.current = new AbortController();
    setIsThinking(true);

    try {
      const response = await fetch(`http://localhost:5000/api/chats/${newChat._id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // --- 3. ENVIAMOS EL MODO COMPETITIVO TAMBIÉN EN EL PRIMER MENSAJE ---
          body: JSON.stringify({ 
              role: 'user', 
              content: finalContent, 
              compilerCode, 
              compilerLanguage, 
              compilerOutput,
              isCompetitiveMode 
          }),
          signal: abortControllerRef.current.signal
      });
      let botReply = await response.json();
      
      const plantillaRegex = /<plantilla lenguaje="([^"]+)">([\s\S]*?)<\/plantilla>/i;
      const match = botReply.content.match(plantillaRegex);
      if (match) {
          onAutoFillCompiler(match[2].trim(), match[1]);
          botReply.content = botReply.content.replace(plantillaRegex, "\n\n🚀 *He colocado una plantilla inicial en tu compilador. ¡Complétala y ejecútala!*");
      }

      setMessages(prev => [...prev, botReply]);
      
      if (botReply.titulo_actualizado && onChatUpdated) {
          console.log("🔄 El backend reportó un nuevo título en el primer chat. Actualizando Sidebar...");
          onChatUpdated();
      }
    } catch (error) {
      if (error.name !== 'AbortError') console.error(error);
    } finally {
      setIsThinking(false);
    }
  };

  if (!activeChatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center animate-fade-in bg-slate-900">
          <div className="space-y-2">
            <img src={logoProgramacion} alt="Logo Tutor" className="w-24 h-24 mb-2 object-contain justify-center mx-auto" />
            <h2 className="text-4xl font-bold text-white">¿Qué vamos a programar hoy?</h2>
            <p className="text-slate-400">Cuéntame tu duda y la resolveremos paso a paso.</p>
          </div>
          <div className="relative mt-8 w-full max-w-2xl">
              {attachment && (
                <div className="absolute -top-10 left-0 flex items-center gap-2 bg-slate-800 border border-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg text-sm">
                  <Paperclip size={14} />
                  <span className="truncate max-w-[200px]">{attachment.name}</span>
                  <button onClick={() => setAttachment(null)} className="hover:text-red-400 ml-2"><X size={14} /></button>
                </div>
              )}
              <div className="flex gap-2 relative items-center shadow-xl">
                <div className="relative">
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-3.5 bg-slate-800 text-slate-300 rounded-xl border border-slate-700 hover:bg-slate-700 hover:text-white transition">
                    <Plus size={20} className={`transform transition-transform ${isMenuOpen ? 'rotate-45' : 'rotate-0'}`}/>
                  </button>
                  {isMenuOpen && (
                    <div className="absolute bottom-full left-0 mb-3 w-56 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-50 text-left">
                      <label className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700 cursor-pointer text-sm text-slate-200 transition border-b border-slate-700/50">
                        <FileText size={16} className="text-blue-400" />
                        <span>Subir archivo</span>
                        <input type="file" accept=".txt,.js,.py,.cpp,.c,.java,.html,.css,.json" className="hidden" onChange={handleFileUpload} />
                      </label>
                      <button onClick={handleAttachCompiler} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 cursor-pointer text-sm text-slate-200 transition text-left">
                        <Code size={16} className="text-purple-400" />
                        <span>Adjuntar compilador actual</span>
                      </button>
                    </div>
                  )}
                </div>
                <input 
                  value={welcomeInput} onChange={(e) => setWelcomeInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && startFirstChat()}
                  placeholder="Ej: Tengo un error en mi script..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-3.5 text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={startFirstChat} disabled={isThinking} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl font-medium transition disabled:opacity-50">
                    Comenzar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs text-slate-500 py-10">
                <div className="p-3 border border-slate-800 rounded-xl">"No te daré el código, te daré el camino."</div>
                <div className="p-3 border border-slate-800 rounded-xl">"Aprender a pensar es aprender a programar."</div>
              </div>
          </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 relative">
      <div className="flex-1 overflow-y-auto space-y-6 p-6 md:px-20 custom-scrollbar pb-32">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl shadow-md ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    return !inline && match ? (
                      <div className="my-4 rounded-lg overflow-hidden border border-slate-700">
                        <div className="bg-slate-700 px-4 py-1.5 flex justify-between items-center text-xs text-slate-300 font-mono">
                          <span>{match[1]}</span>
                          {msg.role === 'assistant' && (
                            <button onClick={() => onRunCodeFromChat(codeString, match[1])} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded flex items-center gap-1.5 transition-colors shadow-md">
                              Ejecutar
                            </button>
                          )}
                        </div>
                        <SyntaxHighlighter style={atomDark} language={match[1]} PreTag="div" customStyle={{ margin: 0, padding: '1rem', fontSize: '0.85rem' }} {...props}>
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    ) : (<code className="bg-slate-700 px-1.5 py-0.5 rounded text-blue-300 font-mono text-sm" {...props}>{children}</code>);
                  }
                }}
              >
                {msg.content.replace(/```python(\w+)/g, '```python\n$1')}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        
        {isThinking && (
          <div className="flex justify-start items-center gap-3">
            <div className="bg-slate-800 p-4 rounded-2xl rounded-bl-none border border-slate-700 flex items-center space-x-2 w-16 h-[52px] shadow-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <button onClick={stopGeneration} className="text-slate-400 hover:text-red-400 transition flex items-center gap-1 text-sm bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
              <StopCircle size={16} /> Detener
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {attachment && (
            <div className="flex items-center gap-2 bg-slate-800 border border-blue-500/50 text-blue-400 px-3 py-1.5 rounded-lg w-max text-sm shadow-lg">
              <Paperclip size={14} />
              <span className="truncate max-w-[250px]">{attachment.name}</span>
              <button onClick={() => setAttachment(null)} className="hover:text-red-400 ml-2"><X size={14} /></button>
            </div>
          )}

          <div className="flex gap-2 relative items-center shadow-xl">
            <div className="relative">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-3 bg-slate-800 text-slate-300 rounded-xl border border-slate-700 hover:bg-slate-700 hover:text-white transition">
                <Plus size={20} className={`transform transition-transform ${isMenuOpen ? 'rotate-45' : 'rotate-0'}`}/>
              </button>
              {isMenuOpen && (
                <div className="absolute bottom-full left-0 mb-3 w-56 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-50 text-left">
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700 cursor-pointer text-sm text-slate-200 border-b border-slate-700/50 transition">
                    <FileText size={16} className="text-blue-400" />
                    <span>Subir archivo</span>
                    <input type="file" accept=".txt,.js,.py,.cpp,.c,.java,.html,.css,.json,.csv,.md" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <button onClick={handleAttachCompiler} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 text-sm text-slate-200 text-left transition">
                    <Code size={16} className="text-purple-400" />
                    <span>Adjuntar compilador</span>
                  </button>
                </div>
              )}
            </div>

            <input 
              value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isThinking} placeholder="Ej: Ayúdame a entender este código..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-5 py-3.5 text-sm text-white outline-none focus:border-blue-500"
            />
            <button onClick={sendMessage} disabled={isThinking || (!input.trim() && !attachment)} className="bg-blue-600 text-white px-6 py-3.5 rounded-xl hover:bg-blue-500 transition-all font-medium disabled:opacity-50 flex items-center gap-2">
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSection;