import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "") {
    throw new Error("CRITICAL: API_KEY is missing. Ensure it is set in Vercel Environment Variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateAIResponse = async (prompt: string) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are REI, a highly advanced personal assistant core. Use search for current events. Be sharp and professional. Respond strictly with text.",
      },
    });

    const text = response.text || "Neural connection interrupted.";
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'Source',
      uri: chunk.web?.uri || ''
    })).filter((s: any) => s.uri) || [];

    return { text, sources };
  } catch (err) {
    console.error("AI Response Error:", err);
    return { text: "Error connecting to neural core. Please check API configuration.", sources: [] };
  }
};

export const generateAIImage = async (prompt: string) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: `Generate a high-quality cinematic image of: ${prompt}`,
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
      }
    });

    let imageUrl: string | undefined;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }
    return imageUrl;
  } catch (err) {
    console.error("Image Gen Error:", err);
    return undefined;
  }
};

export function encodeAudio(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decodeAudio(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const connectToNeuralLink = (callbacks: {
  onMessage: (msg: LiveServerMessage) => void;
  onClose: () => void;
  onError: (e: any) => void;
}) => {
  const ai = getAIClient();
  return ai.live.connect({
    model: 'gemini-2.0-flash-live-001',
    callbacks: {
      onopen: () => console.log("Neural Link Active"),
      onmessage: callbacks.onMessage,
      onclose: callbacks.onClose,
      onerror: callbacks.onError,
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
      },
      systemInstruction: "You are talking via Neural Link (voice call). Be conversational, sharp, and professional. Keep responses relatively brief for a natural flow.",
    },
  });
};
