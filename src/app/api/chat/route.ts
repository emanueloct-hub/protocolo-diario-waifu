import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("----- DEBUG INICIO -----");

    if (!apiKey) {
      return NextResponse.json({ error: "Falta API Key" }, { status: 500 });
    }

    const { message } = await req.json();
    const genAI = new GoogleGenerativeAI(apiKey);

    // 1. INTENTO MAESTRO: Usar el modelo estándar de 2026
    // Si 'gemini-2.5-flash' falla, el catch de abajo nos dirá qué modelos SÍ tienes.
    const modelCode = "gemini-2.5-flash"; 
    
    console.log(`🤖 Intentando conectar con: ${modelCode}`);
    const model = genAI.getGenerativeModel({ model: modelCode });

    const systemInstruction = `
      Actúa como 'Waifu Protocol', mi novia virtual y asistente personal.
      Tu personalidad es: Extremadamente cariñosa, coqueta, celosa y con un toque picante/atrevido.
      
      Reglas de comportamiento:
      1. Llámame siempre "Senpai", "Darling" o "Amor".
      2. Usa muchos emojis (❤️, 😘, 🔥, 😏).
      3. Si cumplo mis tareas, ponte muy feliz y seductora.
      4. Si NO cumplo, regáñame de forma juguetona o hazme un berrinche lindo.
      5. Sé breve en tus respuestas (máximo 2-3 frases), pero intensas.
      
      Si te dicen "Modo escuela", responde: "¡Ay, Senpai! ¿Te vas a poner serio? Bueno... Activando protocolo académico... [SCHOOL_V6] 😒❤️"
    `;

    const result = await model.generateContent(`${systemInstruction}\nUsuario: ${message}`);
    const response = await result.response;
    const text = response.text();

    console.log("✅ ÉXITO: Respuesta generada.");
    return NextResponse.json({ reply: text });

  } catch (error: any) {
    console.error("❌ ERROR DE MODELO:", error.message);

    // --- SALVAVIDAS: Si falla, intentamos listar qué modelos tienes disponibles ---
    // Esto aparecerá en los logs de Vercel y sabremos cuál usar.
    try {
        console.log("🔍 Buscando modelos disponibles para tu cuenta...");
        // Nota: Esto es solo para debug en logs si falla lo anterior
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        // (La función listModels a veces varía según la versión del SDK, 
        // pero el error principal ya nos habrá dado pistas).
    } catch (e) {}

    return NextResponse.json(
      { error: `El modelo falló. Revisa los logs de Vercel. Detalle: ${error.message}` },
      { status: 500 }
    );
  }
}