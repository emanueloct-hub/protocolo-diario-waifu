import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "No hay API Key" });

    // 1. Preguntamos directo a la API: "¿Qué modelos tienes?"
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET' }
    );

    const data = await response.json();

    if (data.error) {
        return NextResponse.json({ 
            status: "❌ ERROR DE CUENTA", 
            mensaje: data.error.message 
        });
    }

    // 2. Filtramos solo los que sirven para chatear ("generateContent")
    const chatModels = data.models
        ?.filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
        .map((m: any) => m.name);

    return NextResponse.json({ 
        status: "✅ CONEXIÓN EXITOSA", 
        modelos_disponibles: chatModels || "Ninguno encontrado 🤡" 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}