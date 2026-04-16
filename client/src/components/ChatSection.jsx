import { useState, useEffect } from 'react';
import logoProgramacion from '../assets/programacion.png';

const ChatSection = ({ activeChatId, onCreate }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [welcomeInput, setWelcomeInput] = useState('');

  // Función para iniciar el primer chat desde la bienvenida
  const startFirstChat = async () => {
    if (!welcomeInput.trim()) return;
    
    const newChat = await onCreate();    
    const userMessage = { role: 'user', content: welcomeInput };
    await fetch(`http://localhost:5000/api/chats/${newChat._id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userMessage)
    });

    setMessages([...newChat.messages, userMessage]);
    setWelcomeInput('');
  };

  // Cargar mensajes al cambiar de chat
  useEffect(() => {
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

    const userMessage = { role: 'user', content: input };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      await fetch(`http://localhost:5000/api/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userMessage)
      });

      // Aquí irá la llamada a Qwen en el futuro

    } catch (error) {
      console.error("Error al guardar mensaje:", error);
    }
  };

  if (!activeChatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 p-26 text-center">
        <div className="max-w-2xl w-full space-y-8">
          <div className="space-y-2">
            <img 
              src={logoProgramacion} 
              alt="Logo Tutor" 
              className="w-24 h-24 mb-2 object-contain justify-center mx-auto" 
            />
            <h2 className="text-4xl font-bold text-white">¿Qué vamos a programar hoy?</h2>
            <p className="text-slate-400">Cuéntame tu duda y la resolveremos paso a paso.</p>
          </div>

          <div className="relative group">
            <input 
              value={welcomeInput}
              onChange={(e) => setWelcomeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && startFirstChat()}
              placeholder="Ej: ¿Cómo funciona un bucle for en C++?"
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-2xl"
            />
            <button 
              onClick={startFirstChat}
              className="absolute right-3 top-3 bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-xl transition-colors font-medium"
            >
              Comenzar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
            <div className="p-3 border border-slate-800 rounded-xl">"No te daré el código, te daré el camino."</div>
            <div className="p-3 border border-slate-800 rounded-xl">"Aprender a pensar es aprender a programar."</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="flex-1 overflow-y-auto space-y-4 p-15">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
              msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-slate-950 border-t border-slate-800">
        <div className="flex gap-2">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Escribe tu duda..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white outline-none"
          />
          <button onClick={sendMessage} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500">
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
};

// LA LÍNEA QUE FALTABA:
export default ChatSection;