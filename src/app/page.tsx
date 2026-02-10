'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Book, Gamepad2, Dumbbell, Send, Sparkles, Trophy, X, Save, RefreshCw } from 'lucide-react';
// @ts-ignore
import confetti from 'canvas-confetti';
import PlayerStats from '../components/PlayerStats'; 

const APP_VERSION = "v8.0 (Img Gen + RPG)"; 

// --- TIPOS ---
type Habit = {
  id: number;
  title: string;
  description: string;
  icon_key: string;
  color_class: string;
  completed: boolean;
  metric_label: string;
  ai_persona: string;
};

type Message = { id: number; role: 'user' | 'assistant'; text: string; };
type AIProvider = 'groq' | 'gemini';

// --- COMPONENTE TOAST (Notificación Flotante) ---
const RPGToast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); 
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-xl border backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-5 duration-300 ${
      type === 'success' 
        ? 'bg-slate-900/90 border-green-500/50 text-green-400' 
        : 'bg-red-900/90 border-red-500/50 text-red-200'
    }`}>
      <div className={`p-2 rounded-full ${type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
        {type === 'success' ? <Trophy size={20} /> : <X size={20} />}
      </div>
      <div>
        <h4 className="font-bold text-sm tracking-wider">{type === 'success' ? 'SYSTEM UPDATE' : 'SYSTEM ERROR'}</h4>
        <p className="text-xs font-mono opacity-80">{message}</p>
      </div>
      <div className={`absolute bottom-0 left-0 h-1 ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} animate-[width_3s_linear_forwards] w-full`} />
    </div>
  );
};

// ==================================================================================
// ZONA DE CONFIGURACIÓN DE IMÁGENES
// ==================================================================================
const GYM_IMAGES = [
  '/assets/img/00001-2297212208.png', '/assets/img/00015-4109231265.png', '/assets/img/00016-4109231265.png',
  '/assets/img/00019-4109231265.png', '/assets/img/00021-4109231265.png', '/assets/img/00022-4109231265.png',
  '/assets/img/00023-4109231265.png', '/assets/img/00029-4109231265.png', '/assets/img/00030-4109231265.png',
  '/assets/img/00031-4109231265.png', '/assets/img/00032-4109231265.png', '/assets/img/00033-4109231265.png'
];

const CODE_IMAGES = [
  '/assets/img/00034-4109231265.png', '/assets/img/00035-4109231265.png', '/assets/img/00036-4109231265.png',
  '/assets/img/00038-4109231265.png', '/assets/img/00040-4109231265.png', '/assets/img/00042-4109231265.png',
  '/assets/img/00043-4109231265.png', '/assets/img/00044-4109231265.png', '/assets/img/00045-4109231265.png',
  '/assets/img/00046-4109231265.png', '/assets/img/00047-4109231265.png', '/assets/img/00049-4109231265.png',
  '/assets/img/00051-4109231265.png'
];

const STUDY_IMAGES = [
  '/assets/img/00052-4109231265.png', '/assets/img/00053-4109231265.png', '/assets/img/00054-4109231265.png',
  '/assets/img/00056-4109231265.png', '/assets/img/00057-4109231265.png', '/assets/img/00063-4109231265.png',
  '/assets/img/00059-4109231265.png', '/assets/img/00060-4109231265.png', '/assets/img/00062-4109231265.png',
  '/assets/img/00095-4109231265.png', '/assets/img/00097-4109231265.png', '/assets/img/00025-4109231265.png',
  '/assets/img/00028-4109231265.png'
];
const DEFAULT_FALLBACK = '/assets/img/00001-2297212208.png';

