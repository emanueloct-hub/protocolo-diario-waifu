import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1. Verificar Llave
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("Checando API Key...", apiKey ? "Existe (Oculta)" : "NO EXISTE");

    if (!apiKey) {
      return NextResponse.json(
        { error: "Falta la GEMINI_API_KEY en Vercel" },
        { status: 500 }
      );
    }

    // 2. Parsear mensaje
    const body = await req.json();
    const { message } = body;
    console.log("Mensaje recibido:", message);

    // 3. Conectar a Google
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemInstruction = `
      Actúa como 'Waifu Protocol', una Project Manager estilo anime.
      Sé breve, útil y usa emojis.
      Si te dicen "Modo escuela", responde: "Activando protocolo académico... [SCHOOL_V6]"
    `;

    // 4. Generar respuesta
    const result = await model.generateContent(`${systemInstruction}\nUsuario: ${message}`);
    const response = await result.response;
    const text = response.text();
    console.log("Respuesta generada:", text);

    return NextResponse.json({ reply: text });

  } catch (error: any) {
    console.error("❌ ERROR CRÍTICO EN BACKEND:", error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}