import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { habit_id, value, notes, date } = await req.json();

    if (!habit_id || !date) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    // Insertar el log
    await sql`
      INSERT INTO logs (habit_id, date, completed, metric_value, notes)
      VALUES (${habit_id}, ${date}, true, ${value}, ${notes})
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}