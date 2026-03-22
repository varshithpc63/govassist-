import React from 'react';
import { Mic, Send, Paperclip, Square, X, FileText, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Attachment {
  file: File;
  preview?: string;
}

interface ChatInputProps {
  attachments: Attachment[];
  removeAttachment: (index: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  input: string;
  setInput: (input: string) => void;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  isRecording: boolean;
  recordingDuration: number;
  formatDuration: (seconds: number) => string;
  toggleMic: () => void;
  sendMessage: () => void;
  isTyping: boolean;
}

export default function ChatInput({
  attachments,
  removeAttachment,
  fileInputRef,
  handleFileChange,
  input,
  setInput,
  handleKeyPress,
  isRecording,
  recordingDuration,
  formatDuration,
  toggleMic,
  sendMessage,
  isTyping
}: ChatInputProps) {
  return (
    <div className="bg-white border-t border-gray-100 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att, index) => (
              <div key={index} className="inline-flex items-center gap-2 bg-teal-50 text-[#00796b] px-2.5 py-1 rounded-full text-xs border border-teal-100">
                {att.file.type.startsWith('image/') ? <ImageIcon size={14} aria-hidden="true" /> : <FileText size={14} aria-hidden="true" />}
                <span className="truncate max-w-[150px]">{att.file.name}</span>
                <button 
                  onClick={() => removeAttachment(index)} 
                  className="hover:text-red-500 ml-1"
                  aria-label={`Remove attachment: ${att.file.name}`}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-end gap-2 sm:gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*,.pdf"
            multiple
            aria-hidden="true"
          />
          
          <div className="flex-1 bg-white rounded-full border border-gray-200 focus-within:border-[#00796b] focus-within:ring-4 focus-within:ring-teal-500/10 transition-all flex items-center shadow-sm relative overflow-hidden min-h-[48px] sm:min-h-[56px] px-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-[#00796b] hover:bg-teal-50 rounded-full transition-all flex-shrink-0"
              aria-label="Attach Document (Image/PDF)"
            >
              <Paperclip size={20} aria-hidden="true" />
            </button>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask GovAssist+..."
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 sm:py-4 px-2 max-h-32 outline-none text-[14px] sm:text-[15px] text-gray-700 placeholder:text-gray-400 self-center"
              rows={1}
              aria-label="Message input"
            />
            
            <div className="flex items-center gap-1 pr-1">
              <div className="relative flex items-center">
                <AnimatePresence>
                  {isRecording && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute right-full mr-3 flex items-center gap-2 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full shadow-sm whitespace-nowrap"
                    >
                      <motion.div 
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 bg-red-500 rounded-full"
                      />
                      <span className="text-red-600 text-xs font-bold font-mono min-w-[35px]">
                        {formatDuration(recordingDuration)}
                      </span>
                      <span className="text-red-400 text-[10px] font-medium uppercase tracking-wider hidden sm:inline">Recording</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative">
                  {isRecording && (
                    <motion.div 
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                      className="absolute inset-0 bg-red-500 rounded-full"
                    />
                  )}
                  <button 
                    onClick={toggleMic}
                    className={`relative w-10 h-10 rounded-full transition-all duration-300 flex items-center justify-center z-10 ${
                      isRecording 
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/40' 
                        : 'text-gray-400 hover:text-[#00796b] hover:bg-teal-50'
                    }`}
                    aria-label={isRecording ? "Stop recording" : "Start voice input"}
                  >
                    {isRecording ? (
                      <motion.div
                        animate={{ scale: [1, 0.9, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        <Square size={18} fill="currentColor" aria-hidden="true" />
                      </motion.div>
                    ) : (
                      <Mic size={20} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
              
              <button 
                onClick={sendMessage}
                disabled={(!input.trim() && attachments.length === 0) || isTyping}
                className="w-10 h-10 flex items-center justify-center bg-[#00796b] text-white rounded-full hover:bg-teal-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all flex-shrink-0 shadow-sm active:scale-95"
                aria-label="Send message"
              >
                <Send size={18} className="ml-0.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
