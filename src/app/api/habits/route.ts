import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// --- 📅 CONFIGURACIÓN DE RUTINAS (AQUÍ CAMBIAS CADA MES) ---
const RUTINAS_POR_FECHA = [
  {
    nombre: "Rutina Enero-Febrero 2026",
    inicio: "2026-01-28",
    fin: "2026-02-28",
    dias: {
      1: "🔥 PECHO: (4) Press Horizontal con Manc vs (15) Preck Fly Inc | (11) Lagartijas 5x15 | (6) Press Inclinado Articulado vs (2) Press Horizontal Art",
      2: "🔥 HOMBRO: (4) Press Milititar con Manc vs (12) Laterales Máq | (14) Banco Inclinado Lateral vs (22) Banco inclinado lev Frontal Barra | (36) Banco Inc Posteriores",
      3: "🔥 BRAZO: B:(8) Martillo Giro vs (11) Predicador abierto vs (17) Jalón recto p/b | T:(24) Extension Máq vs (1) Press Francés barra Z vs (11) Fondos",
      4: "🔥 PIERNA: (20) Prensa 1 pie vs (6) Sentadillan Sumo | (26) Extension vs (27) Extension 1p | (32) Peso M Manc vs (41) Abductor B",
      5: "🔥 ESPALDA: (2) Jalón al Frente vs (13) Remo Baja Agarre Abierto | (11) Domimandas Asistidas 5x15 | (8) Hammer vs (28) Pull Over Cuerda",
      6: "🏃 SÁBADO: Cardio o Pendientes",
      0: "💤 DOMINGO: Descanso Total"
    } 
  },
  // 👇 AQUÍ ES DONDE PEGARÁS EL BLOQUE DE MARZO CUANDO LLEGUE EL MOMENTO 👇
  /*
  {
    nombre: "Rutina Marzo 2026",
    inicio: "2026-03-01",
    fin: "2026-03-31",
    dias: { ... }
  }
  */
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    // 1. DETERMINAR QUÉ RUTINA TOCA HOY
    // Usamos hora 12:00 para evitar problemas de zona horaria
    const userDate = new Date(dateParam + 'T12:00:00'); 
    const dayIndex = userDate.getDay(); // 0=Domingo, 1=Lunes...

    // Buscamos si la fecha actual cae dentro de algún rango configurado arriba
    const rutinaActiva = RUTINAS_POR_FECHA.find(r => 
      dateParam >= r.inicio && dateParam <= r.fin
    );

    let descripcionDelDia = "📅 No hay rutina programada para esta fecha.";

    if (rutinaActiva) {
      // Si encontramos rutina vigente, sacamos el ejercicio del día
      // @ts-ignore
      descripcionDelDia = rutinaActiva.dias[dayIndex] || "Descanso";
    } else {
      // Si la fecha no coincide con nada (ej. llegas a Marzo y no has actualizado)
      descripcionDelDia = "⚠️ ¡Rutina Vencida! Senpai, actualiza el código con la hoja nueva.";
    }

    // 2. CONSULTA SQL MEJORADA (Con DISTINCT ON para evitar errores rojos)
    const habitsData = await sql`
      SELECT DISTINCT ON (h.id) 
        h.id, 
        h.title,
        h.icon_key,
        h.color_class,
        h.type,
        h.metric_label,
        h.ai_persona,
        -- LOGICA DINÁMICA: Si es 'health', inyectamos la rutina calculada
        CASE 
          WHEN h.type = 'health' THEN ${descripcionDelDia}
          ELSE h.description 
        END as description,
        CASE WHEN l.id IS NOT NULL THEN true ELSE false END as completed,
        l.metric_value,
        l.notes
      FROM habits h
      LEFT JOIN logs l ON h.id = l.habit_id AND l.date = ${dateParam}
      ORDER BY h.id ASC, l.id DESC;
    `;

    // 3. CÁLCULO DE RACHA
    const streakData = await sql`
      SELECT COUNT(DISTINCT date) as current_streak 
      FROM logs 
      WHERE date <= ${dateParam};
    `;
    
    const streak = streakData.rows[0]?.current_streak || 0;

    return NextResponse.json({ 
      habits: habitsData.rows,
      streak: parseInt(streak) 
    }, { status: 200 });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}