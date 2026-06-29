import { useState } from 'react';
import { MessageSquare, Trash2, Edit2, Check, X, PanelLeftClose, PanelLeftOpen, Plus, Trophy, GripVertical, User, LogOut } from 'lucide-react';

const STATE_BADGES = {
  DEBUGGING:        { label: 'Debug',      cls: 'badge-red' },
  COMPETITIVO:      { label: 'Competitivo', cls: 'badge-amber' },
  NIVEL_CERO:       { label: 'Básico',     cls: 'badge-blue' },
  FRUSTRACION:      { label: 'Apoyo',      cls: 'badge-blue' },
  PETICION_DIRECTA: { label: 'Guiado',     cls: 'badge-emerald' },
};

const Sidebar = ({
  isOpen, setIsOpen,
  chats, setChats,
  activeChat, onSelect, onCreate, onDelete,
  isCompetitiveMode, setIsCompetitiveMode,
  username, onLogout
}) => {
  const [editingId, setEditingId]   = useState(null);
  const [tempTitle, setTempTitle]   = useState('');
  const [hoveredId, setHoveredId]   = useState(null);
  const [draggingIdx, setDraggingIdx] = useState(null);

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('index', index);
    setDraggingIdx(index);
  };
  const handleDragEnd = () => setDraggingIdx(null);
  const handleDrop = (e, targetIndex) => {
    const sourceIndex = Number(e.dataTransfer.getData('index'));
    const newChats = [...chats];
    const [removed] = newChats.splice(sourceIndex, 1);
    newChats.splice(targetIndex, 0, removed);
    setChats(newChats);
    setDraggingIdx(null);
  };

  const saveTitle = async (id) => {
    if (!tempTitle.trim()) return setEditingId(null);
    
    await fetch(`http://localhost:5000/api/chats/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-user': username
      },
      body: JSON.stringify({ title: tempTitle }),
    });
    
    setChats(chats.map(c => c._id === id ? { ...c, title: tempTitle } : c));
    setEditingId(null);
  };

  return (
    <aside
      id="tour-sidebar"
      style={{
        width: isOpen ? '240px' : '60px',
        transition: 'width 0.25s cubic-bezier(.4,0,.2,1)',
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 20,
        fontFamily: 'var(--font-ui)',
      }}
    >
      {/* ── Logo / Toggle ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: isOpen ? 'space-between' : 'center',
        padding: '14px 12px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {isOpen && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, animation: 'fade-in 0.2s ease' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'linear-gradient(135deg, var(--blue) 0%, #6366f1 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>TutorByte</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>Tu tutor de programación</div>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          data-tip={isOpen ? 'Colapsar' : 'Expandir'}
          style={{
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 7, padding: 6, cursor: 'pointer',
            color: 'var(--text-secondary)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          {isOpen
            ? <PanelLeftClose size={16} />
            : <PanelLeftOpen size={16} />
          }
        </button>
      </div>

      {/* ── Action buttons ── */}
      <div style={{ padding: '10px 10px 6px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <button
          onClick={onCreate}
          data-tip={!isOpen ? 'Nuevo chat' : undefined}
          className="btn-base btn-primary"
          style={{ justifyContent: isOpen ? 'center' : 'center', width: '100%' }}
        >
          <Plus size={15} />
          {isOpen && <span>Nuevo chat</span>}
        </button>

        <button
          id="tour-judge"
          onClick={() => setIsCompetitiveMode(!isCompetitiveMode)}
          data-tip={!isOpen ? (isCompetitiveMode ? 'Modo juez: ON' : 'Modo juez: OFF') : undefined}
          style={{
            width: '100%', display: 'flex',
            alignItems: 'center', justifyContent: isOpen ? 'flex-start' : 'center',
            gap: 7, padding: '7px 10px',
            borderRadius: 8, cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500,
            transition: 'all 0.15s',
            border: `1px solid ${isCompetitiveMode ? 'rgba(245,158,11,0.35)' : 'var(--border)'}`,
            background: isCompetitiveMode ? 'rgba(245,158,11,0.1)' : 'transparent',
            color: isCompetitiveMode ? '#fcd34d' : 'var(--text-secondary)',
          }}
          onMouseEnter={e => !isCompetitiveMode && (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => !isCompetitiveMode && (e.currentTarget.style.background = 'transparent')}
        >
          <Trophy size={15} />
          {isOpen && <span>{isCompetitiveMode ? 'Juez: ON' : 'Juez: OFF'}</span>}
        </button>
      </div>

      {/* ── Section label ── */}
      {isOpen && (
        <div style={{
          padding: '10px 14px 4px',
          fontSize: 10, fontWeight: 600,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          Conversaciones
        </div>
      )}

      {/* ── Chat list ── */}
      <div
        className="custom-scrollbar"
        style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}
      >
        {chats.map((chat, i) => {
          const isActive  = activeChat === chat._id;
          const isHovered = hoveredId === chat._id;
          const isDragging = draggingIdx === i;

          return (
            <div
              key={chat._id}
              draggable
              onDragStart={e => handleDragStart(e, i)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, i)}
              onMouseEnter={() => setHoveredId(chat._id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelect(chat._id)}
              className="chat-item"
              style={{
                display: 'flex', alignItems: 'center',
                gap: 8, padding: isOpen ? '7px 8px' : '8px',
                borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                justifyContent: isOpen ? 'flex-start' : 'center',
                border: `1px solid ${isActive ? 'var(--border-md)' : 'transparent'}`,
                background: isActive ? 'var(--bg-card)' : isDragging ? 'var(--bg-hover)' : 'transparent',
                opacity: isDragging ? 0.5 : 1,
                transition: 'all 0.15s',
                position: 'relative',
              }}
              title={!isOpen ? chat.title : ''}
            >
              {/* Drag handle */}
              {isOpen && isHovered && editingId !== chat._id && (
                <GripVertical size={12} style={{ color: 'var(--text-muted)', flexShrink: 0, cursor: 'grab' }} />
              )}

              <MessageSquare
                size={15}
                style={{ color: isActive ? 'var(--blue)' : 'var(--text-muted)', flexShrink: 0 }}
              />

              {isOpen && (
                <>
                  {editingId === chat._id ? (
                    <div style={{ display: 'flex', flex: 1, gap: 4, alignItems: 'center' }}>
                      <input
                        autoFocus
                        value={tempTitle}
                        onChange={e => setTempTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveTitle(chat._id)}
                        style={{
                          flex: 1, background: 'var(--bg-base)',
                          border: '1px solid var(--blue)',
                          borderRadius: 5, padding: '2px 7px',
                          fontSize: 12, color: 'var(--text-primary)',
                          fontFamily: 'var(--font-ui)', outline: 'none',
                        }}
                      />
                      <Check
                        size={13}
                        style={{ color: 'var(--emerald)', cursor: 'pointer', flexShrink: 0 }}
                        onClick={e => { e.stopPropagation(); saveTitle(chat._id); }}
                      />
                      <X
                        size={13}
                        style={{ color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}
                        onClick={e => { e.stopPropagation(); setEditingId(null); }}
                      />
                    </div>
                  ) : (
                    <span style={{
                      flex: 1, fontSize: 13, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontWeight: isActive ? 500 : 400,
                    }}>
                      {chat.title}
                    </span>
                  )}

                  {/* Action icons on hover */}
                  {isHovered && editingId !== chat._id && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, animation: 'fade-in 0.15s ease' }}>
                      <Edit2
                        size={12}
                        style={{ color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.1s' }}
                        onClick={e => { e.stopPropagation(); setEditingId(chat._id); setTempTitle(chat.title); }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--blue)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      />
                      <Trash2
                        size={12}
                        style={{ color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.1s' }}
                        onClick={e => { e.stopPropagation(); onDelete(chat._id); }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {chats.length === 0 && isOpen && (
          <div style={{
            textAlign: 'center', padding: '24px 12px',
            color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6,
          }}>
            Aún no hay chats.<br />Crea uno para comenzar.
          </div>
        )}
      </div>

      <div style={{
        marginTop: 'auto', // Empuja la sección al fondo
        borderTop: '1px solid var(--border)',
        padding: isOpen ? '16px 20px' : '16px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isOpen ? 'space-between' : 'center',
        background: 'var(--bg-surface)'
      }}>
        {isOpen ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', background: 'var(--blue)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0
              }}>
                <User size={16} />
              </div>
              <span style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {username}
              </span>
            </div>
            
            <button 
              onClick={onLogout}
              title="Cerrar sesión"
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <LogOut size={18} />
            </button>
          </>
        ) : (
          /* Vista minificada del Sidebar (cuando está cerrado) */
          <button 
            onClick={onLogout}
            title="Cerrar sesión"
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '8px', transition: 'all 0.2s', borderRadius: '8px'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <LogOut size={20} />
          </button>
        )}
      </div>
      
    </aside>
  );
};

export default Sidebar;