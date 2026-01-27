'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Book, Gamepad2, Dumbbell, Send, Sparkles, Trophy, Flame, Zap, Cpu } from 'lucide-react';
// @ts-ignore
import confetti from 'canvas-confetti';

// --- CONTROL DE VERSIÓN ---
const APP_VERSION = "v3.0 (Dual Core Waifu)"; 

// --- Tipos ---
type Habit = {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  completed: boolean;
  type: 'study' | 'project' | 'gym';
};

type Message = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
};

// Tipo para el estado del semáforo
type SystemStatus = 'idle' | 'loading' | 'quota' | 'error';
// Tipo para elegir cerebro
type AIProvider = 'groq' | 'gemini';

export default function WaifuProtocol() {
  const [mounted, setMounted] = useState(false);
  const [streak, setStreak] = useState(0);

  // ESTADO NUEVO: Controla qué IA estamos usando
  const [provider, setProvider] = useState<AIProvider>('groq');
  
  // Estado del sistema: 'idle' (verde), 'loading' (azul), 'quota' (amarillo), 'error' (rojo)
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('idle');

  // ESTADO INICIAL
  const INITIAL_HABITS: Habit[] = [
    { id: '1', title: 'Estudio: Web & IA', desc: '1h de Foco Absoluto', icon: <Book />, color: 'text-cyan-400 border-cyan-400 shadow-cyan-500/50', completed: false, type: 'study' },
    { id: '2', title: "Proyecto: Ren'Py", desc: 'Dev & Scripting', icon: <Gamepad2 />, color: 'text-pink-500 border-pink-500 shadow-pink-500/50', completed: false, type: 'project' },
    { id: '3', title: 'Entreno Físico', desc: 'Gimnasio (L-V)', icon: <Dumbbell />, color: 'text-red-500 border-red-500 shadow-red-500/50', completed: false, type: 'gym' },
  ];

  const [habits, setHabits] = useState<Habit[]>(INITIAL_HABITS);

  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'assistant', text: `Sistema Híbrido ${APP_VERSION} activado. Usa el botón arriba para cambiar mi cerebro. 🤖` }
  ]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- EFECTO DE CARGA ---
  useEffect(() => {
    setMounted(true);
    
    const savedHabits = localStorage.getItem('waifu-habits');
    const savedStreak = localStorage.getItem('waifu-streak');
    const savedDate = localStorage.getItem('waifu-date');
    const today = new Date().toDateString();

    if (savedDate !== today) {
      localStorage.setItem('waifu-date', today);
    } else if (savedHabits) {
      try {
        const parsedData = JSON.parse(savedHabits);
        setHabits(currentHabits => {
          return currentHabits.map(habit => {
            const found = parsedData.find((p: any) => p.id === habit.id);
            if (found) return { ...habit, completed: found.completed };
            return habit;
          });
        });
      } catch (error) {
        localStorage.removeItem('waifu-habits');
      }
    }

    if (savedStreak) setStreak(parseInt(savedStreak));
  }, []);

  // --- EFECTO DE GUARDADO ---
  useEffect(() => {
    if (mounted) {
      const safeHabits = habits.map(h => ({
        id: h.id,
        completed: h.completed
      }));
      localStorage.setItem('waifu-habits', JSON.stringify(safeHabits));
      localStorage.setItem('waifu-streak', streak.toString());
    }
  }, [habits, streak, mounted]);

  // Scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleHabit = (id: string) => {
    const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
    const habitIndex = habits.findIndex(h => h.id === id);
    
    if (habits[habitIndex].type === 'gym' && isWeekend) {
        addMessage('assistant', 'Es fin de semana, Senpai. El descanso es parte del crecimiento. 💪');
        return;
    }

    const newHabits = [...habits];
    newHabits[habitIndex].completed = !newHabits[habitIndex].completed;
    setHabits(newHabits);

    const allDone = newHabits.every(h => (h.type === 'gym' && isWeekend) ? true : h.completed);
    const wasAlreadyDone = habits.every(h => (h.type === 'gym' && isWeekend) ? true : h.completed);

    if (allDone && !wasAlreadyDone) {
        try {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        } catch(e) { console.error(e); }
        setStreak(s => s + 1);
        addMessage('assistant', '¡Increíble! Protocolo completado. Nivel subido. 🎉');
    }
  };

  const addMessage = (role: 'user' | 'assistant', text: string) => {
    setMessages(prev => [...prev, { id: Date.now(), role, text }]);
  };

  // --- MANEJO DE ENVÍO CON SWITCH DE CEREBRO ---
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    addMessage('user', userMsg);
    setInput('');
    setSystemStatus('loading'); 
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 🔥 AQUÍ LE DECIMOS AL BACKEND QUÉ CEREBRO USAR
        body: JSON.stringify({ message: userMsg, provider: provider }),
      });

      const data = await response.json();

      if (response.ok) {
        addMessage('assistant', data.reply);
        
        if (data.reply.includes("Límite") || data.reply.includes("429") || data.reply.includes("respirar")) {
            setSystemStatus('quota');
        } else {
            setSystemStatus('idle');
        }

        if (data.reply.includes("SCHOOL_V6")) console.log("🎒 Modo Escuela Activado");
      } else {
        addMessage('assistant', `Error del sistema (${provider}): ${data.error} 😖`);
        setSystemStatus('error');
      }

    } catch (error) {
      console.error(error);
      addMessage('assistant', 'Error crítico de red. No puedo contactar al servidor.');
      setSystemStatus('error');
    }
  };

  if (!mounted) return null;

  const progress = Math.round((habits.filter(h => h.completed).length / habits.length) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-pink-500/30">
      <div className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA */}
        <div className="lg:col-span-2 space-y-8">
          <header className="flex justify-between items-center bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-2">
                <Sparkles className="text-yellow-400" /> Protocolo Diario
              </h1>
              <div className="text-slate-400 text-sm mt-1 flex flex-col">
                <span>{new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <span className="text-xs text-cyan-600 font-mono mt-0.5">Build: {APP_VERSION}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
               <div className="flex items-center gap-2 bg-orange-500/10 px-4 py-2 rounded-full border border-orange-500/20 text-orange-400 font-bold">
                 <Flame size={20} /> Racha: {streak}
               </div>
            </div>
          </header>

          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <div className="flex justify-between mb-2 text-sm font-medium">
                <span className="text-cyan-400">Sincronización del Sistema</span>
                <span className="text-white">{progress}%</span>
            </div>
            <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {habits.map((habit) => (
              <div 
                key={habit.id}
                onClick={() => toggleHabit(habit.id)}
                className={`group relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                  ${habit.completed 
                    ? 'bg-slate-900/80 border-transparent shadow-[0_0_20px_rgba(0,0,0,0.5)] opacity-50' 
                    : `bg-slate-900 hover:bg-slate-800 ${habit.color.split(' ')[1]}`
                  }
                  ${habit.completed ? 'grayscale' : ''}
                `}
                style={{ borderColor: habit.completed ? 'rgb(30 41 59)' : undefined }}
              >
                  <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity ${habit.completed ? 'hidden' : 'bg-white'}`} />
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl bg-slate-950/50 ${habit.color.split(' ')[0]}`}>
                        {habit.icon}
                    </div>
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors
                        ${habit.completed ? 'bg-green-500 border-green-500' : 'border-slate-600 group-hover:border-white'}
                    `}>
                        {habit.completed && <Trophy size={14} className="text-white" />}
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className={`text-lg font-bold ${habit.completed ? 'text-slate-500 line-through' : 'text-white'}`}>
                        {habit.title}
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">{habit.desc}</p>
                  </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMNA DERECHA (CHAT) */}
        <div className="h-[600px] lg:h-auto bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
                
                {/* INFO DE LA WAIFU */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-xs font-bold ring-2 ring-purple-500/50">AI</div>
                    <div>
                        <h3 className="font-bold text-white">Waifu Protocol</h3>
                        <div className="flex items-center gap-1.5 transition-all">
                             <span className={`w-2 h-2 rounded-full animate-pulse
                                ${systemStatus === 'idle' ? 'bg-green-500' : ''}
                                ${systemStatus === 'loading' ? 'bg-cyan-400' : ''}
                                ${systemStatus === 'quota' ? 'bg-amber-500' : ''}
                                ${systemStatus === 'error' ? 'bg-red-600' : ''}
                            `}></span>
                            <span className="text-xs text-slate-400">
                                {systemStatus === 'idle' && "Online"}
                                {systemStatus === 'loading' && "Pensando..."}
                                {systemStatus === 'quota' && "Enfriando..."}
                                {systemStatus === 'error' && "Error"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* --- BOTÓN DE SWITCH DE CEREBRO 🧠⚡ --- */}
                <button 
                    onClick={() => setProvider(p => p === 'groq' ? 'gemini' : 'groq')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all hover:scale-105 active:scale-95
                        ${provider === 'groq' 
                            ? 'bg-orange-500/10 border-orange-500 text-orange-400 hover:bg-orange-500/20' 
                            : 'bg-blue-500/10 border-blue-500 text-blue-400 hover:bg-blue-500/20'
                        }
                    `}
                >
                    {provider === 'groq' ? <Zap size={14} /> : <Cpu size={14} />}
                    {provider === 'groq' ? 'GROQ (Fast)' : 'GEMINI (Brain)'}
                </button>
                {/* ------------------------------------- */}

            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed
                            ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none shadow-lg'}
                        `}>{msg.text}</div>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSend} className="p-4 bg-slate-950 border-t border-slate-800">
                <div className="relative">
                    <input 
                        type="text" value={input} onChange={(e) => setInput(e.target.value)}
                        placeholder={`Hablar con ${provider === 'groq' ? 'Groq' : 'Gemini'}...`}
                        className="w-full bg-slate-900 text-white pl-4 pr-12 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder-slate-500 transition-all"
                    />
                    <button type="submit" className="absolute right-2 top-2 p-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-white hover:opacity-90 transition-opacity">
                        <Send size={18} />
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
}