import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import Groq from "groq-sdk";
import { NextResponse } from "next/server";

// Inicializamos ambos motores
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
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

    // --- OPCIÓN 1: GROQ ---
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
    
    // --- OPCIÓN 2: GEMINI ---
    else if (activeProvider === 'gemini') {
      try {
        // Intentamos usar el modelo
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp", // O el que estés usando
            safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
        });

        const result = await model.generateContent(`${systemPrompt}\nUsuario: ${message}`);
        const response = await result.response;
        reply = response.text();

      } catch (geminiError: any) {
        // 🚨 AQUÍ ATRAPAMOS EL ERROR DE GEMINI ESPECÍFICAMENTE
        console.warn("⚠️ Error interno de Gemini:", geminiError.message);

        if (geminiError.message.includes("429") || geminiError.message.includes("Quota")) {
            // EN LUGAR DE ERROR, DEVOLVEMOS UN MENSAJE AMIGABLE
            return NextResponse.json({ 
                reply: "🚫 **Sistema Gemini Sobrecargado**: Senpai, Google me cortó la inspiración (Límite de cuota). 😓\n\nPor favor, **cámbiame a modo GROQ** con el botón de arriba o espera unos minutos." 
            });
        }
        // Si es otro error raro, dejamos que explote normal abajo
        throw geminiError;
      }
    }

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error(`❌ ERROR GENERAL:`, error);
    // Error genérico para otros fallos
    return NextResponse.json(
      { error: `Fallo del sistema: ${error.message}` },
      { status: 500 }
    );
  }
}