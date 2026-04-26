export interface LyricLine {
  id: string;
  text: string;
  timestamp?: number; // In seconds, if synced
}

export interface TeleprompterSettings {
  bpm: number;
  fontSize: number;
  lineHeight: number;
  scrollSpeed: number; // For manual speed control (1-10)
  isAutoScroll: boolean;
  highlightActive: boolean;
}
