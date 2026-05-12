import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../config/env.js";
import logger from "../utils/logger.js";

class AIService {
    constructor() {
        if (config.apiKeys.gemini) {
            this.genAI = new GoogleGenerativeAI(config.apiKeys.gemini);
        }
    }

    async generateMarketIntel(symbol, priceData, percentChange, sentiment) {
        if (!this.genAI) {
            logger.warn("Gemini API Key missing - returning rule-based summary");
            return this.generateRuleBasedSummary(symbol, priceData, percentChange, sentiment);
        }

        try {
            // Using gemini-1.5-flash which supports grounding
            const model = this.genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                tools: [{ googleSearch: {} }] // Adding Google Search grounding as requested for "scaling"
            });

            const prompt = `
        Analyze the market intelligence for ${symbol} stock.
        Current Stats: $${priceData.price} (${percentChange.toFixed(2)}%), Range: ${priceData.low}-${priceData.high}, Sentiment: ${sentiment}.
        
        Provide a concise 1-2 sentence professional market intelligence summary.
        Mention the current price and momentum.
      `;

            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();

            // Fallback if AI returns something too long or empty
            if (!text || text.length > 500) {
                return this.generateRuleBasedSummary(symbol, priceData, percentChange, sentiment);
            }

            return text;
        } catch (error) {
            logger.error(`Gemini Intelligence Error for ${symbol}:`, error.message);
            return this.generateRuleBasedSummary(symbol, priceData, percentChange, sentiment);
        }
    }

    async generateQuantMindAnalysis(prompt) {
        if (!this.genAI) {
            logger.warn("Gemini API Key missing - returning fallback for QuantMind");
            return "## 1. SIGNAL SUMMARY\nOffline mode enabled. AI interpretation unavailable.\n\n## 6. ONE-LINE VERDICT\nSystem operating without AI proxy.";
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); // Using pro for complex financial analysis
            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (error) {
            logger.error(`QuantMind Gemini Error:`, error.message);
            return "## 1. SIGNAL SUMMARY\nError connecting to intelligence node.\n\n## 6. ONE-LINE VERDICT\nFallback metrics active.";
        }
    }

    generateRuleBasedSummary(symbol, priceData, percentChange, sentiment) {
        const sign = percentChange >= 0 ? '+' : '';
        const momentum = sentiment === 'bullish' ? 'strong intraday momentum' :
            sentiment === 'bearish' ? 'selling pressure' :
                'stable consolidation';

        return `${symbol.toUpperCase()} is trading at $${priceData.price} (${sign}${percentChange.toFixed(2)}%). The stock shows ${sentiment} sentiment with ${momentum}. Day range: ${priceData.low}–${priceData.high}.`;
    }
}

export default new AIService();
