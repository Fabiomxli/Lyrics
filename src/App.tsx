import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings2, 
  Type as TypeIcon, 
  Search, 
  Music2, 
  Mic2,
  ChevronUp,
  ChevronDown,
  Clock,
  LayoutGrid,
  Upload,
  FileAudio
} from 'lucide-react';
import { motion } from 'motion/react';
import { extractLyrics, parseLyricsIntoLines, extractLyricsFromAudio } from './services/geminiService';
import { LyricLine, TeleprompterSettings } from './types.ts';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export default function App() {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [rawText, setRawText] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'prompter'>('editor');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [midiStatus, setMidiStatus] = useState<'disconnected' | 'connected' | 'error'>('disconnected');
  
  const [settings, setSettings] = useState<TeleprompterSettings>({
    bpm: 120,
    fontSize: 48,
    lineHeight: 1.5,
    scrollSpeed: 2,
    isAutoScroll: true,
    highlightActive: true,
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  const handleSearch = async () => {
    if (!songTitle) return;
    setIsLoading(true);
    const result = await extractLyrics(songTitle, artist);
    setRawText(result);
    const lines = await parseLyricsIntoLines(result);
    setLyrics(lines);
    setIsLoading(false);
    setViewMode('prompter');
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setIsLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const base64Data = base64.split(',')[1];
        
        const result = await extractLyricsFromAudio(base64Data, file.type);
        setRawText(result);
        const lines = await parseLyricsIntoLines(result);
        setLyrics(lines);
        setIsLoading(false);
        setViewMode('prompter');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("File upload error:", error);
      setIsLoading(false);
    }
  };

  const handleRawTextChange = (text: string) => {
    setRawText(text);
    parseLyricsIntoLines(text).then(lines => setLyrics(lines));
  };

  const togglePlayback = () => {
    const nextValue = !isPlaying;
    setIsPlaying(nextValue);
    setIsRecording(nextValue);
  };

  const resetScroll = () => {
    setIsPlaying(false);
    setIsRecording(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  useEffect(() => {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then((access) => {
        setMidiStatus('connected');
        const inputs = access.inputs.values();
        for (const input of inputs) {
          input.onmidimessage = (message) => {
            const [status] = message.data;
            // MIDI Realtime Messages
            if (status === 0xFA) { // MIDI START
              setIsPlaying(true);
              setIsRecording(true);
            } else if (status === 0xFB) { // MIDI CONTINUE
              setIsPlaying(true);
            } else if (status === 0xFC) { // MIDI STOP
              setIsPlaying(false);
              setIsRecording(false);
            }
          };
        }
      }).catch(() => {
        setMidiStatus('error');
      });
    }

    if (isPlaying && scrollContainerRef.current) {
      const scroll = () => {
        if (scrollContainerRef.current && isPlaying) {
          scrollContainerRef.current.scrollTop += settings.scrollSpeed / 2;
          scrollIntervalRef.current = requestAnimationFrame(scroll);
        }
      };
      scrollIntervalRef.current = requestAnimationFrame(scroll);
    } else {
      if (scrollIntervalRef.current) {
        cancelAnimationFrame(scrollIntervalRef.current);
      }
    }

    return () => {
      if (scrollIntervalRef.current) {
        cancelAnimationFrame(scrollIntervalRef.current);
      }
    };
  }, [isPlaying, settings.scrollSpeed]);

  return (
    <div className="flex h-screen bg-[#0A0A0B] text-white font-sans overflow-hidden">
      {/* Sidebar Controls */}
      <div className="w-80 flex-shrink-0 border-r border-[#1F1F23] bg-[#151519] p-6 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#F27D26] flex items-center justify-center">
            <Mic2 className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight uppercase">Lyric Runner</h1>
            <p className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest">Studio Pro v1.0</p>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex p-1 bg-[#0A0A0B] rounded-lg">
          <button 
            onClick={() => setViewMode('editor')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'editor' ? 'bg-[#1F1F23] text-white shadow-sm' : 'text-[#8E9299] hover:text-white'}`}
          >
            EDITOR
          </button>
          <button 
            onClick={() => setViewMode('prompter')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'prompter' ? 'bg-[#1F1F23] text-white shadow-sm' : 'text-[#8E9299] hover:text-white'}`}
          >
            PROMPTER
          </button>
        </div>

        {/* Main Controls Section */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          {/* AI Search Section */}
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest flex items-center gap-2">
                <Upload size={12} /> Audio Source
              </label>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="audio/*"
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-full bg-[#1F1F23] hover:bg-[#2A2A2F] border border-[#2A2A2F] rounded-md px-3 py-4 flex flex-col items-center justify-center gap-2 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-[#0A0A0B] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileAudio size={20} className="text-[#F27D26]" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-white">
                    {selectedFile ? selectedFile.name : 'UPLOAD AUDIO'}
                  </p>
                  <p className="text-[10px] text-[#8E9299]">AI WILL EXTRACT LYRICS</p>
                </div>
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#1F1F23]"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-mono uppercase">
                <span className="bg-[#151519] px-2 text-[#3A3A40]">OR SEARCH</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest flex items-center gap-2">
                <Search size={12} /> Search Database
              </label>
              <div className="space-y-2">
              <input 
                type="text" 
                placeholder="Song Title..."
                className="w-full bg-[#0A0A0B] border border-[#1F1F23] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#F27D26] placeholder:text-[#3A3A40]"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="Artist (Optional)..."
                className="w-full bg-[#0A0A0B] border border-[#1F1F23] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#F27D26] placeholder:text-[#3A3A40]"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
              />
              <button 
                onClick={handleSearch}
                disabled={isLoading}
                className="w-full bg-[#F27D26] hover:bg-[#ff8e3d] disabled:opacity-50 text-white font-bold py-2 rounded-md transition-all text-sm flex items-center justify-center gap-2"
              >
                {isLoading ? 'ANALYZING...' : (
                  <>
                    <Search size={16} /> FETCH LYRICS
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="h-px bg-[#1F1F23]" />

          {/* Settings Section */}
          <div className="space-y-6">
            {/* Font Size */}
            <div className="space-y-3">
              <label className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest flex justify-between">
                <span>Font Size</span>
                <span className="text-white">{settings.fontSize}px</span>
              </label>
              <input 
                type="range" 
                min="24" 
                max="120" 
                value={settings.fontSize}
                onChange={(e) => setSettings({...settings, fontSize: parseInt(e.target.value)})}
                className="w-full h-1 bg-[#0A0A0B] rounded-lg appearance-none cursor-pointer accent-[#F27D26]"
              />
            </div>

            {/* Scroll Speed */}
            <div className="space-y-3">
              <label className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest flex justify-between">
                <span>Scroll Speed</span>
                <span className="text-white">{settings.scrollSpeed}px/f</span>
              </label>
              <input 
                type="range" 
                min="0.5" 
                max="10" 
                step="0.5"
                value={settings.scrollSpeed}
                onChange={(e) => setSettings({...settings, scrollSpeed: parseFloat(e.target.value)})}
                className="w-full h-1 bg-[#0A0A0B] rounded-lg appearance-none cursor-pointer accent-[#F27D26]"
              />
            </div>

            {/* BPM Sync */}
            <div className="space-y-3">
              <label className="text-[10px] font-mono text-[#8E9299] uppercase tracking-widest flex justify-between">
                <span>BPM Sync</span>
                <span className="text-white">{settings.bpm}</span>
              </label>
              <div className="flex gap-2">
                 <button 
                  onClick={() => setSettings({...settings, bpm: Math.max(40, settings.bpm - 1)})}
                  className="p-1 rounded bg-[#0A0A0B] border border-[#1F1F23] hover:bg-[#1F1F23]"
                 ><ChevronDown size={16} /></button>
                 <input 
                  type="number" 
                  value={settings.bpm}
                  onChange={(e) => setSettings({...settings, bpm: parseInt(e.target.value) || 120})}
                  className="w-full bg-[#0A0A0B] border border-[#1F1F23] rounded px-2 py-1 text-xs text-center focus:outline-none"
                 />
                 <button 
                  onClick={() => setSettings({...settings, bpm: Math.min(300, settings.bpm + 1)})}
                  className="p-1 rounded bg-[#0A0A0B] border border-[#1F1F23] hover:bg-[#1F1F23]"
                 ><ChevronUp size={16} /></button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Playback */}
        <div className="mt-auto space-y-4 pt-4 border-t border-[#1F1F23]">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-[#1F1F23]'}`} />
              <span className="text-[10px] font-mono text-[#8E9299]">{isRecording ? "RECORDING" : "STANDBY"}</span>
            </div>
            <div className="text-[10px] font-mono text-white flex items-center gap-1">
              <Clock size={10} /> 00:00:00
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={resetScroll}
              className="flex-1 py-3 bg-[#1F1F23] hover:bg-[#2A2A2F] rounded-lg transition-colors flex items-center justify-center"
            >
              <RotateCcw size={20} />
            </button>
            <button 
              onClick={togglePlayback}
              className={`flex-[2] py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${isPlaying ? 'bg-white text-black' : 'bg-[#F27D26] text-white hover:bg-[#ff8e3d]'}`}
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              <span className="font-bold text-sm">{isPlaying ? 'STOP' : 'START SYNC'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-[#1F1F23] bg-[#0A0A0B] px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${midiStatus === 'connected' ? 'bg-green-500' : midiStatus === 'error' ? 'bg-red-500' : 'bg-[#F27D26]'}`} />
              <span className="text-xs font-medium text-[#8E9299]">
                {midiStatus === 'connected' ? 'DAW SYNC: READY' : 'DAW SYNC: OFFLINE'}
              </span>
            </div>
            <div className="h-4 w-px bg-[#1F1F23]" />
            <span className="text-xs font-mono text-white uppercase truncate max-w-[200px]">
              {songTitle || "UNTITLED PROJECT"}
            </span>
          </div>

          <div className="flex items-center gap-4">
             <button className="p-2 text-[#8E9299] hover:text-white transition-colors">
               <Settings2 size={18} />
             </button>
             <button className="p-2 text-[#8E9299] hover:text-white transition-colors">
               <LayoutGrid size={18} />
             </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {viewMode === 'editor' ? (
            <div className="flex-1 p-8">
              <textarea 
                placeholder="Paste lyrics here or use AI Search..."
                className="w-full h-full bg-[#151519] rounded-xl border border-[#1F1F23] p-8 text-xl font-medium focus:outline-none focus:border-[#F27D26] resize-none leading-relaxed transition-all placeholder:text-[#3A3A40]"
                value={rawText}
                onChange={(e) => handleRawTextChange(e.target.value)}
              />
            </div>
          ) : (
            <div className="flex-1 relative">
              <div className="absolute top-1/2 left-0 w-full h-[2px] bg-[#F27D26] opacity-30 pointer-events-none z-10 blur-[1px]" />
              <div className="absolute top-1/2 left-4 z-20 pointer-events-none transform -translate-y-1/2">
                <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[12px] border-l-[#F27D26]" />
              </div>
              
              <div 
                ref={scrollContainerRef}
                className="h-full overflow-y-auto overflow-x-hidden pt-[50vh] pb-[100vh] scroll-smooth hide-scrollbar px-20"
              >
                {lyrics.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#3A3A40] space-y-4">
                    <Music2 size={64} className="opacity-20" />
                    <p className="text-xl font-medium opacity-50">NO LYRICS LOADED</p>
                    <button 
                      onClick={() => setViewMode('editor')}
                      className="px-6 py-2 border border-[#1F1F23] rounded-full text-sm hover:border-[#8E9299] transition-all"
                    >
                      OPEN EDITOR
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-8 text-center">
                    {lyrics.map((line) => (
                      <motion.div 
                        key={line.id}
                        initial={{ opacity: 0.2, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ margin: "-45% 0px -45% 0px" }}
                        style={{ 
                          fontSize: `${settings.fontSize}px`,
                          lineHeight: settings.lineHeight
                        }}
                        className="transition-all duration-300 font-bold tracking-tight text-white/90"
                      >
                        {line.text}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#0A0A0B] to-transparent pointer-events-none z-20" />
              <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#0A0A0B] to-transparent pointer-events-none z-20" />
            </div>
          )}
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1F1F23;
          border-radius: 10px;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
