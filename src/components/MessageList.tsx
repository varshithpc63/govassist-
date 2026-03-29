import React from 'react';
import { Mic, FileText, Image as ImageIcon, Volume2, Square, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Attachment {
  type: string;
  name: string;
  dataStripped?: boolean;
}

interface Message {
  id: string;
  text: string;
  role: 'user' | 'model';
  cleanText?: string;
  attachments?: Attachment[];
  mapLinks?: { title: string; uri: string }[];
}

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  speakText: (text: string, id: string, cleanText?: string) => void;
  currentlySpeakingId: string | null;
}

export default function MessageList({
  messages,
  isTyping,
  messagesEndRef,
  speakText,
  currentlySpeakingId
}: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 w-full">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-3 sm:p-4 relative ${
              msg.role === 'user' 
                ? 'bg-gray-100 text-gray-800 rounded-br-sm shadow-sm' 
                : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
            }`}>
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {msg.attachments.map((att, index) => (
                  <div key={index} className={`p-2 rounded-lg flex items-center gap-2 ${msg.role === 'user' ? 'bg-gray-200 border border-gray-300' : 'bg-gray-50 border border-gray-100'}`}>
                    {att.type.startsWith('image/') ? (
                      <ImageIcon size={18} className={msg.role === 'user' ? 'text-gray-600' : 'text-gray-500'} />
                    ) : att.type.startsWith('audio/') ? (
                      <Mic size={18} className={msg.role === 'user' ? 'text-gray-600' : 'text-gray-500'} />
                    ) : (
                      <FileText size={18} className={msg.role === 'user' ? 'text-gray-600' : 'text-gray-500'} />
                    )}
                    <div className="flex flex-col overflow-hidden">
                      <span className={`text-xs truncate max-w-[150px] sm:max-w-[200px] font-medium ${msg.role === 'user' ? 'text-gray-800' : 'text-gray-700'}`}>{att.name}</span>
                      {att.dataStripped && (
                        <span className={`text-[9px] italic ${msg.role === 'user' ? 'text-gray-500' : 'text-gray-400'}`}>
                          (Content not saved in history due to size)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className={msg.role === 'model' ? "prose prose-sm sm:prose-base max-w-none prose-slate" : "whitespace-pre-wrap text-gray-800 text-sm sm:text-[15px] leading-relaxed"}>
              {msg.role === 'model' ? (
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              ) : (
                msg.text
              )}
            </div>

            {msg.mapLinks && msg.mapLinks.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-gray-700">📍 Sources & Locations:</p>
                <div className="flex flex-col gap-2">
                  {msg.mapLinks.map((link, idx) => (
                    <a 
                      key={idx} 
                      href={link.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm border border-blue-100"
                    >
                      <span className="truncate">{link.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <button 
              onClick={() => speakText(msg.text, msg.id, msg.cleanText)}
              className={`absolute bottom-1 p-1.5 transition-colors ${
                msg.role === 'user' 
                  ? '-left-8 text-gray-400 hover:text-gray-600' 
                  : '-right-8 text-gray-400 hover:text-[#00796b]'
              } ${currentlySpeakingId === msg.id ? 'text-[#00796b] animate-pulse' : ''}`}
              aria-label={currentlySpeakingId === msg.id ? "Stop reading" : "Read aloud"}
            >
              {currentlySpeakingId === msg.id ? <Square size={16} fill="currentColor" aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
            </button>
          </div>
          <span className="text-[10px] text-gray-400 mt-1 mx-1">
            {msg.role === 'user' ? 'You' : 'GovAssist+'}
          </span>
        </div>
      ))}

      {isTyping && (
        <div className="flex flex-col items-start" aria-live="polite">
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm p-3 flex items-center gap-2">
            <Loader2 size={18} className="animate-spin text-[#00796b]" aria-hidden="true" />
            <span className="text-gray-400 text-xs">Analyzing and typing...</span>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
