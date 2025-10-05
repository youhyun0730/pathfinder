import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

// Gemini 2.5 Flash モデル
export const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
});

// JSON形式で応答を取得
export async function generateJSON<T>(prompt: string): Promise<T> {
  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });

    const response = await result.response;
    const text = response.text();

    try {
      return JSON.parse(text) as T;
    } catch (error) {
      console.error('Failed to parse JSON response:', text);
      throw new Error('Invalid JSON response from Gemini');
    }
  } catch (error: any) {
    // Gemini APIのエラーハンドリング
    if (error?.status === 429 || error?.message?.includes('quota')) {
      throw new Error('QUOTA_EXCEEDED');
    }
    if (error?.status === 503 || error?.message?.includes('overloaded')) {
      throw new Error('SERVICE_OVERLOADED');
    }
    throw error;
  }
}

// テキスト形式で応答を取得
export async function generateText(prompt: string): Promise<string> {
  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      },
    });

    const response = await result.response;
    return response.text();
  } catch (error: any) {
    // Gemini APIのエラーハンドリング
    if (error?.status === 429 || error?.message?.includes('quota')) {
      throw new Error('QUOTA_EXCEEDED');
    }
    if (error?.status === 503 || error?.message?.includes('overloaded')) {
      throw new Error('SERVICE_OVERLOADED');
    }
    throw error;
  }
}