// ==================================================================================
// COMPONENTE PRINCIPAL
// ==================================================================================
export default function WaifuProtocol() {
  const [mounted, setMounted] = useState(false);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [streak, setStreak] = useState(0);
  
  // Estado para imágenes fijas (fila de arriba)
  const [fixedHabitImages, setFixedHabitImages] = useState<Record<number, string>>({});
  // Estado para rotación
  const [rotatedIndices, setRotatedIndices] = useState<Record<number, number>>({});
  // Estado para Toasts
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);

  // Chat & System
  const [messages, setMessages] = useState<Message[]>([{ id: 1, role: 'assistant', text: `Sistema v8.0 Online. ¿Qué vamos a construir hoy? 🏗️` }]);
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<AIProvider>('groq');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Modal State
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [logValue, setLogValue] = useState('');
  const [logNotes, setLogNotes] = useState('');

  // Helper para Toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
  };

  useEffect(() => { setMounted(true); fetchHabits(); }, []);

  // --- HELPERS DE IMÁGENES ---
  const getPoolForIcon = (iconKey: string) => {
    if (iconKey === 'dumbbell') return GYM_IMAGES;
    if (iconKey === 'gamepad') return CODE_IMAGES;
    if (iconKey === 'book') return STUDY_IMAGES;
    return [DEFAULT_FALLBACK];
  };

  const getRandomImageForHabit = (iconKey: string) => {
    const pool = getPoolForIcon(iconKey);
    if (!pool || pool.length === 0) return DEFAULT_FALLBACK;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const handleImageRotation = (e: React.MouseEvent, habitId: number, iconKey: string) => {
    e.stopPropagation();
    const pool = getPoolForIcon(iconKey);
    setRotatedIndices(prev => ({
      ...prev,
      [habitId]: ((prev[habitId] || 0) + 1) % pool.length
    }));
  };

  const fetchHabits = async () => {
    try {
      const localDate = new Date().toLocaleDateString('en-CA');
      const res = await fetch(`/api/habits?date=${localDate}`);
      const data = await res.json();
      
      if (data.habits) {
        setHabits(data.habits);
        setFixedHabitImages(prev => {
          const newImages = { ...prev };
          data.habits.forEach((h: Habit) => {
            if (h.icon_key !== 'gamepad' && !newImages[h.id]) {
              newImages[h.id] = getRandomImageForHabit(h.icon_key);
            }
          });
          return newImages;
        });
      }
      if (data.streak !== undefined) setStreak(data.streak);
    } catch (error) { console.error("Error cargando hábitos:", error); }
  };

  const handleHabitClick = (habit: Habit) => {
    if (habit.completed) return; 
    setSelectedHabit(habit); setLogValue(''); setLogNotes('');
  };

  const submitLog = async () => {
    if (!selectedHabit) return;
    try {
      const localDate = new Date().toLocaleDateString('en-CA'); 
      const res = await fetch('/api/log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_id: selectedHabit.id, date: localDate, value: parseFloat(logValue) || 0, notes: logNotes })
      });

      if (res.ok) {
        await fetchHabits(); 
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        
        // Rotar imagen si es el hábito especial
        if (selectedHabit.icon_key === 'gamepad') {
            const pool = getPoolForIcon(selectedHabit.icon_key);
            setRotatedIndices(prev => ({
                ...prev,
                [selectedHabit.id]: ((prev[selectedHabit.id] || 0) + 1) % pool.length
            }));
        }

        showToast(`Misión "${selectedHabit.title}" completada. XP Ganada.`, 'success');
        setSelectedHabit(null);
        handleAutoChat(`Completé "${selectedHabit.title}" con ${logValue}. Notas: "${logNotes}". Actúa como ${selectedHabit.ai_persona} y felicítame brevemente.`);
      }
    } catch (error) { 
        showToast("Error de conexión con el servidor ☁️❌", 'error'); 
    }
  };

  const handleAutoChat = async (prompt: string) => {
    setIsLoading(true);
    try {
        const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ message: prompt, provider: provider }) });
        const data = await res.json(); if (data.reply) addMessage('assistant', data.reply);
    } catch (e) { console.error(e); } setIsLoading(false);
  };

  const addMessage = (role: 'user' | 'assistant', text: string) => setMessages(prev => [...prev, { id: Date.now(), role, text }]);

  // --- HANDLE SEND CON IMÁGENES ---
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const msg = input;
    setInput('');
    addMessage('user', msg);
    setIsLoading(true);

    // 1. DETECTOR DE COMANDO /img
    if (msg.toLowerCase().startsWith('/img ')) {
      const prompt = msg.slice(5);
      // Link a Pollinations
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=768&nologo=true`;

      setTimeout(() => {
        addMessage('assistant', `IMAGE_GENERATED::${imageUrl}`);
        setIsLoading(false);
      }, 1500);
      return; 
    }

    // 2. LÓGICA NORMAL
    try {
        const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ message: msg, provider: provider }) });
        const data = await res.json(); 
        if (data.reply) addMessage('assistant', data.reply);
    } catch (e) { 
        addMessage('assistant', 'Error de conexión ❌'); 
    } 
    setIsLoading(false);
  };

  const getIcon = (key: string) => {
    if (key === 'book') return <Book />; if (key === 'gamepad') return <Gamepad2 />; if (key === 'dumbbell') return <Dumbbell />; return <Sparkles />;
  };

  if (!mounted) return null;
  const progress = Math.round((habits.filter(h => h.completed).length / (habits.length || 1)) * 100);

  const topRowHabits = habits.filter(h => h.icon_key !== 'gamepad');
  const specialHabit = habits.find(h => h.icon_key === 'gamepad');

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-pink-500/50 relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,_#330033_0%,_#000000_100%)]"></div>

      {/* --- MODAL --- */}
      {selectedHabit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900/90 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-[0_0_50px_rgba(236,72,153,0.3)]">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-white"><span className={selectedHabit.color_class.split(' ')[0]}>{getIcon(selectedHabit.icon_key)}</span> Misión: {selectedHabit.title}</h3>
                    <button onClick={() => setSelectedHabit(null)} className="text-slate-400 hover:text-white"><X /></button>
                </div>
                <div className="space-y-4">
                    <div><label className="block text-sm text-cyan-400 mb-1 font-mono">{selectedHabit.metric_label.toUpperCase()}</label><input type="number" className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 font-mono text-lg" placeholder="00" value={logValue} onChange={(e) => setLogValue(e.target.value)} autoFocus /></div>
                    <div><label className="block text-sm text-pink-400 mb-1 font-mono">REPORTE</label><textarea className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:border-pink-500 h-24 resize-none" placeholder="Detalles..." value={logNotes} onChange={(e) => setLogNotes(e.target.value)} /></div>
                </div>
                <button onClick={submitLog} disabled={!logValue} className="w-full mt-8 bg-gradient-to-r from-pink-600 to-purple-700 hover:from-pink-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"><Save size={18} /> CONFIRMAR</button>
            </div>
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA */}
        <div className="lg:col-span-2 space-y-8">
          
          <header className="flex justify-between items-end pb-4 border-b border-white/10">
            <div>
              <h1 className="text-4xl font-black italic tracking-tighter bg-gradient-to-r from-white via-cyan-200 to-pink-300 bg-clip-text text-transparent flex items-center gap-3">PROTOCOL <span className="text-pink-500">WAIFU</span></h1>
              <div className="text-slate-500 font-mono text-sm mt-1 flex items-center gap-2"><span>System Status: ONLINE</span><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span></div>
            </div>
             <div className="flex flex-col items-end"><span className="text-xs text-slate-500 font-mono block">DAILY STREAK</span><span className="text-3xl font-black text-white">{streak} <span className="text-orange-500 text-lg">DAYS</span></span></div>
          </header>

          <PlayerStats habits={habits} />
          
          {/* Grid Fila Superior */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {topRowHabits.map((habit) => (
              <div key={habit.id} onClick={() => handleHabitClick(habit)} className={`group relative h-64 rounded-2xl border transition-all duration-500 overflow-hidden flex flex-col justify-end ${habit.completed ? 'border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.4)] cursor-default scale-[1.01]' : 'border-slate-800 hover:border-pink-500 cursor-pointer hover:-translate-y-1'}`}>
                  <div className="absolute inset-0 z-0 transition-all duration-1000 ease-out bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${fixedHabitImages[habit.id] || DEFAULT_FALLBACK})`, filter: habit.completed ? 'none' : 'blur(15px) grayscale(100%) brightness(0.2)' }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                  </div>
                  <div className="relative z-20 p-6">
                      <div className="flex justify-between items-end mb-2">
                          <div className={`p-3 rounded-xl backdrop-blur-md border ${habit.completed ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200' : 'bg-black/40 border-white/10 text-slate-300'}`}>{getIcon(habit.icon_key)}</div>
                          {habit.completed ? (<div className="bg-cyan-500 text-black font-bold px-3 py-1 rounded-full text-xs shadow-lg animate-bounce">COMPLETED</div>) : (<div className="text-xs text-pink-500 font-mono animate-pulse">LOCKED</div>)}
                      </div>
                      <h3 className={`text-2xl font-black uppercase italic tracking-wider ${habit.completed ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)]' : 'text-slate-400'}`}>{habit.title}</h3>
                      <p className={`text-sm font-medium mt-1 mb-3 px-2 py-1 rounded-md inline-block backdrop-blur-sm line-clamp-2 ${habit.completed ? 'text-cyan-100 bg-cyan-900/40 border border-cyan-500/30' : 'text-slate-300 bg-black/60 border border-white/10'}`}>{habit.description}</p>
                      <div className="w-full h-1 bg-white/10 mt-1 rounded-full overflow-hidden"><div className={`h-full transition-all duration-700 ${habit.completed ? 'w-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]' : 'w-0'}`} /></div>
                  </div>
              </div>
            ))}
          </div>

          {/* Marco Vertical */}
          {specialHabit && (
            (() => {
              const pool = getPoolForIcon(specialHabit.icon_key);
              const currentIndex = rotatedIndices[specialHabit.id] || 0;
              const currentImage = pool[currentIndex % pool.length];

              return (
                <div 
                  key={specialHabit.id}
                  onClick={() => handleHabitClick(specialHabit)}
                  className={`group relative aspect-[2/3] w-full rounded-3xl border-2 transition-all duration-500 overflow-hidden flex flex-col justify-between
                    ${specialHabit.completed 
                      ? 'border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.5)] cursor-default scale-[1.01]' 
                      : 'border-slate-800 hover:border-purple-500 cursor-pointer hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:-translate-y-1'
                    }
                  `}
                >
                    <div 
                        className="absolute inset-0 z-0 transition-all duration-700 ease-in-out bg-cover bg-center bg-no-repeat"
                        style={{
                            backgroundImage: `url(${currentImage})`,
                            filter: specialHabit.completed ? 'none' : 'blur(15px) grayscale(100%) brightness(0.2)'
                        }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90" />
                    </div>
                    
                    <div className="relative z-20 p-6 flex justify-between items-start">
                      <div className={`p-3 rounded-xl backdrop-blur-md border ${specialHabit.completed ? 'bg-purple-500/20 border-purple-400/50 text-purple-200' : 'bg-black/40 border-white/10 text-slate-300'}`}>
                          {getIcon(specialHabit.icon_key)}
                      </div>
                      <button 
                        onClick={(e) => handleImageRotation(e, specialHabit.id, specialHabit.icon_key)}
                        className="p-3 rounded-full bg-black/50 hover:bg-purple-500/50 border border-white/10 hover:border-purple-400 text-white transition-all shadow-lg hover:rotate-180 duration-500 group-hover:scale-110"
                      >
                        <RefreshCw size={20} />
                      </button>
                    </div>

                    <div className="relative z-20 p-8 pt-0 text-center">
                        {specialHabit.completed ? (
                            <div className="inline-block bg-purple-500 text-black font-bold px-4 py-1 rounded-full text-sm shadow-lg animate-bounce mb-2">MISSION ACCOMPLISHED</div>
                        ) : (
                            <div className="text-sm text-purple-400 font-mono animate-pulse mb-2">LOCKED // DEV MODE</div>
                        )}
                        <h3 className={`text-4xl font-black uppercase italic tracking-wider ${specialHabit.completed ? 'text-white drop-shadow-[0_4px_8px_rgba(0,0,0,1)]' : 'text-slate-400'}`}>{specialHabit.title}</h3>
                        <div className="w-full h-2 bg-white/10 mt-4 rounded-full overflow-hidden mx-auto max-w-md">
                            <div className={`h-full transition-all duration-700 ${specialHabit.completed ? 'w-full bg-purple-400 shadow-[0_0_15px_#a855f7]' : 'w-0'}`} />
                        </div>
                    </div>
                </div>
              );
            })()
          )}

          {habits.length === 0 && (<div className="p-12 text-center text-slate-600 border border-slate-800 border-dashed rounded-3xl"><Sparkles className="animate-spin inline mb-4"/> Cargando...</div>)}
        </div>

        {/* CHATBOT LATERAL */}
        <div className="h-[600px] lg:h-auto bg-slate-900/80 border border-slate-700 rounded-3xl flex flex-col overflow-hidden shadow-2xl relative backdrop-blur-xl">
            <div className="bg-black/50 p-4 border-b border-slate-700 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-lg">AI</div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></span>
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">System Operator</h3>
                        <span className="text-[10px] text-slate-400 font-mono">v8.0 (Img Gen)</span>
                    </div>
                </div>
                <button 
  onClick={() => setProvider(p => p === 'groq' ? 'gemini' : 'groq')} 
  className={`text-[10px] font-bold uppercase tracking-wider transition-all border rounded px-3 py-1 ${
    provider === 'groq' 
      ? 'text-orange-400 border-orange-500/50 hover:bg-orange-900/30 shadow-[0_0_10px_rgba(251,146,60,0.2)]' 
      : 'text-blue-400 border-blue-500/50 hover:bg-blue-900/30 shadow-[0_0_10px_rgba(96,165,250,0.2)]'
  }`}
>
  Model: {provider}
</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-pink-900 scrollbar-track-transparent">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-md ${msg.role === 'user' ? 'bg-gradient-to-r from-cyan-700 to-blue-700 text-white rounded-br-sm' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm'}`}>
                            {msg.text.startsWith('IMAGE_GENERATED::') ? (
                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] font-mono text-pink-400 tracking-widest border-b border-pink-500/20 pb-1 mb-1 flex items-center gap-2">
                                        <Sparkles size={10} /> GENERATING ASSET...
                                    </span>
                                    <img 
                                        src={msg.text.replace('IMAGE_GENERATED::', '')} 
                                        alt="AI Generated Content" 
                                        className="rounded-lg w-full h-auto border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.2)] hover:scale-[1.02] transition-transform duration-300"
                                        loading="lazy"
                                    />
                                </div>
                            ) : (
                                <span>{msg.text}</span>
                            )}
                        </div>
                    </div>
                ))}
                
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800/50 rounded-2xl p-3 flex gap-1 items-center">
                            <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-75"></span>
                            <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-150"></span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 bg-black/40 border-t border-slate-700">
                <div className="relative">
                    <input 
                        type="text" 
                        value={input} 
                        onChange={(e) => setInput(e.target.value)} 
                        placeholder="Escribe /img cyberpunk city..." 
                        className="w-full bg-slate-800/50 text-white pl-4 pr-12 py-4 rounded-xl border border-slate-700 focus:outline-none focus:border-pink-500 transition-all placeholder:text-slate-600 text-sm" 
                    />
                    <button type="submit" className="absolute right-3 top-3 p-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg transition-colors shadow-lg shadow-pink-500/20">
                        <Send size={16} />
                    </button>
                </div>
            </form>
        </div>
      </div>

      {/* TOASTS RENDER */}
      {toast && toast.show && (
        <RPGToast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

    </div>
  );
}