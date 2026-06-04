import { useState, useEffect } from 'react';
import axios from 'axios';
import { PanelRightOpen } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ChatSection from './components/ChatSection';
import CodeCompiler from './components/CodeCompiler';

const HELLO_WORLD = {
  python:     'print("Hola mundo")',
  javascript: 'console.log("Hola mundo");',
  cpp:        '#include <iostream>\n\nint main() {\n  std::cout << "Hola mundo" << std::endl;\n  return 0;\n}',
  java:       'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hola mundo");\n  }\n}',
  php:        '<?php\necho "Hola mundo\\n";\n?>',
  c:          '#include <stdio.h>\n\nint main() {\n  printf("Hola mundo\\n");\n  return 0;\n}',
};

function App() {
  const [isCompetitiveMode, setIsCompetitiveMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen]         = useState(true);
  const [isCompilerOpen, setIsCompilerOpen]       = useState(false);

  const [chats, setChats]               = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [compilerLanguage, setCompilerLanguage] = useState('python');
  const [compilerCode, setCompilerCode]         = useState(HELLO_WORLD.python);
  const [compilerOutput, setCompilerOutput]     = useState('');
  const [compilerRunTrigger, setCompilerRunTrigger] = useState(0);

  const fetchChats = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/chats');
      setChats(res.data);
      if (res.data.length > 0 && !activeChatId) setActiveChatId(res.data[0]._id);
    } catch (err) {
      console.error('Error al obtener chats:', err);
    } finally {
      setTimeout(() => setIsInitialLoading(false), 900);
    }
  };

  useEffect(() => { fetchChats(); }, []);

  const createNewChat = async () => {
    try {
      const res  = await fetch('http://localhost:5000/api/chats', { method: 'POST' });
      const chat = await res.json();
      setChats(prev => [chat, ...prev]);
      setActiveChatId(chat._id);
      return chat;
    } catch (err) {
      console.error('Error al crear chat:', err);
    }
  };

  const deleteChat = async (id) => {
    await fetch(`http://localhost:5000/api/chats/${id}`, { method: 'DELETE' });
    setChats(prev => prev.filter(c => c._id !== id));
    if (activeChatId === id) setActiveChatId(null);
  };

  const normalizeLanguage = (lang) => {
    const map = { js: 'javascript', py: 'python', 'c++': 'cpp' };
    const n = lang?.toLowerCase() || '';
    return map[n] || n;
  };

  const handleCompilerLanguageChange = (lang) => {
    const n = normalizeLanguage(lang);
    setCompilerLanguage(n);
    setCompilerCode(HELLO_WORLD[n] ?? '// Escribe tu código aquí...');
  };

  const handleAutoFillCompiler = (code, lang) => {
    const n = normalizeLanguage(lang);
    setCompilerCode(code);
    setCompilerLanguage(n);
    setIsCompilerOpen(true);
    
    setTimeout(() => {
      setCompilerRunTrigger(prev => prev + 1);
    }, 50);
  };

  /* ── Loading screen ── */
  if (isInitialLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-base)',
        fontFamily: 'var(--font-ui)',
        gap: 20,
      }}>
        {/* Animated logo */}
        <div style={{
          width: 60, height: 60, borderRadius: 18,
          background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fade-in 0.4s ease',
          boxShadow: '0 0 40px rgba(59,130,246,0.25)',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
        </div>

        <div className="spinner" />

        <p style={{
          fontSize: 14, color: 'var(--text-secondary)',
          letterSpacing: '0.04em',
          animation: 'fade-in 0.6s ease 0.2s both',
        }}>
          Conectando con el Tutor...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', height: '100vh', width: '100%',
      background: 'var(--bg-base)',
      overflow: 'hidden',
      fontFamily: 'var(--font-ui)',
    }}>
      <Sidebar
        isOpen={isSidebarOpen}     setIsOpen={setIsSidebarOpen}
        chats={chats}              setChats={setChats}
        activeChat={activeChatId}  onSelect={setActiveChatId}
        onCreate={createNewChat}   onDelete={deleteChat}
        isCompetitiveMode={isCompetitiveMode}
        setIsCompetitiveMode={setIsCompetitiveMode}
      />

      <main style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Chat */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ChatSection
            activeChatId={activeChatId}     setActiveChatId={setActiveChatId}
            onCreate={createNewChat}         onChatUpdated={fetchChats}
            compilerCode={compilerCode}      compilerLanguage={compilerLanguage}
            output={compilerOutput}          setOutput={setCompilerOutput}
            onRunCodeFromChat={handleAutoFillCompiler}
            onAutoFillCompiler={handleAutoFillCompiler}
            isCompetitiveMode={isCompetitiveMode}
          />
        </div>

        {/* Open compiler button */}
        {!isCompilerOpen && (
          <button
            onClick={() => setIsCompilerOpen(true)}
            data-tip="Abrir compilador"
            style={{
              position: 'absolute', right: 14, top: 14, zIndex: 10,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-md)',
              borderRadius: 9, padding: 8,
              cursor: 'pointer', color: 'var(--blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--blue)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border-md)'; }}
          >
            <PanelRightOpen size={18} />
          </button>
        )}

        {/* Compiler panel */}
        <div style={{
          width: isCompilerOpen ? '38%' : 0,
          transition: 'width 0.28s cubic-bezier(.4,0,.2,1)',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {isCompilerOpen && (
            <CodeCompiler
              onClose={() => setIsCompilerOpen(false)}
              code={compilerCode}             setCode={setCompilerCode}
              language={compilerLanguage}     onLanguageChange={handleCompilerLanguageChange}
              output={compilerOutput}         setOutput={setCompilerOutput}
              runTrigger={compilerRunTrigger}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;