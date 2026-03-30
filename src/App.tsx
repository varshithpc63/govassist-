import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { Mic, MicOff, Send, Paperclip, Volume2, Square, Loader2, FileText, Image as ImageIcon, X, LogIn, LogOut, User as UserIcon, Plus, Languages, ChevronDown, Menu, ChevronLeft, MessageSquare, Trash2, MoreVertical, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { auth, logout, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, getDocFromServer } from 'firebase/firestore';

const Profile = React.lazy(() => import('./components/Profile'));
const About = React.lazy(() => import('./components/About').then(module => ({ default: module.About })));
const AuthModal = React.lazy(() => import('./components/AuthModal'));
const Sidebar = React.lazy(() => import('./components/Sidebar'));
const Header = React.lazy(() => import('./components/Header'));
const MessageList = React.lazy(() => import('./components/MessageList'));
const ChatInput = React.lazy(() => import('./components/ChatInput'));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
  cleanText?: string; // Pre-calculated for immediate TTS
  attachments?: {
    name: string;
    type: string;
    data: string | null; // base64
    dataStripped?: boolean;
  }[];
  mapLinks?: { title: string; uri: string }[];
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
};

export default function App() {
  const INITIAL_MESSAGE: Message = {
    id: '1',
    role: 'model',
    text: "Hello! I can help you with Aadhaar, PAN, Ration Card, and other government work.\n\nType your question below, or tap the microphone to speak to me.\n\nनमस्ते! मैं आपकी मदद कर सकता हूँ। आप बोलकर या लिखकर सवाल पूछ सकते हैं।\n\nనమస్కారం! నేను మీకు సహాయం చేయగలను. మీరు మాట్లాడి లేదా టైప్ చేసి అడగవచ్చు."
  };

  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<{file: File, base64: string}[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);
  const speakingIdRef = useRef<string | null>(null);
  const [currentView, setCurrentView] = useState<'chat' | 'profile' | 'about'>('chat');
  const [selectedLanguage, setSelectedLanguage] = useState<'Auto' | 'English' | 'Hindi' | 'Telugu'>('Auto');
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [asyncError, setAsyncError] = useState<Error | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  if (asyncError) {
    throw asyncError;
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        // No persistent history to fetch
      } else {
        setChats([]);
        setCurrentChatId(null);
        setMessages([INITIAL_MESSAGE]);
      }
    });
    return () => {
      unsubscribe();
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const chatsRef = collection(db, 'users', user.uid, 'chats');
    const q = query(chatsRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedChats: Chat[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        try {
          loadedChats.push({
            id: data.id,
            title: data.title,
            messages: JSON.parse(data.messages),
            updatedAt: data.updatedAt
          });
        } catch (e) {
          console.error("Error parsing chat messages:", e);
        }
      });
      setChats(loadedChats);
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/chats`);
      } catch (e) {
        setAsyncError(e as Error);
      }
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Pre-fetch voices for browser TTS fallback
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  const getCleanText = (text: string) => {
    return text.replace(/[*#_`]/g, '').trim();
  };

  const detectLanguage = (text: string): 'Hindi' | 'Telugu' | 'English' => {
    if (/[\u0C00-\u0C7F]/.test(text)) return 'Telugu';
    if (/[\u0900-\u097F]/.test(text)) return 'Hindi';
    return 'English';
  };

  const saveChatToFirestore = async (chatId: string, msgs: Message[]) => {
    const title = msgs.find(m => m.role === 'user')?.text.substring(0, 30) || "New Chat";
    
    if (!user) {
      setChats(prev => {
        const existingIndex = prev.findIndex(c => c.id === chatId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], messages: msgs, updatedAt: Date.now() };
          return updated;
        }
        return [{ id: chatId, title, messages: msgs, updatedAt: Date.now() }, ...prev];
      });
      return;
    }
    
    // Strip base64 data to save space before storing
    const strippedMessages = msgs.map(msg => {
      if (!msg.attachments) return msg;
      return {
        ...msg,
        attachments: msg.attachments.map(att => ({
          name: att.name,
          type: att.type,
          data: null, // Remove base64 data
          dataStripped: true
        }))
      };
    });

    try {
      const chatRef = doc(db, 'users', user.uid, 'chats', chatId);
      await setDoc(chatRef, {
        id: chatId,
        title,
        messages: JSON.stringify(strippedMessages),
        updatedAt: Date.now()
      });
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/chats/${chatId}`);
      } catch (e) {
        setAsyncError(e as Error);
      }
    }
  };

  const startNewChat = () => {
    // Save current chat if it has messages
    if (messages.length > 1) {
      const chatId = currentChatId || Date.now().toString();
      saveChatToFirestore(chatId, messages);
    }
    
    setCurrentChatId(null);
    setMessages([INITIAL_MESSAGE]);
    setIsSidebarOpen(false);
  };

  const loadChat = (chatId: string) => {
    // Save current chat before switching
    if (messages.length > 1) {
      const currentId = currentChatId || Date.now().toString();
      saveChatToFirestore(currentId, messages);
    }

    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setCurrentChatId(chat.id);
    }
    setIsSidebarOpen(false);
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'chats', chatId));
      } catch (error) {
        try {
          handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/chats/${chatId}`);
        } catch (e) {
          setAsyncError(e as Error);
        }
      }
    } else {
      setChats(prev => prev.filter(c => c.id !== chatId));
    }
    
    if (currentChatId === chatId) {
      setCurrentChatId(null);
      setMessages([INITIAL_MESSAGE]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newAttachments: {file: File, base64: string}[] = [];
    let processedCount = 0;

    files.forEach(file => {
      // Limit to 10MB to avoid browser memory issues with base64
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Please select a file smaller than 10MB.`);
        processedCount++;
        if (processedCount === files.length && newAttachments.length > 0) {
          setAttachments(prev => [...prev, ...newAttachments]);
        }
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        newAttachments.push({ file, base64: base64String });
        processedCount++;
        if (processedCount === files.length) {
          setAttachments(prev => [...prev, ...newAttachments]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sendCoreMessage = async (newUserMsg: Message, overrideLocation?: {latitude: number, longitude: number}) => {
    let activeChatId = currentChatId;
    if (!activeChatId) {
      activeChatId = Date.now().toString();
      setCurrentChatId(activeChatId);
    }

    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    saveChatToFirestore(activeChatId, newMessages);
    
    setInput('');
    setAttachments([]);
    setIsTyping(true);

    try {
      // Build history for Gemini
      const historyMessages = messages.filter(msg => msg.id !== '1');
      
      const contents = historyMessages.map(msg => {
        const parts: any[] = [];
        if (msg.text && msg.text !== '🎤 Voice Message') {
          parts.push({ text: msg.text });
        }
        if (msg.attachments && msg.attachments.length > 0) {
          msg.attachments.forEach(att => {
            if (att.data) {
              parts.push({
                inlineData: {
                  mimeType: att.type,
                  data: att.data
                }
              });
            } else if (att.dataStripped) {
              parts.push({ text: `[Attachment: ${att.name}]` });
            }
          });
        }
        if (parts.length === 0) {
          parts.push({ text: "Voice message" });
        }
        return {
          role: msg.role,
          parts
        };
      });

      // Add the new user message
      const newUserParts: any[] = [];
      if (newUserMsg.text && newUserMsg.text !== '🎤 Voice Message') {
        newUserParts.push({ text: newUserMsg.text });
      }
      if (newUserMsg.attachments && newUserMsg.attachments.length > 0) {
        newUserMsg.attachments.forEach(att => {
          if (att.data) {
            newUserParts.push({
              inlineData: {
                mimeType: att.type,
                data: att.data
              }
            });
          }
        });
      }
      
      const hasAudio = newUserMsg.attachments?.some(att => att.type.startsWith('audio/'));
      if (hasAudio && (!newUserMsg.text || newUserMsg.text === '🎤 Voice Message')) {
        newUserParts.push({ text: "Please listen to this voice message, detect the language it is spoken in, and respond to my query in that EXACT SAME language." });
      } else if (newUserParts.length === 0) {
        newUserParts.push({ text: "Voice message" });
      }
      
      contents.push({ role: 'user', parts: newUserParts });

      const isVoiceMessage = hasAudio && (!newUserMsg.text || newUserMsg.text === '🎤 Voice Message');
      const isFirstMessage = messages.length === 0;
      
      const languageInstruction = selectedLanguage === 'Auto' 
        ? `CRITICAL LANGUAGE RULE: 
${isVoiceMessage 
  ? `- The user has sent a voice message. You MUST listen to the audio, detect the spoken language (English, Hindi, or Telugu), and respond in that EXACT same language. Do NOT default to Hindi if they speak English or Telugu.`
  : `- You MUST detect the language of the user's text input and respond in that EXACT same language.
- If the user types in English (e.g., 'Find nearby MeeSeva centers'), you MUST reply in English.
- If the user types in Telugu (or Telugu in English script), you MUST reply in Telugu.
- If the user types in Hindi (or Hindi in English script), you MUST reply in Hindi.
- Do NOT default to Hindi unless the user actually typed in Hindi.
${isFirstMessage ? '' : `- Since this is an ongoing conversation, maintain the language established in the previous messages. Even if the user sends a short English phrase like 'Find nearby MeeSeva centers', reply in the main language of the conversation.`}`}
- EXTREMELY IMPORTANT: If the language is Hindi, you MUST write your response EXCLUSIVELY in the Devanagari script (e.g., "नमस्ते", NOT "Namaste"). You are FORBIDDEN from writing Hindi in the English alphabet (Hinglish).
- EXTREMELY IMPORTANT: If the language is Telugu, you MUST write your response EXCLUSIVELY in the Telugu script (e.g., "నమస్కారం"). You are FORBIDDEN from writing Telugu in the English alphabet (Tenglish).
- IMPORTANT: If the user uploads a document or image, DO NOT use the document's language for your response. ONLY use the language of the user's text or voice message.`
        : `CRITICAL LANGUAGE RULE: The user has explicitly selected ${selectedLanguage} as their preferred language. You MUST respond STRICTLY in ${selectedLanguage}.
- EXTREMELY IMPORTANT: If the selected language is Hindi, you MUST write your response EXCLUSIVELY in the Devanagari script (e.g., "नमस्ते", NOT "Namaste"). You are FORBIDDEN from writing Hindi in the English alphabet (Hinglish).
- EXTREMELY IMPORTANT: If the selected language is Telugu, you MUST write your response EXCLUSIVELY in the Telugu script (e.g., "నమస్కారం"). You are FORBIDDEN from writing Telugu in the English alphabet (Tenglish).
- Even if the user uploads a document written in a different language, or sends a message in a different language, your response MUST be translated and written ONLY in ${selectedLanguage}.`;

      const modelToUse = 'gemini-3.1-flash-lite-preview';

      const config: any = {
        systemInstruction: `You are GovAssist+, a very friendly and patient helper for common people and rural citizens in India. Your job is to help with government services (Aadhaar, PAN, Ration Card, Voter ID, etc.).

Follow the workflow strictly step by step.

Step 1: User Query & Explain Process
If the user asks about applying for an Income Certificate, birth certificate or caste certificate or an Aadhar card, FIRST explain how to apply and the overall process to do it clearly and simply. 
Only after explaining the process, move to the next steps.

Example:
User: "How can I apply for an Income Certificate?"

Step 2: Collect Basic Details
Ask the user for the following information:
1. Full Name
2. date of birth
3. age
4. Annual Family Income
5. State of residence
and necessity details needed to apply according quarry

Step 3: Eligibility Check
Check eligibility and all documents are correct apply according to the application

If eligible:
"Based on the information provided, you are eligible to apply for an Income Certificate."

If not eligible:
"Based on your details, you may not be eligible for this Certificate and tell why what fixing is needed. and tell Please contact the nearest MeeSeva center for assistance."

Step 4: If eligible Display Required Documents
tell to give the required documents tell which documents are needed:

Ask for the required documents according to application or certificate like below:
• Existing Income Certificate (if available)
• Aadhaar Card (Proof of Identity)
• Residential Proof (Electricity Bill / Water Bill / Ration Card)
• Passport Size Photograph
• Address Proof

and check is documents are ok to apply or and issues there, 

Step 6: OCR Verification & Cross-Checking
After upload, perform OCR extraction to read data from the documents.

Extract the following information:
• Name
• Address
• Aadhaar number
• Income details
according to user quary

CRITICAL: If the user uploads MULTIPLE documents (e.g., Aadhaar Card and 10th Certificate), you MUST cross-check the details between them.
- Compare the Name, Date of Birth, Father's Name, etc., across all uploaded documents.
- Explicitly tell the user if the details match perfectly across the documents, or if there are any discrepancies (e.g., "The name on your Aadhaar card matches your 10th certificate").

Compare the extracted information with the user-provided data.

Step 7: Data Validation

If the extracted data matches user input:
Respond:
"Your documents have been successfully verified."

Then guide the user:
"Please visit the nearest MeeSeva center to complete the final application process."

If the extracted data does not match:
Respond:
"There is a mismatch between the entered details and the uploaded documents. Please recheck and upload the correct documents."

Step 8: Final Guidance
After successful verification, tell the user:

"Your details are verified. Please visit the nearest MeeSeva center with the original documents to complete your Income Certificate application."

Always guide the user step by step and wait for responses before moving to the next step.

Rules:
1. EXTREME SIMPLICITY: Speak like you are talking to an elder from a village who has never used a computer. Use very simple, everyday words. Keep sentences very short. Use bullet points. NO complex jargon or legal terms.
2. LANGUAGE: ${languageInstruction}
3. BE HELPFUL & DIRECT: Answer their exact question immediately. Give step-by-step easy instructions.
4. DOCUMENTS: If they upload a photo, tell them simply what it is and if it looks correct.
5. STATE MANAGEMENT: Wait for user response at each step before moving to the next.
6. FIND MEESEVA CENTERS: If the user asks to find nearby MeeSeva centers, DO NOT give a long explanation. Simply give a 1-sentence confirmation (e.g., "Here are the nearest MeeSeva centers based on your location. Please click the map link below to view them.") and nothing else.
7. PROACTIVE RECOMMENDATION: At the end of answering any general query about government services, processes, or documents, you MUST proactively ask the user: "Would you like me to find the nearest MeeSeva centers near you?"`,
        temperature: 0.7,
      };

      const userTextLower = newUserMsg.text.toLowerCase();
      const isLocationQuery = (userTextLower.includes('meeseva') && (userTextLower.includes('near') || userTextLower.includes('find') || userTextLower.includes('where') || userTextLower.includes('location'))) || 
                              userTextLower.includes('nearest') ||
                              overrideLocation !== undefined;

      let activeLocation = overrideLocation || location;
      
      if (isLocationQuery && !activeLocation && 'geolocation' in navigator) {
        try {
          activeLocation = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (position) => resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              }),
              (error) => reject(error)
            );
          });
          if (activeLocation) {
            setLocation(activeLocation);
          }
        } catch (error) {
          console.error("Error getting location automatically:", error);
        }
      }

      if (activeLocation && isLocationQuery) {
        // Append location to the last user message
        const lastUserMsgIndex = contents.map(c => c.role).lastIndexOf('user');
        if (lastUserMsgIndex >= 0) {
          const langAppend = (isFirstMessage && selectedLanguage === 'Auto') 
            ? " Since this is the first message of the conversation and the request is in English, you MUST reply in English." 
            : " You MUST reply in the exact same language that we have been using in this conversation.";
            
          contents[lastUserMsgIndex].parts.push({
            text: `\n\nMy current location is latitude ${activeLocation.latitude}, longitude ${activeLocation.longitude}. I want to find nearby MeeSeva centers. Please give a very short 1-sentence reply telling me to click the Google Maps link below. DO NOT give any long explanations or lists.${langAppend}`
          });
        }
      }

      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: contents,
        config: config
      });

      let modelText = response.text || "";
      
      const mapLinks: { title: string; uri: string }[] = [];
      
      // Manually add a Google Maps link if it was a location query
      if (activeLocation && isLocationQuery) {
        mapLinks.push({
          title: "Search MeeSeva Centers on Google Maps",
          uri: `https://www.google.com/maps/search/MeeSeva+centers+near+me/@${activeLocation.latitude},${activeLocation.longitude},14z`
        });
      }
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.maps?.uri) {
            mapLinks.push({
              title: chunk.maps.title || "View on Google Maps",
              uri: chunk.maps.uri
            });
          } else if (chunk.web?.uri) {
            mapLinks.push({
              title: chunk.web.title || "View Source",
              uri: chunk.web.uri
            });
          }
        });
      }

      if (!modelText) {
        const finishReason = response.candidates?.[0]?.finishReason;
        if (finishReason === 'SAFETY') {
          modelText = "I cannot answer that due to safety guidelines.";
        } else if (mapLinks.length > 0) {
          modelText = "Here are the nearest locations I found:";
        } else if (response.functionCalls && response.functionCalls.length > 0) {
          modelText = "I need to perform an action, but I cannot do that right now.";
        } else {
          const isLocationQuery = contents.some(c => c.parts.some(p => p.text?.includes("government service centers based on this location")));
          if (isLocationQuery) {
            modelText = "I couldn't find any MeeSeva centers near your current location. You might want to try searching for a specific city or area.";
          } else {
            modelText = "I'm sorry, I couldn't find any information about that.";
          }
          console.log("Empty response from Gemini:", JSON.stringify(response));
        }
      }

      const modelMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        text: modelText,
        cleanText: getCleanText(modelText),
        mapLinks: mapLinks.length > 0 ? mapLinks : undefined
      };
      
      const updatedMessages = [...newMessages, modelMsg];
      setMessages(updatedMessages);
      saveChatToFirestore(activeChatId, updatedMessages);
    } catch (error) {
      console.error("Gemini API Error:", error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        text: "⚠️ I encountered an error connecting to the server. Please try again."
      };
      const updatedMessages = [...newMessages, errorMsg];
      setMessages(updatedMessages);
      saveChatToFirestore(activeChatId, updatedMessages);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || isTyping) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim() || (attachments.length > 0 ? "Please analyze these documents." : ""),
      attachments: attachments.length > 0 ? attachments.map(att => ({
        name: att.file.name,
        type: att.file.type,
        data: att.base64
      })) : undefined
    };

    await sendCoreMessage(newUserMsg);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Speech Recognition using Web Speech API for real-time speed
  const toggleMic = async () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        processAudioInput(audioBlob, selectedLanguage);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const processAudioInput = async (audioBlob: Blob, language: string = 'Auto') => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const newUserMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          text: '🎤 Voice Message',
          attachments: [{
            name: 'voice_message.webm',
            type: (audioBlob.type || "audio/webm").split(';')[0],
            data: base64Audio
          }]
        };

        await sendCoreMessage(newUserMsg);
      };
    } catch (err) {
      console.error("File reading error:", err);
    }
  };

  const speakText = (text: string, messageId: string, preCleanedText?: string) => {
    // If clicking the same message that's currently speaking, stop it
    if (speakingIdRef.current === messageId) {
      stopSpeech();
      return;
    }

    // Stop any current speech before starting new one
    stopSpeech();
    
    setCurrentlySpeakingId(messageId);
    speakingIdRef.current = messageId;
    
    // Use pre-cleaned text if available for zero-latency
    const cleanText = preCleanedText || getCleanText(text);
    if (!cleanText) {
      setCurrentlySpeakingId(null);
      speakingIdRef.current = null;
      return;
    }

    // Primary Method: Browser SpeechSynthesis (Immediate)
    if ('speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      
      // Fallback to AI if no voices are loaded yet or text is very long (Chrome 15s bug)
      if (voices.length === 0 || cleanText.length > 200) {
        speakWithAI(cleanText, messageId);
        return;
      }

      const msg = new SpeechSynthesisUtterance(cleanText);
      utteranceRef.current = msg; // Prevent garbage collection
      
      const findBestVoice = (lang: string) => {
        const langVoices = voices.filter(v => v.lang.startsWith(lang));
        return langVoices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || langVoices[0];
      };
      
      // Detect language for better voice selection
      const lang = detectLanguage(cleanText);
      if (lang === 'Telugu') {
        msg.lang = 'te-IN';
        const teVoice = findBestVoice('te');
        if (teVoice) msg.voice = teVoice;
      } else if (lang === 'Hindi') {
        msg.lang = 'hi-IN';
        const hiVoice = findBestVoice('hi');
        if (hiVoice) msg.voice = hiVoice;
      } else {
        msg.lang = 'en-IN';
        const enVoice = findBestVoice('en');
        if (enVoice) msg.voice = enVoice;
      }

      msg.rate = 1.0;
      msg.pitch = 1.0;

      msg.onend = () => {
        if (speakingIdRef.current === messageId) {
          setCurrentlySpeakingId(null);
          speakingIdRef.current = null;
        }
        utteranceRef.current = null;
      };

      msg.onerror = (event) => {
        console.error("SpeechSynthesis Error:", event);
        utteranceRef.current = null;
        if (speakingIdRef.current === messageId) {
          speakWithAI(cleanText, messageId);
        }
      };
      
      window.speechSynthesis.speak(msg);
    } else {
      speakWithAI(cleanText, messageId);
    }
  };

  const stopSpeech = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setCurrentlySpeakingId(null);
    speakingIdRef.current = null;
  };

  const speakWithAI = async (cleanText: string, messageId: string) => {
    try {
      const aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await aiInstance.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: cleanText.substring(0, 2000) }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
        },
      });

      if (speakingIdRef.current !== messageId) return;

      const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      if (inlineData?.data) {
        const binaryString = window.atob(inlineData.data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const pcmData = new Int16Array(bytes.buffer, 0, Math.floor(bytes.byteLength / 2));
        const sampleRate = 24000;
        const numChannels = 1;
        const byteRate = sampleRate * numChannels * 2;
        const blockAlign = numChannels * 2;
        const dataSize = pcmData.length * 2;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        const writeString = (v: DataView, offset: number, str: string) => {
          for (let i = 0; i < str.length; i++) {
            v.setUint8(offset + i, str.charCodeAt(i));
          }
        };

        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, 16, true);
        writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true);

        let offset = 44;
        for (let i = 0; i < pcmData.length; i++, offset += 2) {
          view.setInt16(offset, pcmData[i], true);
        }

        const blob = new Blob([view], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        
        if (speakingIdRef.current !== messageId) return;

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          if (speakingIdRef.current === messageId) {
            setCurrentlySpeakingId(null);
            speakingIdRef.current = null;
          }
          audioRef.current = null;
        };
        audio.play();
      } else {
        setCurrentlySpeakingId(null);
        speakingIdRef.current = null;
      }
    } catch (error) {
      console.error("AI TTS Fallback Error:", error);
      setCurrentlySpeakingId(null);
      speakingIdRef.current = null;
    }
  };

  const handleFindCenter = () => {
    setCurrentView('chat');
    
    if (!location) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            setLocation(newLocation);
            
            const newUserMsg: Message = {
              id: Date.now().toString(),
              role: 'user',
              text: "Find nearby MeeSeva centers",
            };
            sendCoreMessage(newUserMsg, newLocation);
          },
          (error) => {
            console.error("Error getting location:", error);
            const errorMsg: Message = {
              id: Date.now().toString(),
              role: 'model',
              text: "I need your location to find nearby MeeSeva centers. Please enable location permissions in your browser and try again.",
              cleanText: "I need your location to find nearby MeeSeva centers. Please enable location permissions in your browser and try again."
            };
            setMessages(prev => [...prev, errorMsg]);
          }
        );
      } else {
        const errorMsg: Message = {
          id: Date.now().toString(),
          role: 'model',
          text: "Geolocation is not supported by your browser.",
          cleanText: "Geolocation is not supported by your browser."
        };
        setMessages(prev => [...prev, errorMsg]);
      }
      return;
    }

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: "Find nearby MeeSeva centers",
    };
    sendCoreMessage(newUserMsg);
  };

  return (
    <div className="flex h-screen bg-white font-sans relative overflow-hidden">
      <React.Suspense fallback={null}>
        <Sidebar 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          startNewChat={startNewChat}
          chats={chats}
          currentChatId={currentChatId}
          loadChat={loadChat}
          handleDeleteChat={handleDeleteChat}
          user={user}
          setCurrentView={setCurrentView}
        />
      </React.Suspense>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <React.Suspense fallback={null}>
          <Header 
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            setCurrentView={setCurrentView}
            showLangDropdown={showLangDropdown}
            setShowLangDropdown={setShowLangDropdown}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            isAuthReady={isAuthReady}
            user={user}
            setShowAuthModal={setShowAuthModal}
            logout={logout}
            onFindCenter={handleFindCenter}
          />
        </React.Suspense>

        {/* Auth Modal */}
      {showAuthModal && (
        <React.Suspense fallback={null}>
          <AuthModal onClose={() => setShowAuthModal(false)} />
        </React.Suspense>
      )}

      {currentView === 'profile' && user ? (
        <React.Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-teal-600" size={32} /></div>}>
          <Profile user={user} onBack={() => setCurrentView('chat')} />
        </React.Suspense>
      ) : currentView === 'about' ? (
        <React.Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-teal-600" size={32} /></div>}>
          <About onBack={() => setCurrentView('chat')} />
        </React.Suspense>
      ) : (
        <>
          <React.Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-teal-600" size={32} /></div>}>
            <MessageList 
              messages={messages}
              isTyping={isTyping}
              messagesEndRef={messagesEndRef}
              speakText={speakText}
              currentlySpeakingId={currentlySpeakingId}
            />
          </React.Suspense>

          <React.Suspense fallback={null}>
            <ChatInput 
              attachments={attachments}
              removeAttachment={removeAttachment}
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              input={input}
              setInput={setInput}
              handleKeyPress={handleKeyPress}
              isRecording={isRecording}
              recordingDuration={recordingDuration}
              formatDuration={formatDuration}
              toggleMic={toggleMic}
              sendMessage={sendMessage}
              isTyping={isTyping}
            />
          </React.Suspense>
        </>
      )}
      </div>
    </div>
  );
}
