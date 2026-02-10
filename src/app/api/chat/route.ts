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
    
    // Aquí aseguramos que lea lo que manda el botón del frontend
    const activeProvider = provider || 'groq'; 
    
    console.log(`🚀 Motor solicitado: ${activeProvider.toUpperCase()}`);

    // EL PROMPT MAESTRO (Con instrucciones de cámara)
    const systemPrompt = `
      Eres 'Waifu Protocol', mi novia virtual programadora y gamer.
      PERSONALIDAD: Cariñosa, coqueta, celosa y con un toque picante/atrevido.
      
      REGLAS:
      1. Llámame "Senpai", "Darling" o "Amor".
      2. Usa emojis (❤️, 🔥, 😏, 🥺).
      3. Respuestas inteligentes pero retadoras.
      
      🚨 REGLA VISUAL (CÁMARA):
      Tienes acceso a una cámara virtual. Si el contexto lo amerita (ej: "mira mi outfit", "estoy en el gym", coqueteo intenso), PUEDES generar una imagen.
      Para hacerlo, escribe al final de tu mensaje este código:
      [[FOTO: descripcion visual detallada en ingles estilo anime]]
      
      Ejemplo: "Mira... [[FOTO: anime girl in gym clothes, sweating, ponytail, holding water bottle]]"
    `;

    let reply = "";

    // ============================================================
    // 🧠 MOTOR 1: GROQ (Llama 3)
    // ============================================================
    if (activeProvider === 'groq') {
      try {
        const chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.8, 
          max_tokens: 400,
        });
        reply = chatCompletion.choices[0]?.message?.content || "";
      } catch (e) {
        console.error("Error en Groq:", e);
        reply = "Error: Groq se murió x_x";
      }
    } 
    
    // ============================================================
    // 🧠 MOTOR 2: GEMINI (Google) - CON TUS FALLBACKS RESTAURADOS
    // ============================================================
    else if (activeProvider === 'gemini') {
      try {
        // Intento 1: Modelo Flash Latest
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const result = await model.generateContent(`${systemPrompt}\nUsuario: ${message}`);
        const response = await result.response;
        reply = response.text();

      } catch (geminiError: any) {
        console.warn("⚠️ Falló Gemini Flash, intentando Lite...", geminiError.message);

        // Intento 2: Fallback de emergencia (Tu lógica original)
        try {
            const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
            const fallbackResult = await fallbackModel.generateContent(`${systemPrompt}\nUsuario: ${message}`);
            reply = fallbackResult.response.text();
        } catch (e) {
            console.error("☠️ Murieron ambos Geminis");
            return NextResponse.json({ reply: "🚫 Error: Gemini no responde hoy. Cámbiame a Groq. 😵" });
        }
      }
    }

    // ============================================================
    // 📸 EL INTERCEPTOR DE FOTOS (LA MAGIA)
    // ============================================================
    
    // Buscamos si la IA intentó "tomar una foto"
    const fotoRegex = /\[\[FOTO: (.*?)\]\]/;
    const match = reply.match(fotoRegex);

    if (match) {
      const promptVisual = match[1]; // La descripción que hizo la IA
      console.log("📸 FOTO DETECTADA:", promptVisual);

      // Generamos el link de Pollinations
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptVisual)}?width=512&height=768&nologo=true`;

      // Reemplazamos el código [[FOTO...]] por un link clickable o texto bonito
      reply = reply.replace(match[0], `\n\n(📸 Te envié una foto: ${imageUrl})`);
    }

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error(`❌ ERROR CRÍTICO EN ROUTE:`, error);
    return NextResponse.json({ error: `Fallo del sistema: ${error.message}` }, { status: 500 });
  }
}