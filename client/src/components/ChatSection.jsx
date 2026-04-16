import { useState } from 'react';
import { Send } from 'lucide-react';

const ChatSection = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy tu tutor socrático. ¿En qué problema de programación estás trabajando hoy? Recuerda que no te daré la respuesta, pero te ayudaré a encontrarla.' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: 'user', content: input }]);
    // Aquí iría la llamada a tu API de Express
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Área de Mensajes */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
              msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200 border border-slate-700'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input de Texto */}
      <div className="p-4 border-t border-slate-800">
        <div className="relative max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escribe tu duda aquí..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 pr-12 focus:outline-none focus:border-blue-500 transition-all text-sm"
          />
          <button 
            onClick={handleSend}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSection;