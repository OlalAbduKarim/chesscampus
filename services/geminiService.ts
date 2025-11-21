import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is missing.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeBoardPosition = async (fen: string, moveHistory: string[]): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "Unable to connect to AI Coach. Please check API Key.";

  try {
    const prompt = `
      You are a Grandmaster Chess Coach. 
      Analyze the following chess position in FEN notation: ${fen}.
      
      The last few moves were: ${moveHistory.slice(-5).join(', ')}.
      
      Provide a concise, strategic advice (max 3 sentences). 
      Focus on key threats, opportunities, or positional improvements.
      Do not use markdown formatting like bold or italics, just plain text.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "The Grandmaster is currently unavailable for comment.";
  }
};

export const getChatResponse = async (message: string, context: string = "General Chess Chat"): Promise<string> => {
    const ai = getAiClient();
    if (!ai) return "System offline.";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Context: ${context}. User says: "${message}". Respond helpfully and briefly as a chess moderator.`,
        });
        return response.text || "";
    } catch (e) {
        return "Connection error.";
    }
}