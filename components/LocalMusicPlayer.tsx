
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
  const [volume, setVolume] = useState(0.5);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTrack = useMemo(() => tracks[currentIndex] || null, [tracks, currentIndex]);

  // Handle track end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (tracks.length > 1) {
        handleNext();
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, [tracks, currentIndex]);

  // Handle Play/Pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack]);

  // Sync progress
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

    // Explicitly cast to File type in map callback to fix unknown property errors
    const newTracks: Track[] = Array.from(files).map((file: File, idx) => ({
      id: `${Date.now()}-${idx}`,
      name: file.name.replace(/\.[^/.]+$/, ""),
      url: URL.createObjectURL(file)
    }));

    setTracks(prev => [...prev, ...newTracks]);
  };

  const handlePlayTrack = (index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % tracks.length);
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + tracks.length) % tracks.length);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const removeTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTracks(prev => {
        const index = prev.findIndex(t => t.id === id);
        const newTracks = prev.filter(t => t.id !== id);
        if (index === currentIndex) {
            setIsPlaying(false);
            setCurrentIndex(0);
        } else if (index < currentIndex) {
            setCurrentIndex(prevIndex => prevIndex - 1);
        }
        return newTracks;
    });
  };

  return (
    <div className={`fixed bottom-24 right-6 w-80 md:w-96 bg-black/95 border border-slate-700 p-4 rounded-sm z-[60] shadow-2xl backdrop-blur-md animate-[slideIn_0.3s_ease-out] transition-all duration-300 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
      <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-cyan-500 animate-pulse' : 'bg-slate-700'}`}></div>
            <h3 className="text-cyan-400 font-digital tracking-widest text-xs font-bold uppercase">AUDIO TERMINAL</h3>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-xs">✕</button>
      </div>

      <div className="flex flex-col gap-4">
        {/* Current Track Display */}
        <div className="bg-slate-900/50 p-3 border border-slate-800 rounded-sm">
            <div className="text-[9px] text-slate-500 tracking-widest uppercase mb-1">CURRENT BROADCAST</div>
            <div className="text-xs text-cyan-200 font-mono truncate h-4 tracking-wider">
                {currentTrack ? currentTrack.name : "NO SIGNAL"}
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3">
                <input 
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={progress}
                    onChange={handleProgressChange}
                    className="w-full h-1 bg-slate-800 appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="flex justify-between text-[8px] font-digital text-slate-500 mt-1 tabular-nums">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-2">
            <div className="flex gap-4">
                <button onClick={handlePrev} className="text-slate-400 hover:text-cyan-400 transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6L18 18V6z"/></svg>
                </button>
                <button onClick={() => setIsPlaying(!isPlaying)} className="text-white hover:text-cyan-400 transition-all scale-125">
                    {isPlaying ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    )}
                </button>
                <button onClick={handleNext} className="text-slate-400 hover:text-cyan-400 transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6zM16 6v12h2V6z"/></svg>
                </button>
            </div>
            
            <div className="flex items-center gap-2 group">
                <svg className="text-slate-600 group-hover:text-cyan-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-slate-800 appearance-none cursor-pointer accent-cyan-500"
                />
            </div>
        </div>

        {/* Track List */}
        <div className="max-h-40 overflow-y-auto border border-slate-800 bg-black/40 rounded-sm scrollbar-thin scrollbar-thumb-slate-700">
            {tracks.length === 0 ? (
                <div className="p-8 text-center">
                    <p className="text-[10px] text-slate-700 font-mono tracking-widest">DRAG & DROP MP3 OR SELECT FILES</p>
                </div>
            ) : (
                tracks.map((track, idx) => (
                    <div 
                        key={track.id}
                        onClick={() => handlePlayTrack(idx)}
                        className={`group flex items-center justify-between p-2 cursor-pointer border-b border-slate-900 last:border-0 transition-colors ${idx === currentIndex ? 'bg-cyan-950/20' : 'hover:bg-slate-900/30'}`}
                    >
                        <div className="flex items-center gap-2 truncate">
                            <span className={`text-[8px] font-mono ${idx === currentIndex ? 'text-cyan-500' : 'text-slate-600'}`}>
                                {(idx + 1).toString().padStart(2, '0')}
                            </span>
                            <span className={`text-[10px] truncate ${idx === currentIndex ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
                                {track.name}
                            </span>
                        </div>
                        <button 
                            onClick={(e) => removeTrack(track.id, e)}
                            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all p-1"
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                    </div>
                ))
            )}
        </div>

        {/* Hidden Audio & File Inputs */}
        <audio ref={audioRef} src={currentTrack?.url || ""} hidden />
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="audio/mpeg,audio/wav" 
            multiple 
            hidden 
        />

        <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-cyan-900/20 border border-cyan-800/50 text-cyan-400 py-2 text-[10px] tracking-widest font-bold hover:bg-cyan-900/40 transition-all active:scale-95"
        >
            IMPORT LOCAL MP3 ASSETS
        </button>
      </div>
    </div>
  );
};
