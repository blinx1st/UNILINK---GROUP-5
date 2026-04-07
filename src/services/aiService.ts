import { GoogleGenAI } from "@google/genai";
import { AIViewerContext, ChatHistoryTurn } from './aiContext';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface ChatWithAIInput {
  message: string;
  history: ChatHistoryTurn[];
  viewer: AIViewerContext['viewer'];
  context: AIViewerContext;
}

const MAX_HISTORY_TURNS = 8;
const MAX_HISTORY_TEXT_LENGTH = 800;

function serializeHistory(history: ChatHistoryTurn[]) {
  return history
    .slice(-MAX_HISTORY_TURNS)
    .map(turn => `${turn.role.toUpperCase()}: ${turn.text.slice(0, MAX_HISTORY_TEXT_LENGTH)}`)
    .join('\n');
}

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

export async function chatWithAI({ message, history, viewer, context }: ChatWithAIInput) {
  const serializedHistory = serializeHistory(history);
  const prompt = `
You are answering inside the UniLink demo app for ABC University.

Viewer:
${JSON.stringify(viewer, null, 2)}

Scoped UniLink context:
${JSON.stringify(context, null, 2)}

Recent conversation:
${serializedHistory || 'No prior conversation.'}

Current user question:
${message}
`;

  const result = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      systemInstruction: `You are UniLink AI, a helpful assistant for ABC University inside the UniLink demo app.
Use only the provided UniLink context and recent conversation when answering.
Do not invent missing data, hidden records, policies, deadlines, or personal case details.
If the provided context does not confirm the answer, explicitly say: "I don't have enough data in UniLink to confirm that."
If a question asks for information outside the viewer's visible scope, say you cannot confirm it from the current UniLink view.
Prefer concrete details from the context such as enquiry titles, statuses, dates, and appointment types.
If the requested information is unavailable, suggest creating a formal enquiry when appropriate.
Keep responses concise, clear, and professional.`,
    }
  });

  return result.text || "I don't have enough data in UniLink to confirm that.";
}
