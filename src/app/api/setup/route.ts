import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. CREAR TABLA DE HÁBITOS (Definiciones V2)
    // Agregamos 'metric_label' (ej: 'Nivel de Energía') y 'ai_persona' (Prompt único)
    await sql`
      CREATE TABLE IF NOT EXISTS habits (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        icon_key VARCHAR(50), 
        color_class VARCHAR(100),
        type VARCHAR(50), 
        metric_label VARCHAR(100), 
        ai_persona TEXT 
      );
    `;

    // 2. CREAR TABLA DE LOGS (Historial Diario)
    // Agregamos 'metric_value' (el número) y 'notes' (tu diario)
    await sql`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        habit_id INTEGER REFERENCES habits(id),
        date VARCHAR(50) NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        metric_value NUMERIC, 
        notes TEXT, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. SEMBRAR DATOS (Solo si está vacía)
    const checkHabits = await sql`SELECT count(*) FROM habits`;
    
    if (checkHabits.rows[0].count == 0) {
        await sql`
          INSERT INTO habits (title, description, icon_key, color_class, type, metric_label, ai_persona)
          VALUES 
            (
              'Estudio: Web & IA', 
              '1h de Foco Absoluto', 
              'book', 
              'cyan', 
              'study', 
              'Minutos de Foco',
              'Eres un profesor experto en tecnología. Felicita al usuario por estudiar y hazle una pregunta técnica rápida relacionada con lo que aprendió en sus notas.'
            ),
            (
              'Proyecto: RenPy', 
              'Dev & Scripting', 
              'gamepad', 
              'pink', 
              'project', 
              'Avance (%)',
              'Eres un Project Manager de videojuegos. Pregunta qué funcionalidad nueva se implementó y sugiere el siguiente paso lógico para la Novela Visual.'
            ),
            (
              'Entreno Físico', 
              'Gimnasio (L-V)', 
              'dumbbell', 
              'red', 
              'health', 
              'Nivel de Energía (1-10)',
              'Eres un entrenador personal. Si la energía es baja (menor a 5), sé comprensivo pero firme. Si es alta, celebra la intensidad. Prioriza la salud a largo plazo.'
            );
        `;
    }

    return NextResponse.json({ result: '✅ Sistema Operativo V2 Instalado' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}