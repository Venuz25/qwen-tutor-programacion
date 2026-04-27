import { useState, useEffect } from 'react';
import axios from 'axios';
import { PanelRightOpen } from 'lucide-react';
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

  // --- NUEVOS ESTADOS COMPARTIDOS DEL COMPILADOR ---
  const [compilerCode, setCompilerCode] = useState('// Escribe tu código aquí...');
  const [compilerLanguage, setCompilerLanguage] = useState('python');
  const [compilerOutput, setCompilerOutput] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);

  // --- LÓGICA DE EJECUCIÓN (Movida aquí para compartirla) ---
  const executeCode = async (codeToRun, langToRun) => {
    setIsCompiling(true);
    setCompilerOutput("Ejecutando...");
    setIsCompilerOpen(true); // Abrimos panel si estaba cerrado

    try {
      const res = await axios.post('http://localhost:5000/api/execute', {
        content: codeToRun,
        language: langToRun
      });
      setCompilerOutput(res.data.run.output);
    } catch (error) {
      setCompilerOutput(error.response?.data?.error || "Error de ejecución.");
    } finally {
      setIsCompiling(false);
    }
  };

  // Puente para el botón "Ejecutar" desde el chat
  const handleRunFromChat = (code, lang) => {
    let normalizedLang = lang.toLowerCase();
    if (normalizedLang === 'js') normalizedLang = 'javascript';
    if (normalizedLang === 'py') normalizedLang = 'python';
    if (normalizedLang === 'c++') normalizedLang = 'cpp';

    setCompilerCode(code);
    setCompilerLanguage(normalizedLang);
    executeCode(code, normalizedLang);
  };

  // Cargar lista de chats
  const fetchChats = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/chats');
      setChats(res.data);
      if (res.data.length > 0 && !currentChat) setCurrentChat(res.data[0]);
    } catch (error) {
      console.error(error);
    } finally {
      setTimeout(() => setIsInitialLoading(false), 1500);
    }
  };

  useEffect(() => { fetchChats(); }, []);

  const createNewChat = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/chats', { method: 'POST' });
      const newChat = await res.json();
      setChats([newChat, ...chats]);
      setActiveChatId(newChat._id);
      return newChat;
    } catch (error) { console.error(error); }
  };

  const deleteChat = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/chats/${id}`, { method: 'DELETE' });
      setChats(chats.filter(c => c._id !== id));
      if (activeChatId === id) setActiveChatId(null);
    } catch (error) { console.error(error); }
  };

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h1 className="text-3xl font-bold text-blue-400 animate-pulse">Conectando con el Tutor...</h1>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-200 overflow-hidden font-sans">
      <Sidebar 
        isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen}
        chats={chats} activeChat={activeChatId}
        onSelect={setActiveChatId} onCreate={createNewChat} onDelete={deleteChat}
      />
      
      <main className="flex flex-1 overflow-hidden relative">
        <div className="flex-1">
          <ChatSection 
             activeChatId={activeChatId} 
             onCreate={createNewChat} 
             onChatUpdated={fetchChats}
             // Pasamos la info a ChatSection
             compilerCode={compilerCode}
             compilerLanguage={compilerLanguage}
             compilerOutput={compilerOutput}
             onRunCodeFromChat={handleRunFromChat}
          />
        </div>

        {!isCompilerOpen && (
          <button onClick={() => setIsCompilerOpen(true)} className="absolute right-4 top-4 z-10 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 shadow-xl">
            <PanelRightOpen size={20} className="text-blue-400" />
          </button>
        )}

        <div className={`${isCompilerOpen ? 'w-[35%]' : 'w-0'} transition-all duration-300 overflow-hidden`}>
          <CodeCompiler 
            onClose={() => setIsCompilerOpen(false)} 
            code={compilerCode} setCode={setCompilerCode}
            language={compilerLanguage} setLanguage={setCompilerLanguage}
            output={compilerOutput}
            isCompiling={isCompiling} executeCode={executeCode}
          />
        </div>
      </main>
    </div>
  );
}

export default App;