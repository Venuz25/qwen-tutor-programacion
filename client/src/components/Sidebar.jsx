import { Plus, Trash2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen, chats, activeChat, onSelect, onCreate, onDelete }) => {
  return (
    <div className={`${isOpen ? 'w-64' : 'w-16'} transition-all duration-300 bg-slate-950 flex flex-col border-r border-slate-800 h-full`}>
      <div className="p-4 flex items-center justify-between">
        {isOpen && <h1 className="font-bold text-sm text-blue-400">MIS CHATS</h1>}
        <button onClick={() => setIsOpen(!isOpen)} className="p-1 hover:bg-slate-800 rounded text-slate-400">
          {isOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>
      </div>

      <div className="px-3">
        <button 
          onClick={onCreate}
          className={`flex items-center gap-2 w-full bg-slate-800 hover:bg-slate-700 transition-colors rounded-lg p-2 text-sm ${!isOpen && 'justify-center'}`}
        >
          <Plus size={18} />
          {isOpen && <span>Nuevo Tutor</span>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto mt-4 px-3 space-y-1">
        {chats.map((chat) => (
          <div 
            key={chat._id}
            onClick={() => onSelect(chat._id)}
            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer group transition-all ${
              activeChat === chat._id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="truncate text-sm">{isOpen ? chat.title : '•'}</span>
            </div>
            {isOpen && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(chat._id); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;