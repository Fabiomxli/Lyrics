import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function extractLyrics(songTitle: string, artist?: string) {
  const prompt = `Extract the lyrics for the song "${songTitle}"${artist ? ` by ${artist}` : ''}. 
  Return only the lyrics text, formatted clearly with stanza breaks. 
  If you cannot find the lyrics, return a message saying so.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text?.trim() || "Could not extract lyrics.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error connecting to AI service.";
  }
}

export async function extractLyricsFromAudio(audioBase64: string, mimeType: string) {
  const prompt = "Please listen to this audio and transcribe the lyrics exactly as they are sung. Return only the lyrics text, formatted clearly with stanza breaks.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          }
        ]
      },
    });

    return response.text?.trim() || "Could not extract lyrics from audio.";
  } catch (error) {
    console.error("Gemini Audio Error:", error);
    return "Error processing audio for lyrics.";
  }
}

export async function parseLyricsIntoLines(rawLyrics: string) {
  // Simple parsing into lines
  return rawLyrics
    .split('\n')
    .filter(line => line.trim() !== '')
    .map((text, index) => ({
      id: `line-${index}`,
      text: text.trim(),
    }));
}
