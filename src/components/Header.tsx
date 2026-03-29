import React from 'react';
import { Menu, Languages, ChevronDown, Check, LogOut } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  setCurrentView: (view: 'chat' | 'profile' | 'about') => void;
  showLangDropdown: boolean;
  setShowLangDropdown: (show: boolean) => void;
  selectedLanguage: string;
  setSelectedLanguage: (lang: any) => void;
  isAuthReady: boolean;
  user: User | null;
  setShowAuthModal: (show: boolean) => void;
  logout: () => void;
  onFindCenter: () => void;
}

export default function Header({
  isSidebarOpen,
  setIsSidebarOpen,
  setCurrentView,
  showLangDropdown,
  setShowLangDropdown,
  selectedLanguage,
  setSelectedLanguage,
  isAuthReady,
  user,
  setShowAuthModal,
  logout,
  onFindCenter
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-100 px-4 py-3 shadow-sm z-10 flex justify-between items-center sticky top-0">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-gray-500 hover:text-[#00796b] hover:bg-teal-50 rounded-lg transition-colors md:hidden"
          aria-label="Open sidebar"
          aria-expanded={isSidebarOpen}
        >
          <Menu size={22} aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center overflow-hidden bg-white shadow-sm">
            <img 
              src="https://lainar-bren.odoo.com/web/image/16223-01ec53b3/WhatsApp%20Image%202026-03-14%20at%207.29.59%20PM.webp" 
              alt="GovAssist+ Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback if image doesn't load
                e.currentTarget.src = "/logo.png";
              }}
            />
          </div>
          <h1 className="text-lg font-bold text-[#00796b] leading-tight">Gov_Assist+</h1>
        </div>
      </div>
      
      <div className="flex items-center gap-4 sm:gap-6">
        <button 
          onClick={onFindCenter}
          className="flex items-center gap-1 sm:gap-2 bg-[#00796b] hover:bg-teal-700 text-white px-2.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors shadow-sm"
        >
          <span className="text-sm sm:text-lg leading-none">📍</span> 
          <span className="hidden sm:inline">Find MeeSeva Center</span>
          <span className="sm:hidden">MeeSeva</span>
        </button>
        <button 
          onClick={() => setCurrentView('about')}
          className="hidden sm:block text-gray-600 hover:text-[#00796b] font-medium text-sm"
        >
          About
        </button>

        {/* Language Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            className="flex items-center gap-2 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-full text-sm font-semibold text-[#00796b] transition-all border border-teal-100 shadow-sm"
            aria-label="Select language"
            aria-expanded={showLangDropdown}
            aria-haspopup="listbox"
          >
            <Languages size={16} className="text-[#00796b]" aria-hidden="true" />
            <span className="hidden sm:inline-block">
              {selectedLanguage === 'Auto' ? 'Auto Detect' : 
               selectedLanguage === 'Hindi' ? 'हिंदी' : 
               selectedLanguage === 'Telugu' ? 'తెలుగు' : 'English'}
            </span>
            <span className="sm:hidden text-xs">
              {selectedLanguage === 'Auto' ? 'Auto' : 
               selectedLanguage === 'Hindi' ? 'HI' : 
               selectedLanguage === 'Telugu' ? 'TE' : 'EN'}
            </span>
            <ChevronDown size={14} className={`text-teal-600 transition-transform duration-200 ${showLangDropdown ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {showLangDropdown && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowLangDropdown(false)} aria-hidden="true" />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-30 overflow-hidden" role="listbox">
                <div className="px-4 pb-2 mb-1 border-b border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Select Language
                </div>
                {[
                  { id: 'Auto', label: 'Auto Detect', icon: '🌐' },
                  { id: 'English', label: 'English', icon: 'A' },
                  { id: 'Hindi', label: 'हिंदी', icon: 'अ' },
                  { id: 'Telugu', label: 'తెలుగు', icon: 'అ' }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => {
                      setSelectedLanguage(lang.id as any);
                      setShowLangDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors ${
                      selectedLanguage === lang.id 
                        ? 'bg-teal-50/50 text-[#00796b]' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    role="option"
                    aria-selected={selectedLanguage === lang.id}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center justify-center w-6 h-6 rounded-md text-xs ${selectedLanguage === lang.id ? 'bg-teal-100 text-[#00796b]' : 'bg-gray-100 text-gray-500'}`}>
                        {lang.icon}
                      </span>
                      {lang.label}
                    </div>
                    {selectedLanguage === lang.id && (
                      <Check size={16} className="text-[#00796b]" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        
        {isAuthReady && !user ? (
          <button 
            onClick={() => setShowAuthModal(true)}
            className="hidden sm:flex items-center justify-center px-5 py-1.5 bg-[#00796b] text-white rounded-full text-sm font-medium hover:bg-teal-800 transition-colors shadow-sm"
          >
            Sign In
          </button>
        ) : user ? (
          <button 
            onClick={() => logout()}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 font-medium text-sm"
            aria-label="Sign out"
          >
            <LogOut size={20} aria-hidden="true" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
