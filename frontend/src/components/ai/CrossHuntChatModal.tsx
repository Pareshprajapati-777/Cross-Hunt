import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Ticket,
  Compass,
  Ship,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Loader2,
  Copy,
  Check,
  Radio,
  Navigation,
} from 'lucide-react';
import {
  AiChatMessage,
  AiAction,
  sendAiChatMessage,
  lookupTicketWithAi,
  getAiSuggestions,
  AiSuggestion,
} from '../../api/ai';
import { useAuth } from '../../context/AuthContext';
import { DolphinAvatar3D } from './DolphinAvatar3D';

export interface CruiseHuntChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onResume?: () => void;
  isMinimized: boolean;
}

export type CrossHuntChatModalProps = CruiseHuntChatModalProps;

const DEFAULT_SUGGESTIONS: AiSuggestion[] = [
  { id: 'my_ticket', label: '🎫 My Ticket', query: 'Mera ticket code aur pass check karo' },
  { id: 'my_wallet', label: '💳 Wallet & UPI Top-up', query: 'Wallet me UPI QR se paise kaise add karein?' },
  { id: 'find_cruise', label: '🌊 Mumbai to Goa Cruise', query: 'Mumbai se Goa public cruise dikhao' },
  { id: 'private_yacht', label: '⚓ Private Yacht', query: 'Goa me 20 guests ke liye private yacht chahiye' },
  { id: 'water_sports', label: '🏄 Scuba & Water Sports', query: 'Scuba diving aur jet ski ke packages dikhaiye' },
  { id: 'gate_scan', label: '📸 Ship Gate Scan', query: 'Ship boarding gate par ticket scan kaise hota hai?' },
  { id: 'cancel_policy', label: '❓ Cancel & Refund', query: 'Booking cancellation aur wallet refund policy kya hai?' },
];

