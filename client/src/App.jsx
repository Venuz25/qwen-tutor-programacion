import { useState } from 'react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ChatSection from './components/ChatSection';
import CodeCompiler from './components/CodeCompiler';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCompilerOpen, setIsCompilerOpen] = useState(true);
  const [chats, setChats] = useState([{ id: 1, title: 'Ejercicios de Bucles' }]);
  const [activeChat, setActiveChat] = useState(1);

  const createChat = () => {
    const newChat = { id: Date.now(), title: `Nuevo Chat ${chats.length + 1}` };
    setChats([newChat, ...chats]);
    setActiveChat(newChat.id);
  };

  const deleteChat = (id) => {
    setChats(chats.filter(c => c.id !== id));
    if (activeChat === id) setActiveChat(null);
  };

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-200 overflow-hidden font-sans">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        chats={chats}
        activeChat={activeChat}
        onSelect={setActiveChat}
        onCreate={createChat}
        onDelete={deleteChat}
      />
      
      <main className="flex flex-1 overflow-hidden relative">
        <div className="flex-1">
          <ChatSection />
        </div>

        {/* Botón flotante para abrir el compilador cuando está cerrado */}
        {!isCompilerOpen && (
          <button 
            onClick={() => setIsCompilerOpen(true)}
            className="absolute right-4 top-4 z-10 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 shadow-xl"
            title="Abrir Compilador"
          >
            <PanelRightOpen size={20} className="text-blue-400" />
          </button>
        )}

        {/* Sección del Compilador con transición */}
        <div className={`${
          isCompilerOpen ? 'w-[45%]' : 'w-0'
        } transition-all duration-300 overflow-hidden lg:block`}>
          <CodeCompiler 
            onClose={() => setIsCompilerOpen(false)} 
          />
        </div>
      </main>
    </div>
  );
}

export default App;