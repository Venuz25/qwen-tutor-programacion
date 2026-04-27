import { useState, useEffect } from 'react';
import axios from 'axios';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ChatSection from './components/ChatSection';
import CodeCompiler from './components/CodeCompiler';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCompilerOpen, setIsCompilerOpen] = useState(false);

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);

  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Cargar lista de chats desde el backend
  const fetchChats = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/chats');
      setChats(res.data);
      if (res.data.length > 0 && !currentChat) {
        setCurrentChat(res.data[0]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => setIsInitialLoading(false), 1500);
    }
  };

  useEffect(() => {
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

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-4 bg-blue-500/20 rounded-full animate-pulse"></div>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent animate-pulse">
          Conectando con el Tutor Socrático
        </h1>
        <p className="mt-4 text-gray-400 text-sm">Inicializando entorno de desarrollo e Inteligencia Artificial...</p>
      </div>
    );
  }

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
          <ChatSection 
             activeChatId={activeChatId} 
             onCreate={createNewChat} 
             onChatUpdated={fetchChats} /* <--- ESTA ES LA LÍNEA CLAVE */
          />
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