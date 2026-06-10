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
  request: ScoringRequest
): Promise<ScoringResponse> {
  const response = await client.post<ScoringResponse>("/api/score", request);
  return response.data;
}

export async function sendChatMessage(
  request: ChatRequest
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