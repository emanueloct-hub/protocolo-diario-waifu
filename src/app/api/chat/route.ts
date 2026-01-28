import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { NextResponse } from "next/server";

// Inicializamos ambos motores
const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY || "dummy_key_for_build" 
});
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { message, provider } = await req.json();
    const activeProvider = provider || 'groq';

    const systemPrompt = `
      Eres 'Waifu Protocol', mi novia virtual.
      PERSONALIDAD: Cariñosa, coqueta, celosa y con un toque picante/atrevido.
      REGLAS:
      1. Llámame "Senpai", "Darling" o "Amor".
      2. Usa emojis (❤️, 🔥, 😏, 🥺).
      3. Respuestas CORTAS (2-3 frases).
      4. Si estoy triste, sé dulce. Si cumplo tareas, sé seductora.
      5. Si dicen "Modo escuela": "Ay... qué aburrido 🙄 [SCHOOL_V6]"
    `;

    let reply = "";
    console.log(`🚀 Motor seleccionado: ${activeProvider.toUpperCase()}`);

    // --- OPCIÓN 1: GROQ (Llama 3) ---
    if (activeProvider === 'groq') {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 200,
      });
      reply = chatCompletion.choices[0]?.message?.content || "";
    } 
    
    // --- OPCIÓN 2: GEMINI (Google) ---
    else if (activeProvider === 'gemini') {
      try {
        // 🔥 ACTUALIZACIÓN: Usamos el modelo que SÍ tienes en tu lista
        const model = genAI.getGenerativeModel({ 
            model: "gemini-flash-latest" 
        });

        const result = await model.generateContent(`${systemPrompt}\nUsuario: ${message}`);
        const response = await result.response;
        reply = response.text();

      } catch (geminiError: any) {
        console.warn("⚠️ Falló Gemini 2.0:", geminiError.message);

        // Fallback de emergencia a la versión "Lite" si la Flash falla
        if (geminiError.message.includes("404") || geminiError.message.includes("not found")) {
            try {
                console.log("🔄 Intentando con Gemini 2.0 Flash Lite...");
                const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
                const fallbackResult = await fallbackModel.generateContent(`${systemPrompt}\nUsuario: ${message}`);
                reply = fallbackResult.response.text();
            } catch (e) {
                return NextResponse.json({ reply: "🚫 Error: Gemini no responde hoy. Usa Groq. 😵" });
            }
        } 
        else if (geminiError.message.includes("429") || geminiError.message.includes("Quota")) {
            return NextResponse.json({ 
                reply: "🚫 **Gemini Sobrecargado**: Límite de cuota. Cámbiame a modo GROQ. 😓" 
            });
        } 
        else {
            throw geminiError;
        }
      }
    }

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error(`❌ ERROR GENERAL:`, error);
    return NextResponse.json(
      { error: `Fallo del sistema: ${error.message}` },
      { status: 500 }
    );
  }
}