export const CruiseHuntChatModal: React.FC<CruiseHuntChatModalProps> = ({
  isOpen,
  onClose,
  onMinimize,
  onResume,
  isMinimized,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [messages, setMessages] = useState<AiChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem('cruise_hunt_ai_chat') || sessionStorage.getItem('cross_hunt_ai_chat');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Namaste! 👋 Welcome to Cruise-Hunt Maritime AI Concierge.

Aap mujhse in cheezon ke baare me pooch sakte hain:
• 🎫 **My Bookings & Passes:** Ticket status, route details & QR boarding pass
• 🚢 **Cruises & Yachts:** Cordelia ocean liners, sunset tours & private yacht charters
• 🏄 **Water Sports:** PADI Scuba diving, jet ski safaris & parasailing
• 💳 **Wallet & Gate Entry:** Fast UPI QR top-ups & live ship boarding gate scan

Aap Hindi, Hinglish ya English me pooch sakte hain! How can I help you? 🐬`,
        timestamp: Date.now(),
        actions: [
          { label: '🚢 Browse Public Cruises', url: '/tours', type: 'navigate', variant: 'primary' },
          { label: '⚓ Private Yachts', url: '/explore', type: 'navigate', variant: 'outline' },
          { label: '🏄 Water Sports', url: '/activities', type: 'navigate', variant: 'outline' },
          { label: '💳 Open Wallet', url: '/dashboard', type: 'navigate', variant: 'ghost' },
        ],
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>(DEFAULT_SUGGESTIONS);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [activeSpeakingMsgId, setActiveSpeakingMsgId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Persist conversation in current browser session
  useEffect(() => {
    try {
      sessionStorage.setItem('cruise_hunt_ai_chat', JSON.stringify(messages));
    } catch (e) {
      // ignore
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  // Fetch contextual suggestions on mount
  useEffect(() => {
    getAiSuggestions()
      .then((res) => {
        if (res.suggestions && res.suggestions.length > 0) {
          setSuggestions(res.suggestions);
        }
      })
      .catch(() => {});
  }, [user]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && !isVoiceMode) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized, isVoiceMode]);

  // Handle Text-to-Speech (Speak answer)
  const speakText = (text: string, msgId: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (activeSpeakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setActiveSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown symbols for natural speech
    const cleanSpeech = text
      .replace(/[#*`_~]/g, '')
      .replace(/•/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Pick pleasant voice if available (Hindi / Indian English preferred)
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.includes('hi') || v.lang.includes('en-IN') || v.lang.includes('en-GB')
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => setActiveSpeakingMsgId(null);
    utterance.onerror = () => setActiveSpeakingMsgId(null);

    setActiveSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Stop speaking when closed or minimized
  useEffect(() => {
    if (!isOpen || isMinimized) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setActiveSpeakingMsgId(null);
    }
  }, [isOpen, isMinimized]);

  // Handle Speech-to-Text (Microphone voice input)
  const toggleSpeechRecognition = () => {
    setSpeechError(null);

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      setSpeechError('Speech recognition is not supported in this browser. Please type your message.');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'en-IN'; // Recognizes Indian English and Hindi words naturally
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');

        setInput(transcript);

        if (event.results[0].isFinal) {
          setIsListening(false);
          // In voice mode, automatically submit final transcript
          if (isVoiceMode && transcript.trim()) {
            handleSend(transcript);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone access was denied. Please allow microphone permissions in your browser.');
        } else if (event.error === 'no-speech') {
          setSpeechError('No speech detected. Please try speaking again.');
        } else {
          setSpeechError(`Voice error: ${event.error}. You can still type below.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Could not start speech recognition:', err);
      setIsListening(false);
      setSpeechError('Microphone could not be started. Please type your message.');
    }
  };

  // Core Send Message Handler
  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText !== undefined ? messageText : input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: AiChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      // Backend call to RAG AI endpoint
      const payload = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendAiChatMessage(payload, location.pathname);

      const botMsg: AiChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        actions: res.actions || [],
        data: res.data || {},
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMsg]);

      // If in Voice Mode, automatically speak the AI's response!
      if (isVoiceMode && res.reply) {
        speakText(res.reply, botMsg.id!);
      }
    } catch (err: any) {
      console.error('AI chat error:', err);
      const errMsg: AiChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `Mafi chahta hoon, network connect karne me samasya aayi. Kripya punah prayas karein ya apna ticket dashboard me check karein. 🐬`,
        actions: [
          { label: 'View Dashboard', url: '/dashboard', type: 'navigate', variant: 'primary' },
          { label: 'Explore Ships', url: '/explore', type: 'navigate', variant: 'outline' },
        ],
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action: AiAction) => {
    if (action.url) {
      if (action.url.startsWith('http')) {
        window.open(action.url, '_blank');
      } else {
        // Auto-minimize when clicking a route so user sees destination page while keeping chat easily resumable
        if (onMinimize) {
          onMinimize();
        }
        navigate(action.url);
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (confirm('Clear current conversation history?')) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setActiveSpeakingMsgId(null);
      sessionStorage.removeItem('cruise_hunt_ai_chat');
      sessionStorage.removeItem('cross_hunt_ai_chat');
      setMessages([
        {
          id: 'welcome_reset',
          role: 'assistant',
          content: 'Chat history cleared. How can I assist you with your cruise journey today? 🐬🌊',
          timestamp: Date.now(),
          actions: [
            { label: 'Browse Public Cruises', url: '/tours', type: 'navigate', variant: 'primary' },
            { label: 'Explore Private Yachts', url: '/explore', type: 'navigate', variant: 'outline' },
          ],
        },
      ]);
    }
  };

  if (!isOpen) return null;

  // Minimized Floating Pill view
  if (isMinimized) {
    const handleResume = onResume || onMinimize;
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleResume}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleResume();
          }
        }}
        className="fixed bottom-5 right-5 z-[60] flex items-center gap-3 bg-gradient-to-r from-sky-600 to-blue-700 text-white px-4 py-3 rounded-full shadow-2xl hover:shadow-sky-500/40 cursor-pointer border border-sky-400/40 hover:scale-105 active:scale-95 transition-all duration-300 group select-none"
      >
        <div className="relative w-8 h-8 rounded-full overflow-hidden bg-white/20 p-0.5 pointer-events-none">
          <img src="/dolphin_icon.png" alt="Dolphin" className="w-full h-full object-contain" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full animate-ping" />
        </div>
        <div className="text-left pointer-events-none">
          <div className="text-xs font-bold leading-none flex items-center gap-1.5">
            Cruise-Hunt AI 🐬
          </div>
          <div className="text-[10px] text-sky-100 font-medium">Click to resume chat</div>
        </div>
        <Maximize2 className="w-4 h-4 ml-1 text-sky-200 group-hover:text-white pointer-events-none" />
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 w-[94vw] sm:w-[440px] md:w-[480px] max-w-[480px] h-[85vh] max-h-[700px] flex flex-col bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-sky-200/80 overflow-hidden transition-all duration-300 font-sans`}
      style={{
        boxShadow: '0 20px 50px -10px rgba(14, 165, 233, 0.25), 0 0 0 1px rgba(186, 230, 253, 0.4)',
      }}
    >
      {/* ============================================================== */}
      {/* 1. CHAT HEADER                                                 */}
      {/* ============================================================== */}
      <div className="relative px-4 py-3.5 bg-gradient-to-r from-sky-600 via-sky-700 to-blue-800 text-white flex items-center justify-between shadow-md">
        {/* Left: Avatar & Title */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-2xl bg-white/15 p-1 border border-white/20 shadow-inner flex items-center justify-center">
            <img src="/dolphin_icon.png" alt="Dolphin" className="w-8 h-8 object-contain" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-sky-700 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-base tracking-tight leading-tight">Cruise-Hunt AI</h3>
              <span className="text-xs bg-sky-500/40 text-sky-100 px-1.5 py-0.5 rounded-full font-medium border border-sky-400/30">
                Guide
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-sky-100/90 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Online • Your Cruise Guide
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1">
          {/* Voice Mode Toggle */}
          <button
            onClick={() => setIsVoiceMode(!isVoiceMode)}
            className={`p-1.5 rounded-xl transition-all ${
              isVoiceMode
                ? 'bg-amber-400 text-slate-900 shadow-md font-bold'
                : 'text-sky-100 hover:bg-white/10'
            }`}
            title={isVoiceMode ? 'Exit Voice Mode' : 'Open Full Voice Mode'}
          >
            <Radio className="w-4 h-4" />
          </button>

          {/* Clear History */}
          <button
            onClick={handleClearHistory}
            className="p-1.5 text-sky-200 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="Clear Chat History"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Minimize */}
          <button
            onClick={onMinimize}
            className="p-1.5 text-sky-200 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="Minimize"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 text-sky-200 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. VOICE MODE OVERLAY (Dedicated Voice Card View)              */}
      {/* ============================================================== */}
      {isVoiceMode ? (
        <div className="flex-1 bg-gradient-to-b from-sky-900 via-blue-900 to-slate-950 text-white flex flex-col items-center justify-between p-6 relative overflow-hidden">
          {/* Back button */}
          <div className="w-full flex justify-between items-center z-10">
            <button
              onClick={() => setIsVoiceMode(false)}
              className="text-xs text-sky-200 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full flex items-center gap-1 transition-all"
            >
              ← Back to Chat
            </button>
            <span className="text-xs text-amber-300 font-semibold tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              LIVE VOICE INTERACTION
            </span>
          </div>

          {/* Central 3D / 2D Animated Dolphin Avatar */}
          <div className="flex flex-col items-center justify-center my-auto z-10">
            <div className="relative">
              <div className="w-40 h-40 sm:w-48 sm:h-48 relative flex items-center justify-center">
                <DolphinAvatar3D
                  isSpeaking={activeSpeakingMsgId !== null}
                  isThinking={isLoading}
                  size={190}
                />
              </div>

              {/* Sound waves visualization rings */}
              {(isListening || activeSpeakingMsgId !== null) && (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-sky-400/40 animate-ping pointer-events-none" />
                  <div className="absolute -inset-4 rounded-full border border-sky-300/20 animate-pulse pointer-events-none" />
                </>
              )}
            </div>

            <div className="text-center mt-4">
              <h4 className="text-lg font-bold text-white">
                {isListening
                  ? 'Listening... Speak now 🎙️'
                  : activeSpeakingMsgId !== null
                  ? 'Speaking answer... 🔊'
                  : 'Tap the mic and speak'}
              </h4>
              <p className="text-xs text-sky-200 mt-1 max-w-xs">
                "Mumbai se Goa cruise dikhao" ya "Mera ticket code CH123456 hai"
              </p>
            </div>

            {/* Live voice transcript bubble */}
            {input && (
              <div className="mt-4 px-4 py-2 bg-white/15 backdrop-blur-md rounded-2xl text-xs text-sky-100 max-w-xs border border-white/20 text-center animate-fade-in">
                "{input}"
              </div>
            )}
          </div>

          {/* Mic Button & Controls */}
          <div className="flex flex-col items-center gap-3 w-full z-10 pb-2">
            {speechError && (
              <div className="text-xs text-rose-300 bg-rose-950/60 border border-rose-500/40 px-3 py-1.5 rounded-xl text-center">
                {speechError}
              </div>
            )}

            <div className="flex items-center gap-4">
              <button
                onClick={toggleSpeechRecognition}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all transform hover:scale-105 active:scale-95 ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse ring-8 ring-rose-400/30'
                    : 'bg-sky-500 hover:bg-sky-400 text-white ring-4 ring-sky-300/30'
                }`}
                title={isListening ? 'Stop listening' : 'Start speaking'}
              >
                {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>

              {activeSpeakingMsgId && (
                <button
                  onClick={() => {
                    window.speechSynthesis?.cancel();
                    setActiveSpeakingMsgId(null);
                  }}
                  className="w-12 h-12 rounded-full bg-slate-800 text-amber-300 flex items-center justify-center border border-amber-400/30 shadow-lg hover:bg-slate-700"
                  title="Stop speaking"
                >
                  <VolumeX className="w-5 h-5" />
                </button>
              )}
            </div>
            <span className="text-[11px] text-sky-300">Hindi • Hinglish • English supported</span>
          </div>
        </div>
      ) : (
        <>
          {/* ============================================================== */}
          {/* 3. SUGGESTIONS CHIPS BAR                                       */}
          {/* ============================================================== */}
          <div className="px-3 py-2 bg-sky-50/70 border-b border-sky-100 overflow-x-auto scrollbar-none flex items-center gap-1.5 text-xs select-none">
            {suggestions.map((sug) => (
              <button
                key={sug.id}
                onClick={() => handleSend(sug.query)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white hover:bg-sky-600 hover:text-white text-slate-700 font-medium text-[11px] shadow-sm border border-sky-200/80 transition-all flex items-center gap-1 active:scale-95"
              >
                {sug.label}
              </button>
            ))}
          </div>

          {/* ============================================================== */}
          {/* 4. MESSAGE STREAM                                              */}
          {/* ============================================================== */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-sky-50/20 to-white/60">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const isSpeaking = activeSpeakingMsgId === msg.id;

              return (
                <div
                  key={msg.id || index}
                  className={`flex gap-2.5 items-start ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar Icon */}
                  {!isUser ? (
                    <div className="w-7 h-7 rounded-xl bg-sky-100 p-0.5 border border-sky-200 flex-shrink-0 mt-0.5 overflow-hidden shadow-sm">
                      <img
                        src="/dolphin_icon.png"
                        alt="AI"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-sky-700 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      {user ? (user.username?.[0] || 'U').toUpperCase() : 'U'}
                    </div>
                  )}

                  {/* Bubble Content */}
                  <div
                    className={`max-w-[82%] text-sm rounded-2xl px-3.5 py-2.5 shadow-sm ${
                      isUser
                        ? 'bg-gradient-to-r from-sky-600 to-blue-700 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none shadow-sky-500/5'
                    }`}
                  >
                    {/* Message Text with simple markdown formatting */}
                    <div className="whitespace-pre-line leading-relaxed text-[13px]">
                      {msg.content.split('\n').map((line, lIdx) => {
                        // Bold markdown parser
                        const parts = line.split(/(\*\*.*?\*\*)/g);
                        return (
                          <span key={lIdx}>
                            {parts.map((p, pIdx) => {
                              if (p.startsWith('**') && p.endsWith('**')) {
                                return (
                                  <strong key={pIdx} className="font-semibold text-slate-900">
                                    {p.slice(2, -2)}
                                  </strong>
                                );
                              }
                              return p;
                            })}
                            {lIdx < msg.content.split('\n').length - 1 && <br />}
                          </span>
                        );
                      })}
                    </div>

                    {/* Interactive Action Buttons */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {msg.actions.map((act, aIdx) => (
                          <button
                            key={aIdx}
                            onClick={() => handleActionClick(act)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all shadow-sm ${
                              act.variant === 'primary'
                                ? 'bg-sky-600 text-white hover:bg-sky-700 active:scale-95'
                                : act.variant === 'outline'
                                ? 'bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100 active:scale-95'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95'
                            }`}
                          >
                            <span>{act.label}</span>
                            <ChevronRight className="w-3 h-3 opacity-70" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Footer Controls: Speak button & Copy */}
                    {!isUser && (
                      <div className="mt-2 pt-1 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="text-[10px]">Cruise-Hunt AI 🐬</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => speakText(msg.content, msg.id!)}
                            className={`p-1 rounded-md transition-all flex items-center gap-1 ${
                              isSpeaking
                                ? 'text-sky-600 bg-sky-50 font-medium'
                                : 'hover:text-slate-600'
                            }`}
                            title={isSpeaking ? 'Stop speaking' : 'Read aloud in voice'}
                          >
                            {isSpeaking ? (
                              <>
                                <VolumeX className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Speaking...</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Speak</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleCopy(msg.content, msg.id!)}
                            className="p-1 hover:text-slate-600 rounded-md transition-all"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-xl bg-sky-100 p-0.5 border border-sky-200 flex-shrink-0 animate-bounce">
                  <img src="/dolphin_icon.png" alt="AI" className="w-full h-full object-contain" />
                </div>
                <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2 text-slate-500 text-xs">
                  <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
                  <span>Cruise-Hunt AI is thinking & finding cruises...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ============================================================== */}
          {/* 5. INPUT & VOICE BAR                                           */}
          {/* ============================================================== */}
          <div className="p-3 bg-white border-t border-slate-200">
            {speechError && (
              <div className="mb-2 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center justify-between">
                <span>{speechError}</span>
                <button
                  onClick={() => setSpeechError(null)}
                  className="font-bold text-rose-400 hover:text-rose-700 ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 focus-within:border-sky-500 focus-within:bg-white rounded-2xl p-1.5 transition-all shadow-inner">
              {/* Text Input */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isListening ? 'Listening... Speak now' : 'Type in Hindi, Hinglish or English...'}
                rows={1}
                className="flex-1 bg-transparent border-none outline-none resize-none px-2.5 py-1.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 max-h-24 overflow-y-auto"
              />

              {/* Microphone Speech-to-Text Button */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`p-2 rounded-xl transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md ring-2 ring-rose-400'
                    : 'text-slate-500 hover:text-sky-600 hover:bg-sky-50'
                }`}
                title={isListening ? 'Stop listening' : 'Speak into microphone'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className={`p-2 rounded-xl transition-all shadow-sm ${
                  input.trim() && !isLoading
                    ? 'bg-sky-600 text-white hover:bg-sky-700 active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title="Send message"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 mt-1.5">
              <span>Enter ↵ to send • Shift+Enter for new line</span>
              <span className="flex items-center gap-1 font-medium text-sky-700">
                <Sparkles className="w-3 h-3 text-sky-500" />
                Cruise-Hunt Assistant v2.0
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const CrossHuntChatModal = CruiseHuntChatModal;
