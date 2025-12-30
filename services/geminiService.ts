
import { GoogleGenAI, Modality } from "@google/genai";
import { Ticket } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateAIReport = async (tickets: Ticket[], range: 'WEEK' | 'MONTH' | 'YEAR') => {
  const ticketDataSummary = tickets.map(t => ({
    number: t.number,
    status: t.status,
    waitDuration: t.calledAt ? (t.calledAt - t.createdAt) / 1000 / 60 : null,
    serviceDuration: (t.servedAt && t.calledAt) ? (t.servedAt - t.calledAt) / 1000 / 60 : null,
    hourOfDay: new Date(t.createdAt).getHours(),
    date: new Date(t.createdAt).toISOString().split('T')[0]
  }));

  const prompt = `
    Analyze the following queue management data for the period: ${range}.
    Identify peak hours, average wait times, average service times, and suggest improvements.
    Data: ${JSON.stringify(ticketDataSummary)}
    
    Provide the response in a structured format suitable for a professional ${range.toLowerCase()}ly business report.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text;
  } catch (error) {
    console.error("AI Report Generation Error:", error);
    return "Failed to generate AI insights at this time.";
  }
};

export const generateCallingAudio = async (ticketNumber: number, counterName: string, voice: 'MAN' | 'WOMAN' = 'MAN') => {
  const prompt = `Announce clearly and professionally: Ticket number ${ticketNumber}, please proceed to ${counterName}.`;
  const voiceName = voice === 'MAN' ? 'Puck' : 'Kore';
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  } catch (error) {
    console.error("TTS Generation Error:", error);
    return null;
  }
};
