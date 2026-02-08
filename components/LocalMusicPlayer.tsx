
import React, { useState, useRef, useEffect, useMemo } from 'react';

interface LocalMusicPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Track {
  id: string;
  name: string;
  url: string;
}

export const LocalMusicPlayer: React.FC<LocalMusicPlayerProps> = ({ isOpen, onClose }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTrack = useMemo(() => tracks[currentIndex] || null, [tracks, currentIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleEnded = () => {
        if (tracks.length > 1) {
            handleNext();
        } else {
            setIsPlaying(false);
            setProgress(0);
        }
    };
    
    const handleError = (e: any) => {
        console.error("Audio Load Error:", e);
        setErrorMsg("LOAD FAILED: UNSUPPORTED FORMAT OR DISCONNECTED.");
        setIsPlaying(false);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    return () => {
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
    };
  }, [tracks, currentIndex, currentTrack]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      setErrorMsg(null);
      audio.play().catch(e => {
        console.warn("Playback blocked or failed.", e);
        if (e.name === 'NotAllowedError') {
            setErrorMsg("USER INTERACTION REQUIRED. CLICK 'INITIALIZE'.");
        } else {
            setErrorMsg("CODEC ERROR: UNSUPPORTED MEDIA.");
        }
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, currentIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateProgress = () => {
      setProgress(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    audio.addEventListener('timeupdate', updateProgress);
    return () => audio.removeEventListener('timeupdate', updateProgress);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newTracks: Track[] = Array.from(files).map((file: File, idx: number) => ({
      id: `${Date.now()}-${idx}`,
      name: file.name.replace(/\.[^/.]+$/, "").toUpperCase(),
      url: URL.createObjectURL(file)
    }));
    setTracks(prev => [...prev, ...newTracks]);
    if (tracks.length === 0) {
        setCurrentIndex(0);
    }
  };

  const handlePlayTrack = (index: number) => {
    setErrorMsg(null);
    setCurrentIndex(index);
    setIsPlaying(true);
    if (audioRef.current) {
        audioRef.current.load();
    }
  };

  const handleNext = () => {
    if (tracks.length === 0) return;
    handlePlayTrack((currentIndex + 1) % tracks.length);
  };
  
  const handlePrev = () => {
    if (tracks.length === 0) return;
    handlePlayTrack((currentIndex - 1 + tracks.length) % tracks.length);
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`fixed bottom-24 right-6 w-80 md:w-96 bg-black/95 border border-slate-700 p-4 rounded-sm z-[60] shadow-2xl backdrop-blur-md transition-all duration-300 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
      <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
        <h3 className="text-cyan-400 font-digital tracking-widest text-xs font-bold uppercase tracking-[0.2em]">AUDIO TERMINAL</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-xs">✕</button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-slate-900/50 p-3 border border-slate-800 rounded-sm">
            <div className="text-[9px] text-slate-500 tracking-widest mb-1">LOCAL STREAM STATUS</div>
            <div className={`text-xs font-mono min-h-[1.5rem] tracking-wider break-words ${errorMsg ? 'text-red-500' : 'text-cyan-200'}`}>
                {errorMsg || (currentTrack ? currentTrack.name : "NO LOCAL ASSETS LOADED")}
            </div>
            
            <div className="mt-3">
                <input type="range" min="0" max={duration || 0} step="0.1" value={progress} onChange={(e) => {
                    const time = parseFloat(e.target.value);
                    if (audioRef.current) { audioRef.current.currentTime = time; setProgress(time); }
                }} className="w-full h-1 bg-slate-800 appearance-none cursor-pointer accent-cyan-500" />
                <div className="flex justify-between text-[8px] font-digital text-slate-500 mt-1">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>

        <div className="flex items-center justify-between px-2">
            <div className="flex gap-4">
                <button onClick={handlePrev} className="text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-20" disabled={tracks.length === 0}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6L18 18V6z"/></svg>
                </button>
                <button 
                    onClick={() => setIsPlaying(!isPlaying)} 
                    disabled={tracks.length === 0}
                    className="text-white hover:text-cyan-400 scale-125 transition-all disabled:opacity-20"
                >
                    {isPlaying ? <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
                </button>
                <button onClick={handleNext} className="text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-20" disabled={tracks.length === 0}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6zM16 6v12h2V6z"/></svg>
                </button>
            </div>
            <div className="flex items-center gap-2">
                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-20 h-1 bg-slate-800 appearance-none accent-cyan-500" />
            </div>
        </div>

        <div className="max-h-32 overflow-y-auto border border-slate-800 bg-black/40 rounded-sm">
            {tracks.length === 0 ? (
                <div className="p-4 text-center text-[9px] text-slate-700 uppercase tracking-widest font-mono">
                    IMPORT MP3/WAV FILES BELOW
                </div>
            ) : (
                tracks.map((track, idx) => (
                    <div key={track.id} onClick={() => handlePlayTrack(idx)} className={`flex items-center justify-between p-2 cursor-pointer border-b border-slate-900 transition-colors ${idx === currentIndex ? 'bg-cyan-950/20 text-cyan-400' : 'text-slate-500 hover:bg-slate-900/30'}`}>
                        <div className="flex items-center gap-2 truncate">
                            <span className="text-[8px] font-mono opacity-50">{idx + 1}</span>
                            <span className="text-[10px] truncate">{track.name}</span>
                        </div>
                    </div>
                ))
            )}
        </div>

        <audio ref={audioRef} src={currentTrack?.url || ""} preload="auto" hidden />
        
        <button onClick={() => fileInputRef.current?.click()} className="w-full bg-cyan-900/20 border border-cyan-800/50 text-cyan-400 py-3 text-[10px] font-bold hover:bg-cyan-900/40 transition-all active:scale-95 uppercase tracking-widest">
            IMPORT LOCAL AUDIO
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" multiple hidden />
      </div>
    </div>
  );
};
