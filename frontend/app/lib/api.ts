import axios from "axios";
import {
  ScoringRequest,
  ScoringResponse,
  ChatRequest,
  ChatResponse,
} from "@/app/types";

// -------- Settings --------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const client = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// -------- API calls --------

export async function scoreEssay(
  request: ScoringRequest,
): Promise<ScoringResponse> {
  const response = await client.post<ScoringResponse>("/api/score", request);
  return response.data;
}

export async function sendChatMessage(
  request: ChatRequest,
): Promise<ChatResponse> {
  const response = await client.post<ChatResponse>("/api/chat", request);
  return response.data;
}

export async function checkHealth(): Promise<boolean> {
  try {
    await client.get("/api/health");
    return true;
  } catch {
    return false;
  }
}
// -------- Models --------

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
}

export interface ModelsResponse {
  current_provider: string;
  current_model: string;
  ollama_models: ModelOption[];
  cloud_models: ModelOption[];
}

export async function getModels(): Promise<ModelsResponse> {
  const response = await client.get<ModelsResponse>("/api/models");
  return response.data;
}

export async function sendChatMessageStream(
  request: ChatRequest,
  onChunk: (text: string) => void,
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    onChunk(text);
  }
}
