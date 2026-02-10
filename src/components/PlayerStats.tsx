import React from 'react';

// Definimos los tipos para que TypeScript no se queje
type Habit = {
  id: number;
  title: string;
  completed: boolean;
  icon_key: string; 
};

type Props = {
  habits: Habit[];
};

export default function PlayerStats({ habits }: Props) {
  // 1. Lógica de RPG
  const totalHabits = habits.length;
  const completedCount = habits.filter(h => h.completed).length;
  
  // Calcular XP (Cada hábito vale 100 XP)
  const currentXP = completedCount * 100;
  const maxXP = totalHabits * 100;
  const progressPercentage = (currentXP / maxXP) * 100;

  // Calcular Nivel (Ficticio por ahora, basado en el día)
  // Puedes mejorarlo luego conectándolo a una base de datos real
  const playerLevel = Math.floor(completedCount / 2) + 1; 

  // Stats calculados dinámicamente
  const strStat = habits.filter(h => h.icon_key === 'dumbbell' && h.completed).length * 5;
  const intStat = habits.filter(h => (h.icon_key === 'code' || h.icon_key === 'book' || h.icon_key === 'gamepad') && h.completed).length * 5;
  const chrStat = habits.filter(h => h.icon_key === 'briefcase' && h.completed).length * 5;

  return (
    <div className="w-full bg-black/60 border border-slate-700 rounded-xl p-4 mb-6 backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.5)]">
      {/* HEADER: Nombre y Nivel */}
      <div className="flex justify-between items-end mb-2">
        <div>
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            SYSTEM_ADMIN
          </h2>
          <span className="text-xs text-slate-400 tracking-widest">CLASS: FULL STACK DEV</span>
        </div>
        <div className="text-right">
          <span className="text-sm text-slate-400 mr-2">LVL.</span>
          <span className="text-3xl font-black text-white">{playerLevel}</span>
        </div>
      </div>

      {/* BARRA DE XP */}
      <div className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700 mb-4">
        <div 
          className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 shadow-[0_0_15px_rgba(6,182,212,0.6)] transition-all duration-1000 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* GRID DE STATS (STR, INT, CHR) */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {/* STR */}
        <div className="bg-slate-800/50 p-2 rounded border border-red-900/30">
          <div className="text-[10px] text-red-400 font-mono">STR</div>
          <div className="text-lg font-bold text-white">{10 + strStat}</div>
        </div>
        
        {/* INT */}
        <div className="bg-slate-800/50 p-2 rounded border border-blue-900/30">
          <div className="text-[10px] text-blue-400 font-mono">INT</div>
          <div className="text-lg font-bold text-white">{10 + intStat}</div>
        </div>

        {/* CHR */}
        <div className="bg-slate-800/50 p-2 rounded border border-yellow-900/30">
          <div className="text-[10px] text-yellow-400 font-mono">CHR</div>
          <div className="text-lg font-bold text-white">{5 + chrStat}</div>
        </div>
      </div>
    </div>
  );
}