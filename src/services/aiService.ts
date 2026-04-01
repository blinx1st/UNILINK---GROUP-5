import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function triageEnquiry(title: string, description: string, category: string) {
  const prompt = `
    You are an AI triage assistant for ABC University Student Enquiry System.
    Analyze the following student enquiry and return a structured JSON response.
    
    Enquiry Title: ${title}
    Enquiry Category: ${category}
    Enquiry Description: ${description}
    
    Return JSON with:
    - summary: brief summary (max 20 words)
    - suggested_department: one of [Admissions, Academic Support, Financial Services, Student Welfare, International / Visa Support, Graduation / Careers]
    - suggested_category: more specific category
    - suggested_complexity: [general, complex]
    - suggested_priority: [low, medium, high, urgent]
    - confidence: 0.0 to 1.0
    - requires_human_review: boolean
    - sensitivity_flags: array of strings (e.g., "mental health", "financial hardship", "legal")
    - recommended_next_action: string
  `;

  const result = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { responseMimeType: 'application/json' }
  });

  return JSON.parse(result.text);
}

export async function chatWithAI(message: string) {
  const result = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: message }] }],
    config: {
      systemInstruction: "You are UniLink AI, a helpful assistant for ABC University students. Answer questions about university policies, deadlines, and services. If you are unsure, suggest creating a formal enquiry. Always be polite and professional."
    }
  });

  return result.text;
}
