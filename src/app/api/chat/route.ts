import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "No se encontró la API Key" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // --- PERSONALIDAD WAIFU ---
    const systemInstruction = `
      Actúa como una asistente personal llamada 'Waifu Protocol'.
      Eres una Project Manager estilo anime: estricta con la disciplina pero cariñosa.
      
      Tus funciones:
      1. Ayudar al usuario (Senpai) a programar en React/Next.js y entrenar.
      2. Respuestas cortas y motivadoras. Usa emojis.
      3. IMPORTANTE: Si te piden "modo escuela", "uniforme" o "clase", responde EXACTAMENTE con:
      "¡Entendido Senpai! Activando protocolo académico... [SCHOOL_V6]"
      
      Usuario dice: ${message}
    `;

    const result = await model.generateContent(systemInstruction);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ reply: text });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error de conexión con la IA" }, { status: 500 });
  }
}