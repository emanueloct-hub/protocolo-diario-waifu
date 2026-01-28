import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // --- CORRECCIÓN ANTI-ERROR ROJO ---
    // Usamos 'DISTINCT ON (h.id)' para asegurar que nunca lleguen hábitos repetidos al Frontend
    const habitsData = await sql`
      SELECT DISTINCT ON (h.id) 
        h.*, 
        CASE WHEN l.id IS NOT NULL THEN true ELSE false END as completed,
        l.metric_value,
        l.notes
      FROM habits h
      LEFT JOIN logs l ON h.id = l.habit_id AND l.date = ${dateParam}
      ORDER BY h.id ASC, l.id DESC; 
    `;
    // (El 'ORDER BY ... l.id DESC' asegura que si hay duplicados, nos quedemos con el último que guardaste)

    // Cálculo de Racha (Igual que antes)
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}