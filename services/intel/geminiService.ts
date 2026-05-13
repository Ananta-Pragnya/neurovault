import axios from 'axios';
import { NewsIntelligenceResponse } from "../../types";

const API_BASE = `${import.meta.env.VITE_API_BASE || 'http://localhost:8000'}/api/intelligence`;

export const fetchNewsIntelligence = async (query: string): Promise<NewsIntelligenceResponse> => {
  try {
    const response = await axios.post(`${API_BASE}/news`, { query });
    return response.data;
  } catch (error) {
    console.error("Backend Intelligence Error:", error);
    throw new Error("Failed to fetch news intelligence from unified platform.");
  }
};
