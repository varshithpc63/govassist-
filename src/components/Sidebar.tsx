import React from 'react';
import { ChevronLeft, Plus, MessageSquare, Trash2, User as UserIcon } from 'lucide-react';
import { User } from 'firebase/auth';

interface Chat {
  id: string;
  title: string;
}

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  startNewChat: () => void;
  chats: Chat[];
  currentChatId: string | null;
  loadChat: (id: string) => void;
  handleDeleteChat: (e: React.MouseEvent, id: string) => void;
  user: User | null;
  setCurrentView: (view: 'chat' | 'profile' | 'about') => void;
}

export default function Sidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  startNewChat,
  chats,
  currentChatId,
  loadChat,
  handleDeleteChat,
  user,
  setCurrentView
}: SidebarProps) {
  return (
    <>
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed md:static top-0 left-0 h-full w-[85vw] md:w-64 bg-white z-50 transition-transform duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex-shrink-0 border-r border-gray-100`}
        aria-label="Chat History"
        aria-hidden={!isSidebarOpen}
        role="complementary"
      >
        <div className="flex flex-col h-full">
          <div className="p-4 md:hidden flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">History</h2>
            <button 
              onClick={() => setIsSidebarOpen(false)} 
              className="p-2 hover:bg-gray-200 rounded-full text-gray-500"
              aria-label="Close sidebar"
            >
              <ChevronLeft size={24} aria-hidden="true" />
            </button>
          </div>

          <div className="p-4 mt-2">
            <button 
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 bg-[#00796b] text-white py-3 rounded-xl font-bold hover:bg-teal-800 transition-colors shadow-sm"
              aria-label="Start a new chat"
            >
              <Plus size={20} aria-hidden="true" />
              New Chat
            </button>
          </div>

          <div className="px-4 py-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">History</h3>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 space-y-1" aria-label="Previous chats">
            {chats.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <MessageSquare size={48} className="mx-auto mb-2 opacity-20" aria-hidden="true" />
                <p className="text-sm">No temporary chats yet</p>
                <p className="text-[10px] mt-1">Cleared on refresh</p>
              </div>
            ) : (
              chats.map((chat) => (
                <div 
                  key={chat.id}
                  onClick={() => loadChat(chat.id)}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    currentChatId === chat.id ? 'bg-teal-50 text-[#00796b]' : 'hover:bg-teal-50/50 text-[#00796b]'
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={currentChatId === chat.id}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') loadChat(chat.id); }}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageSquare size={18} className="text-[#00796b]" aria-hidden="true" />
                    <span className="text-sm font-medium truncate">{chat.title}</span>
                  </div>
                  <button 
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                    aria-label={`Delete chat: ${chat.title}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              ))
            )}
          </nav>

          {user && (
            <div className="p-4 border-t border-teal-50">
              <button 
                onClick={() => {
                  setCurrentView('profile');
                  setIsSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-teal-50 text-[#00796b] font-bold hover:bg-teal-100 transition-all shadow-sm"
              >
                <div className="w-8 h-8 rounded-full bg-white border border-teal-200 flex items-center justify-center overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon size={16} />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm truncate">{user.displayName || 'Profile'}</p>
                  <p className="text-[10px] text-teal-600/70 font-medium">Account Settings</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
