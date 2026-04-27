import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import logoProgramacion from '../assets/programacion.png';

// 1. Añadimos onChatUpdated en las props
const ChatSection = ({ activeChatId, onCreate, onChatUpdated }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [welcomeInput, setWelcomeInput] = useState('');
  const [isThinking, setIsThinking] = useState(false); 
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // 2. REGLA DE ORO: Si cambias de chat, deja de "pensar" y limpia la pantalla
  useEffect(() => {
    setIsThinking(false); 
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

  // Función para enviar mensajes
  const sendMessage = async () => {
    if (!input.trim() || !activeChatId) return;
    
    // 3. Guardamos el ID del chat actual para comparar cuando llegue la respuesta
    const chatEnviado = activeChatId; 
    const userMessage = { role: 'user', content: input };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    try {
      const response = await fetch(`http://localhost:5000/api/chats/${chatEnviado}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userMessage)
      });
      const botReply = await response.json();
      
      // 4. PROTECCIÓN: Solo agregamos el mensaje si el usuario NO cambió de chat
      if (chatEnviado === activeChatId) {
        setMessages(prev => [...prev, botReply]);
        
        // Refrescamos el título del sidebar si es necesario
        if (botReply.titulo_actualizado && onChatUpdated) {
          onChatUpdated();
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      // 5. Solo apagamos la animación si seguimos en el mismo chat
      if (chatEnviado === activeChatId) {
        setIsThinking(false);
      }
    }
  };

  // Lógica de bienvenida
  const startFirstChat = async () => {
    if (!welcomeInput.trim()) return;
    const newChat = await onCreate();    
    const userMessage = { role: 'user', content: welcomeInput };
    
    setMessages([...newChat.messages, userMessage]);
    setWelcomeInput('');
    setIsThinking(true);

    try {
      const response = await fetch(`http://localhost:5000/api/chats/${newChat._id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userMessage)
      });
      const botReply = await response.json();
      
      // Aquí estamos forzando a que se active el chat nuevo, así que mostramos todo
      setMessages([...newChat.messages, userMessage, botReply]);
      
      if (botReply.titulo_actualizado && onChatUpdated) {
        onChatUpdated();
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsThinking(false);
    }
  };

  if (!activeChatId) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 p-10 text-center">
            <div className="max-w-2xl w-full space-y-8">
                <img src={logoProgramacion} alt="Logo" className="w-32 h-32 mx-auto mb-4" />
                <h2 className="text-4xl font-bold text-white">¿Qué vamos a programar hoy?</h2>
                <div className="relative group mt-6">
                    <input 
                        value={welcomeInput}
                        onChange={(e) => setWelcomeInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && startFirstChat()}
                        placeholder="Ej: ¿Cómo funciona un bucle for?"
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={startFirstChat} className="absolute right-3 top-3 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-xl">
                        Comenzar
                    </button>
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
            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
              msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
            }`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div className="my-4 rounded-lg overflow-hidden border border-slate-700">
                        <div className="bg-slate-700 px-4 py-1 text-xs text-slate-300 font-mono">
                          {match[1]}
                        </div>
                        <SyntaxHighlighter
                          style={atomDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, padding: '1rem', fontSize: '0.85rem' }}
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className="bg-slate-700 px-1.5 py-0.5 rounded text-blue-300 font-mono text-xs" {...props}>
                        {children}
                      </code>
                    );
                  },
                  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc ml-5 mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal ml-5 mb-2">{children}</ol>,
                }}
              >
                {msg.content.replace(/```python(\w+)/g, '```python\n$1')}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 p-4 rounded-2xl rounded-bl-none border border-slate-700 flex items-center space-x-2 w-16 h-[52px]">
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Escribe tu duda..."
            disabled={isThinking}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button 
            onClick={sendMessage} 
            disabled={isThinking}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-500 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSection;