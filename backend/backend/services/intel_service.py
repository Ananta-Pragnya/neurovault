import os
import json
import logging
import google.generativeai as genai
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class IntelService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)
        else:
            logger.warning("GEMINI_API_KEY not found in environment.")

    async def fetch_news_intelligence(self, query: str) -> Dict[str, Any]:
        """
        Deep analysis of market news using Gemini 1.5 Flash with Grounding (Google Search).
        """
        if not self.api_key:
            raise ValueError("Gemini API key not configured.")

        # System instructions to enforce institutional tone and strict JSON
        system_instruction = (
            "You are a senior financial analyst and news intelligence expert. "
            "Your task is to analyze the latest stock/market news for a given query. "
            "CRITICAL RULES: "
            "1. Use Google Search to find the TOP 5 most recent and relevant news articles. "
            "2. Extract only the core facts and market implications. "
            "3. Be concise and data-driven. "
            "4. Provide a sentiment (Bullish, Bearish, Neutral, Mixed). "
            "5. Provide a short-term market prediction based on the news findings. "
            "You must return the response in strict JSON format."
        )

        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system_instruction
        )

        prompt = f"Analyze the latest market intelligence for: {query}. Focus on institutional impact."

        try:
            # We use generation_config for response_mime_type and schema
            response = model.generate_content(
                prompt,
                tools=[{'google_search': {}}],
                generation_config={
                    "response_mime_type": "application/json",
                }
            )

            if not response.text:
                raise ValueError("Empty response from Gemini")

            data = json.loads(response.text)
            
            # Extract grounding sources if available
            sources = []
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'grounding_metadata') and candidate.grounding_metadata:
                    chunks = candidate.grounding_metadata.grounding_chunks
                    for chunk in chunks:
                        if hasattr(chunk, 'web') and chunk.web:
                            sources.append({
                                "title": chunk.web.title,
                                "uri": chunk.web.uri
                            })

            # Formulate final response
            result = {
                "summary": data.get("summary", ""),
                "keyPoints": data.get("keyPoints", []),
                "sentiment": data.get("sentiment", "Neutral"),
                "prediction": data.get("prediction", "Stable outlook."),
                "sources": sources[:5] if sources else data.get("sources", []),
                "timestamp": int(datetime.now().timestamp() * 1000)
            }

            logger.info(f"Generated intelligence for {query} (Sentiment: {result['sentiment']})")
            return result

        except Exception as e:
            logger.error(f"Gemini Intelligence Error: {e}")
            raise

# Singleton instance
intel_service = IntelService()
