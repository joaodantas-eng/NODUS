/**
 * Nodus — Gemini Service (Server-Side)
 * 
 * Gerencia a integração segura com a API do Google Gemini.
 * A chave de API nunca é exposta para o cliente/navegador.
 */
import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return geminiClient;
}

/**
 * Envia uma mensagem para o Gemini com fallback automático de modelos
 */
export async function generateGeminiReply(systemPrompt: string, userMessage: string): Promise<string | null> {
  const ai = getGemini();
  if (!ai) return null;

  const candidateModels = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-3.1-flash-lite"];
  for (const modelName of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: `${systemPrompt}\n\nPERGUNTA/MENSAGEM DO USUÁRIO:\n${userMessage}`
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Tentativa Gemini com ${modelName} falhou:`, err?.message || err);
    }
  }
  return null;
}
