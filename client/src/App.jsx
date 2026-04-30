import { useState, useEffect } from 'react';
import axios from 'axios';
import { PanelRightOpen } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ChatSection from './components/ChatSection';
import CodeCompiler from './components/CodeCompiler';

function App() {
  const [isCompetitiveMode, setIsCompetitiveMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCompilerOpen, setIsCompilerOpen] = useState(false);

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const helloWorldSnippets = {
    python: 'print("Hola mundo")',
    javascript: 'console.log("Hola mundo");',
    cpp: '#include <iostream>\n\nint main() {\n  std::cout << "Hola mundo" << std::endl;\n  return 0;\n}',
    java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hola mundo");\n  }\n}',
    php: '<?php\necho "Hola mundo\n";\n?>',
    c: '#include <stdio.h>\n\nint main() {\n  printf("Hola mundo\n");\n  return 0;\n}',
  };

  const [compilerLanguage, setCompilerLanguage] = useState('python');
  const [compilerCode, setCompilerCode] = useState(helloWorldSnippets.python);

  const fetchChats = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/chats');
      setChats(res.data);
      if (res.data.length > 0 && !activeChatId) setActiveChatId(res.data[0]._id);
    } catch (error) { 
      console.error("Error al obtener chats:", error); 
    } finally { 
      setTimeout(() => setIsInitialLoading(false), 1500); 
    }
  };

  useEffect(() => { fetchChats(); }, []);

  // --- LÓGICA DE CREACIÓN DE CHAT ---
  const createNewChat = async () => {
    try {
      console.log("🛠️ Solicitando creación de nuevo chat al servidor...");
      const res = await fetch('http://localhost:5000/api/chats', { method: 'POST' });
      const newChat = await res.json();
      
      console.log("✅ Chat creado con éxito:", newChat._id);
      
      setChats(prev => [newChat, ...prev]); 
      setActiveChatId(newChat._id);
      
      return newChat;
    } catch (error) { 
      console.error("❌ Error crítico al crear el chat:", error); 
    }
  };

  const deleteChat = async (id) => {
    await fetch(`http://localhost:5000/api/chats/${id}`, { method: 'DELETE' });
    setChats(prev => prev.filter(c => c._id !== id));
    if (activeChatId === id) setActiveChatId(null);
  };

  const normalizeLanguage = (lang) => {
    let normalized = lang?.toLowerCase() || '';
    if (normalized === 'js') normalized = 'javascript';
    if (normalized === 'py') normalized = 'python';
    if (normalized === 'c++') normalized = 'cpp';
    return normalized;
  };

  const getHelloWorldSnippet = (lang) => {
    return helloWorldSnippets[lang] ?? '// Escribe tu código aquí...';
  };

  const handleCompilerLanguageChange = (lang) => {
    const normalized = normalizeLanguage(lang);
    setCompilerLanguage(normalized);
    setCompilerCode(getHelloWorldSnippet(normalized));
  };

  const handleAutoFillCompiler = (code, lang) => {
    let normalized = normalizeLanguage(lang);
    setCompilerCode(code);
    setCompilerLanguage(normalized);
    setIsCompilerOpen(true);
  };

  const handleRunFromChat = (code, lang) => {
    handleAutoFillCompiler(code, lang);
  };

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h1 className="text-3xl font-bold text-blue-400 animate-pulse">Conectando con el Tutor...</h1>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-200 overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen}
        chats={chats} setChats={setChats} activeChat={activeChatId}
        onSelect={setActiveChatId} onCreate={createNewChat} onDelete={deleteChat}
        isCompetitiveMode={isCompetitiveMode} setIsCompetitiveMode={setIsCompetitiveMode} 
      />
      
      <main className="flex flex-1 overflow-hidden relative">
        <div className="flex-1">
          <ChatSection 
             activeChatId={activeChatId} setActiveChatId={setActiveChatId}
             onCreate={createNewChat} onChatUpdated={fetchChats}
             compilerCode={compilerCode} compilerLanguage={compilerLanguage} 
             compilerOutput={"La salida se gestiona en la consola interactiva."} // Dummy text para el contexto del IA
             onRunCodeFromChat={handleRunFromChat} onAutoFillCompiler={handleAutoFillCompiler}
             isCompetitiveMode={isCompetitiveMode}
          />
        </div>

        {!isCompilerOpen && (
          <button onClick={() => setIsCompilerOpen(true)} className="absolute right-4 top-4 z-10 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 shadow-xl">
            <PanelRightOpen size={20} className="text-blue-400" />
          </button>
        )}

        <div className={`${isCompilerOpen ? 'w-[35%]' : 'w-0'} transition-all duration-300 overflow-hidden border-l border-slate-700`}>
          <CodeCompiler 
            onClose={() => setIsCompilerOpen(false)} 
            code={compilerCode} setCode={setCompilerCode}
            language={compilerLanguage} onLanguageChange={handleCompilerLanguageChange}
          />
        </div>
      </main>
    </div>
  );
}

export default App;