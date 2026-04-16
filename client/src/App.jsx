import { useState, useEffect } from 'react'; // Agregamos useEffect aquí
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ChatSection from './components/ChatSection';
import CodeCompiler from './components/CodeCompiler';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCompilerOpen, setIsCompilerOpen] = useState(false);

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);

  // Cargar lista de chats desde el backend
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/chats');
        const data = await res.json();
        setChats(data);
      } catch (error) {
        console.error("Error al conectar con MongoDB:", error);
      }
    };
    fetchChats();
  }, []);

  // FUNCIONES DE MANEJO DE CHATS
  const createNewChat = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/chats', { method: 'POST' });
      const newChat = await res.json();
      setChats([newChat, ...chats]);
      setActiveChatId(newChat._id);

      return newChat;
    } catch (error) {
      console.error("No se pudo crear el chat:", error);
    }
  };

  const deleteChat = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/chats/${id}`, { method: 'DELETE' });
      setChats(chats.filter(c => c._id !== id));
      if (activeChatId === id) setActiveChatId(null);
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-200 overflow-hidden font-sans">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        chats={chats}
        activeChat={activeChatId}
        onSelect={setActiveChatId}
        onCreate={createNewChat}
        onDelete={deleteChat}
      />
      
      <main className="flex flex-1 overflow-hidden relative">
        <div className="flex-1">
          <ChatSection activeChatId={activeChatId} onCreate={createNewChat} />
        </div>

        {/* Botón flotante para abrir el compilador */}
        {!isCompilerOpen && (
          <button 
            onClick={() => setIsCompilerOpen(true)}
            className="absolute right-4 top-4 z-10 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 shadow-xl"
            title="Abrir Compilador"
          >
            <PanelRightOpen size={20} className="text-blue-400" />
          </button>
        )}

        {/* Sección del Compilador */}
        <div className={`${
          isCompilerOpen ? 'w-[35%]' : 'w-0'
        } transition-all duration-300 overflow-hidden`}>
          <CodeCompiler 
            onClose={() => setIsCompilerOpen(false)} 
          />
        </div>
      </main>
    </div>
  );
}

export default App;