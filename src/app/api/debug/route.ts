import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "No hay API Key" });

    // Esto no sirve en el SDK de cliente, asi que probaremos 'a mano'
    // cual responde con un "Hola".
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const candidates = [
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash",
      "gemini-1.5-flash-001",
      "gemini-1.5-flash-002",
      "gemini-1.5-pro",
      "gemini-1.0-pro",
      "gemini-pro"
    ];

    const results: Record<string, string> = {};

    // Probamos todos uno por uno rápido
    for (const modelName of candidates) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        // Intentamos generar 1 token para ver si existe
        await model.generateContent("Hola"); 
        results[modelName] = "✅ DISPONIBLE";
      } catch (e: any) {
        if (e.message.includes("404")) results[modelName] = "❌ 404 NO ENCONTRADO";
        else if (e.message.includes("429")) results[modelName] = "⚠️ 429 CUOTA LLENA (Pero existe)";
        else results[modelName] = `❌ ERROR: ${e.message.substring(0, 50)}...`;
      }
    }

    return NextResponse.json({ diagnostico: results });

  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}