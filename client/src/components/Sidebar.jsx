import { useState } from 'react';
import { MessageSquare, Trash2, Edit2, Check, X, GripVertical, PanelLeftClose, PanelLeftOpen, Plus, Trophy } from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen, chats, setChats, activeChat, onSelect, onCreate, onDelete, isCompetitiveMode, setIsCompetitiveMode }) => {
  const [editingId, setEditingId] = useState(null);
  const [tempTitle, setTempTitle] = useState("");

  const handleDragStart = (e, index) => e.dataTransfer.setData("index", index);
  const handleDrop = (e, targetIndex) => {
    const sourceIndex = e.dataTransfer.getData("index");
    const newChats = [...chats];
    const [removed] = newChats.splice(sourceIndex, 1);
    newChats.splice(targetIndex, 0, removed);
    setChats(newChats);
  };

  const saveTitle = async (id) => {
    if (!tempTitle.trim()) return setEditingId(null);
    await fetch(`http://localhost:5000/api/chats/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: tempTitle })
    });
    setChats(chats.map(c => c._id === id ? { ...c, title: tempTitle } : c));
    setEditingId(null);
  };

  return (
    <div className={`${isOpen ? 'w-64' : 'w-16'} bg-slate-900 border-r border-slate-700 flex flex-col transition-all duration-300 flex-shrink-0 z-20`}>
      
      {/* HEADER DEL SIDEBAR CON BOTÓN DE TOGGLE */}
      <div className={`flex items-center p-4 border-b border-slate-800 ${isOpen ? 'justify-between' : 'justify-center'}`}>
        {isOpen && <span className="font-bold text-slate-200 tracking-wide text-sm">Tutor de Programación</span>}
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="text-slate-400 hover:text-white transition-colors p-1 bg-slate-800 hover:bg-slate-700 rounded-lg"
          title={isOpen ? "Ocultar panel" : "Mostrar panel"}
        >
          {isOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>
      </div>

      {/* ÁREA DE BOTONES PRINCIPALES */}
      <div className="p-3 space-y-2">
        <button 
          onClick={onCreate} 
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg text-white font-bold transition-all shadow-lg"
          title="Crear Nuevo Chat"
        >
          <Plus size={20} />
          {isOpen && <span>Nuevo Chat</span>}
        </button>

        {/* --- NUEVO: BOTÓN MODO COMPETITIVO --- */}
        <button 
          onClick={() => setIsCompetitiveMode(!isCompetitiveMode)}
          className={`w-full flex items-center ${isOpen ? 'justify-start px-4' : 'justify-center'} gap-2 py-2.5 rounded-lg text-xs font-bold transition-all shadow-md ${
            isCompetitiveMode 
              ? 'bg-amber-500 text-slate-900 hover:bg-amber-400' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
          title={isCompetitiveMode ? "Desactivar Modo Juez" : "Activar Modo Juez"}
        >
          <Trophy size={18} />
          {isOpen && <span>{isCompetitiveMode ? "MODO JUEZ: ON" : "MODO JUEZ: OFF"}</span>}
        </button>
      </div>

      {/* LISTA DE CHATS */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {chats.map((chat, i) => (
          <div 
            key={chat._id} 
            draggable 
            onDragStart={e => handleDragStart(e, i)} 
            onDragOver={e => e.preventDefault()} 
            onDrop={e => handleDrop(e, i)}
            className={`group flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
              activeChat === chat._id ? 'bg-slate-800 border border-slate-700' : 'hover:bg-slate-800/50 border border-transparent'
            } ${!isOpen ? 'justify-center' : ''}`}
            onClick={() => onSelect(chat._id)}
            title={!isOpen ? chat.title : ""} 
          >
            
            {/* VISTA COLAPSADA */}
            {!isOpen ? (
              <MessageSquare size={20} className={activeChat === chat._id ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"} />
            ) : (
              /* VISTA EXPANDIDA */
              <>
                <GripVertical size={14} className="text-slate-600 mr-2 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                
                {editingId === chat._id ? (
                  <div className="flex flex-1 gap-2 items-center">
                    <input 
                      autoFocus
                      value={tempTitle} 
                      onChange={e => setTempTitle(e.target.value)} 
                      onKeyDown={e => e.key === 'Enter' && saveTitle(chat._id)}
                      className="w-full bg-slate-700 rounded px-2 py-1 text-sm text-white outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <Check size={16} onClick={(e) => { e.stopPropagation(); saveTitle(chat._id); }} className="text-emerald-500 hover:text-emerald-400"/>
                  </div>
                ) : (
                  <div className="flex-1 truncate text-sm text-slate-300 select-none">{chat.title}</div>
                )}

                {/* BOTONES DE EDITAR Y BORRAR */}
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 ml-2">
                  <Edit2 size={14} onClick={e => { e.stopPropagation(); setEditingId(chat._id); setTempTitle(chat.title); }} className="text-slate-500 hover:text-blue-400 transition-colors"/>
                  <Trash2 size={14} onClick={e => { e.stopPropagation(); onDelete(chat._id); }} className="text-slate-500 hover:text-red-500 transition-colors"/>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;