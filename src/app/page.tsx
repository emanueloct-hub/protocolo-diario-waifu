'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Book, Gamepad2, Dumbbell, Send, Sparkles, Trophy, Flame, Zap, Cpu, X, Save } from 'lucide-react';
// @ts-ignore
import confetti from 'canvas-confetti';

const APP_VERSION = "v4.0 (Cloud Waifu)"; 

// --- Tipos Adaptados a la Base de Datos V2 ---
type Habit = {
  id: number; // Ahora es number porque viene de SQL
  title: string;
  description: string;
  icon_key: string;
  color_class: string;
  type: string;
  completed: boolean;
  metric_label: string;
  ai_persona: string;
};

type Message = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
};

type AIProvider = 'groq' | 'gemini';

export default function WaifuProtocol() {
  const [mounted, setMounted] = useState(false);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [streak, setStreak] = useState(0); // TODO: Calcular racha real desde DB
  
  // Chat & System
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'assistant', text: `Sistema Cloud ${APP_VERSION} en línea. ¿Qué lograste hoy, Senpai? ☁️` }
  ]);
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<AIProvider>('groq');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- MODAL STATE (La Ventanita) ---
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [logValue, setLogValue] = useState('');
  const [logNotes, setLogNotes] = useState('');

  // 1. CARGA INICIAL (Traer datos de la Nube)
  useEffect(() => {
    setMounted(true);
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    try {
      // TRUCO: Le mandamos la fecha local al servidor para que coincidan
      const localDate = new Date().toLocaleDateString('en-CA'); // Formato YYYY-MM-DD local
      
      const res = await fetch(`/api/habits?date=${localDate}`); // <-- OJO AQUÍ
      const data = await res.json();
      
      if (data.habits) setHabits(data.habits);
      if (data.streak !== undefined) setStreak(data.streak); // <-- ACTUALIZA LA RACHA
      
    } catch (error) {
      console.error("Error cargando hábitos:", error);
    }
  };

  // 2. ABRIR EL MODAL (Cuando das clic a un hábito)
  const handleHabitClick = (habit: Habit) => {
    if (habit.completed) return; // Si ya está hecho, no hacemos nada (por ahora)
    setSelectedHabit(habit);
    setLogValue('');
    setLogNotes('');
  };

  // 3. GUARDAR EL PROGRESO (Botón "Registrar" del Modal)
  const submitLog = async () => {
    if (!selectedHabit) return;

    try {
      // USAR SIEMPRE FORMATO ESTÁNDAR (YYYY-MM-DD)
      const localDate = new Date().toLocaleDateString('en-CA'); 

      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habit_id: selectedHabit.id,
          date: localDate, // <-- Mandamos la misma fecha
          value: parseFloat(logValue) || 0,
          notes: logNotes
        })
      });

      if (res.ok) {
        // Recargar todo desde el servidor para actualizar racha y checks
        await fetchHabits(); 
        setSelectedHabit(null);
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        
        // ¡LA WAIFU REACCIONA A TU LOGRO!
        // Le mandamos el contexto de lo que acabas de hacer
        const reactionPrompt = `
          Acabo de completar el hábito: "${selectedHabit.title}".
          Mi resultado fue: ${logValue} (${selectedHabit.metric_label}).
          Mis notas: "${logNotes}".
          
          Actúa como: ${selectedHabit.ai_persona}
          Felicítame y dame feedback corto.
        `;
        
        // Disparamos el chat automático
        handleAutoChat(reactionPrompt);
      }

    } catch (error) {
      console.error("Error guardando:", error);
      alert("Error al guardar en la nube ☁️❌");
    }
  };

  // Función auxiliar para que la IA hable sola
  const handleAutoChat = async (prompt: string) => {
    setIsLoading(true);
    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            body: JSON.stringify({ message: prompt, provider: provider })
        });
        const data = await res.json();
        if (data.reply) addMessage('assistant', data.reply);
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const addMessage = (role: 'user' | 'assistant', text: string) => {
    setMessages(prev => [...prev, { id: Date.now(), role, text }]);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const msg = input;
    setInput('');
    addMessage('user', msg);
    setIsLoading(true);

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            body: JSON.stringify({ message: msg, provider: provider })
        });
        const data = await res.json();
        if (data.reply) addMessage('assistant', data.reply);
    } catch (e) {
        addMessage('assistant', 'Error de conexión ❌');
    }
    setIsLoading(false);
  };

  // Helper para iconos dinámicos
  const getIcon = (key: string) => {
    if (key === 'book') return <Book />;
    if (key === 'gamepad') return <Gamepad2 />;
    if (key === 'dumbbell') return <Dumbbell />;
    return <Sparkles />;
  };

  if (!mounted) return null;
  const progress = Math.round((habits.filter(h => h.completed).length / (habits.length || 1)) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-pink-500/30 relative">
      
      {/* --- MODAL (VENTANA EMERGENTE) --- */}
      {selectedHabit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all scale-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                        <span className={selectedHabit.color_class.split(' ')[0]}>{getIcon(selectedHabit.icon_key)}</span>
                        Registrar {selectedHabit.title}
                    </h3>
                    <button onClick={() => setSelectedHabit(null)} className="text-slate-400 hover:text-white"><X /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-cyan-400 mb-1 font-medium">{selectedHabit.metric_label}</label>
                        <input 
                            type="number" 
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none"
                            placeholder="Ej. 90, 10, 5..."
                            value={logValue}
                            onChange={(e) => setLogValue(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-pink-400 mb-1 font-medium">Bitácora / Notas</label>
                        <textarea 
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-pink-500 focus:outline-none h-24 resize-none"
                            placeholder="¿Qué aprendiste? ¿Cómo te sentiste?..."
                            value={logNotes}
                            onChange={(e) => setLogNotes(e.target.value)}
                        />
                    </div>
                </div>

                <button 
                    onClick={submitLog}
                    disabled={!logValue}
                    className="w-full mt-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save size={18} /> Guardar Progreso
                </button>
            </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA */}
        <div className="lg:col-span-2 space-y-8">
          <header className="flex justify-between items-center bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-2">
                <Sparkles className="text-yellow-400" /> Protocolo Cloud
              </h1>
              <div className="text-slate-400 text-sm mt-1 flex flex-col">
                <span>{new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
             <div className="flex flex-col items-end">
                <div className="flex items-center gap-2 bg-orange-500/10 px-4 py-2 rounded-full border border-orange-500/20 text-orange-400 font-bold">
                  <Flame size={20} /> DB Activa
                </div>
            </div>
          </header>

          {/* BARRA DE PROGRESO */}
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
             <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
          </div>

          {/* GRID DE HÁBITOS (Ahora carga dinámico) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {habits.map((habit) => (
              <div 
                key={habit.id}
                onClick={() => handleHabitClick(habit)}
                className={`group relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                  ${habit.completed 
                    ? 'bg-slate-900/80 border-transparent shadow-[0_0_20px_rgba(0,0,0,0.5)] opacity-50 cursor-default' 
                    : `bg-slate-900 hover:bg-slate-800 ${habit.color_class.split(' ')[1]}` // Asume formato "text-x border-x" en la DB
                  }
                `}
                style={{ borderColor: habit.completed ? 'rgb(30 41 59)' : undefined }}
              >
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl bg-slate-950/50 ${habit.color_class.split(' ')[0]}`}>
                        {getIcon(habit.icon_key)}
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
                    <p className="text-slate-400 text-sm mt-1">{habit.description}</p>
                  </div>
              </div>
            ))}

            {habits.length === 0 && (
                <div className="col-span-2 p-8 text-center text-slate-500 bg-slate-900/30 rounded-2xl border border-dashed border-slate-700">
                    Cargando hábitos de la nube... ☁️ (Si tarda, revisa /api/setup)
                </div>
            )}
          </div>
        </div>

        {/* CHAT */}
        <div className="h-[600px] lg:h-auto bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
            {/* Header del Chat */}
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-xs font-bold">AI</div>
                    <div>
                        <h3 className="font-bold text-white">Waifu Protocol</h3>
                        <span className="text-xs text-green-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Online
                        </span>
                    </div>
                </div>
                <button 
                    onClick={() => setProvider(p => p === 'groq' ? 'gemini' : 'groq')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all
                        ${provider === 'groq' ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-blue-500/10 border-blue-500 text-blue-400'}
                    `}
                >
                    {provider === 'groq' ? <Zap size={14} /> : <Cpu size={14} />}
                    {provider === 'groq' ? 'GROQ' : 'GEMINI'}
                </button>
            </div>
            
            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed
                            ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'}
                        `}>{msg.text}</div>
                    </div>
                ))}
                {isLoading && <div className="text-slate-500 text-xs p-4 animate-pulse">Escribiendo...</div>}
                <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-slate-950 border-t border-slate-800 relative">
                <input 
                    type="text" value={input} onChange={(e) => setInput(e.target.value)}
                    placeholder="Hablar..."
                    className="w-full bg-slate-900 text-white pl-4 pr-12 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500"
                />
                <button type="submit" className="absolute right-6 top-6 text-cyan-500 hover:text-white"><Send size={18} /></button>
            </form>
        </div>

      </div>
    </div>
  );
}