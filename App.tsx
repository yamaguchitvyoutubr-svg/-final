
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MainClock } from './components/MainClock';
import { WorldGrid } from './components/WorldGrid';
import { Timer } from './components/Timer';
import { WeatherWidget } from './components/WeatherWidget';
import { EarthquakeWidget } from './components/EarthquakeWidget';
import { LocalMusicPlayer } from './components/LocalMusicPlayer';
import { TutorialOverlay } from './components/TutorialOverlay';
import { useClock } from './hooks/useClock';

interface BackgroundAsset {
  id: string;
  url: string;
  type: 'image' | 'video';
  label?: string;
}

const App: React.FC = () => {
  const { date } = useClock();
  const [bgAssets, setBgAssets] = useState<BackgroundAsset[]>([]);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [isMusicOpen, setIsMusicOpen] = useState(false);
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [bgVolume, setBgVolume] = useState(0.5);
  const [isBgMuted, setIsBgMuted] = useState(true);
  const [isSystemStarted, setIsSystemStarted] = useState(false);
  
  // スライドショー設定
  const [isSlideshowActive, setIsSlideshowActive] = useState(true);
  const [slideshowInterval, setSlideshowInterval] = useState(30); // 秒
  const [isShuffle, setIsShuffle] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [visibility, setVisibility] = useState({
    weather: true,
    earthquake: true,
    timer: true,
    grid: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const slideshowTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenTutorial');
    if (!hasSeen) {
        setShowTutorial(true);
    }
    const savedVisibility = localStorage.getItem('module_visibility');
    if (savedVisibility) {
        try { setVisibility(JSON.parse(savedVisibility)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('module_visibility', JSON.stringify(visibility));
  }, [visibility]);

  // 背景切り替えロジック
  const nextBackground = useCallback(() => {
    if (bgAssets.length <= 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
        setCurrentBgIndex(prev => {
            if (isShuffle) {
                let next;
                do { next = Math.floor(Math.random() * bgAssets.length); } while (next === prev);
                return next;
            }
            return (prev + 1) % bgAssets.length;
        });
        setIsTransitioning(false);
    }, 800);
  }, [bgAssets.length, isShuffle]);

  const prevBackground = useCallback(() => {
    if (bgAssets.length <= 1) return;
    setIsTransitioning(true);
    setTimeout(() => {
        setCurrentBgIndex(prev => (prev - 1 + bgAssets.length) % bgAssets.length);
        setIsTransitioning(false);
    }, 800);
  }, [bgAssets.length]);

  // スライドショータイマー
  useEffect(() => {
    if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
    
    if (isSlideshowActive && bgAssets.length > 1 && isSystemStarted) {
        slideshowTimerRef.current = setInterval(() => {
            // 現在が動画で再生中の場合は、タイマーによる強制切り替えをスキップ（または動画終了時に任せる）
            const current = bgAssets[currentBgIndex];
            if (current?.type === 'video' && videoRef.current && !videoRef.current.paused) {
                return;
            }
            nextBackground();
        }, slideshowInterval * 1000);
    }

    return () => {
        if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
    };
  }, [isSlideshowActive, slideshowInterval, bgAssets.length, currentBgIndex, isSystemStarted, nextBackground]);

  // ビデオ再生制御
  useEffect(() => {
    const video = videoRef.current;
    if (video && isSystemStarted) {
        video.volume = isBgMuted ? 0 : bgVolume;
        video.muted = isBgMuted;
        video.play().catch(() => { video.muted = true; });
    }
  }, [bgVolume, isBgMuted, currentBgIndex, isSystemStarted]);

  const handleStartSystem = () => {
    setIsSystemStarted(true);
    setIsBgMuted(false);
    setShowTutorial(false);
    localStorage.setItem('hasSeenTutorial', 'true');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newAssets: BackgroundAsset[] = Array.from(files).map((file: File) => {
        const type = (file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mov')) ? 'video' : 'image';
        return {
          id: Math.random().toString(36).substr(2, 9),
          url: URL.createObjectURL(file as Blob),
          type: type as 'image' | 'video',
          label: file.name.toUpperCase()
        };
      });
      setBgAssets(prev => [...prev, ...newAssets]);
      setCurrentBgIndex(bgAssets.length);
    }
  };

  const toggleVisibility = (key: keyof typeof visibility) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const currentAsset = bgAssets[currentBgIndex] || null;

  return (
    <div className="min-h-screen bg-black text-slate-200 flex flex-col items-center p-4 md:p-8 relative overflow-y-auto overflow-x-hidden font-sans">
      
      {/* Background Layer with Crossfade */}
      <div className={`fixed inset-0 z-0 transition-opacity duration-1000 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {currentAsset && (
            <div className="absolute inset-0">
                {currentAsset.type === 'video' ? (
                    <video 
                        ref={videoRef}
                        key={currentAsset.url}
                        autoPlay 
                        muted={isBgMuted}
                        playsInline
                        onEnded={() => isSlideshowActive && nextBackground()}
                        className="w-full h-full object-cover"
                    >
                        <source src={currentAsset.url} />
                    </video>
                ) : (
                    <div 
                        className="w-full h-full bg-cover bg-center bg-no-repeat transition-all duration-1000"
                        style={{ backgroundImage: `url(${currentAsset.url})` }}
                    />
                )}
                <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
            </div>
        )}
      </div>
      
      {/* Manual Slideshow Controls (Hover only) */}
      {bgAssets.length > 1 && (
          <div className="fixed inset-y-0 inset-x-0 z-20 pointer-events-none flex justify-between items-center px-4 opacity-0 hover:opacity-100 transition-opacity duration-500">
              <button onClick={prevBackground} className="pointer-events-auto p-4 bg-black/20 hover:bg-white/10 text-white/30 hover:text-white transition-all rounded-full backdrop-blur-sm">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button onClick={nextBackground} className="pointer-events-auto p-4 bg-black/20 hover:bg-white/10 text-white/30 hover:text-white transition-all rounded-full backdrop-blur-sm">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18l6-6-6-6"/></svg>
              </button>
          </div>
      )}

      {showTutorial && <TutorialOverlay onClose={handleStartSystem} />}

      {!isSystemStarted && !showTutorial && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <button onClick={handleStartSystem} className="group relative px-12 py-4 bg-cyan-900/20 border border-cyan-500 text-cyan-400 font-digital tracking-[0.5em] text-xl hover:bg-cyan-500 hover:text-black transition-all duration-500">
                  INITIALIZE SYSTEM
              </button>
          </div>
      )}

      <main className="w-[95%] flex flex-col items-center gap-10 md:gap-12 z-10 relative my-auto py-8">
        <section className="w-full flex flex-col items-center py-4 gap-2">
          <MainClock date={date} />
          {visibility.weather && <WeatherWidget />}
          {visibility.earthquake && <EarthquakeWidget />}
        </section>
        {visibility.timer && <Timer />}
        {visibility.grid && <WorldGrid date={date} />}
      </main>
      
      <LocalMusicPlayer isOpen={isMusicOpen} onClose={() => setIsMusicOpen(false)} />

      {/* Display Control Menu */}
      {isDisplaySettingsOpen && (
        <div className="fixed bottom-24 right-6 bg-black/95 border border-slate-700 p-4 rounded-sm z-[60] shadow-2xl w-72 backdrop-blur-xl">
            <h4 className="text-cyan-400 font-digital tracking-widest text-[10px] font-bold mb-4 border-b border-slate-800 pb-2">SYSTEM CONFIGURATION</h4>
            
            <div className="space-y-6">
                {/* Visibility Settings */}
                <div className="grid grid-cols-2 gap-2">
                    {Object.entries({
                        weather: 'WEATHER',
                        earthquake: 'DISASTER',
                        timer: 'CHRONO',
                        grid: 'WORLD'
                    }).map(([key, label]) => (
                        <button 
                            key={key}
                            onClick={() => toggleVisibility(key as any)}
                            className={`px-2 py-2 text-[9px] font-bold tracking-widest border transition-all ${visibility[key as keyof typeof visibility] ? 'bg-cyan-900/40 border-cyan-500 text-cyan-400' : 'bg-transparent border-slate-800 text-slate-600'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Slideshow Settings */}
                <div className="pt-4 border-t border-slate-800">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-cyan-400 font-digital tracking-widest text-[10px] font-bold uppercase">Slideshow</h4>
                        <div className="flex gap-2">
                            <button onClick={() => setIsShuffle(!isShuffle)} className={`text-[8px] px-1.5 py-0.5 border ${isShuffle ? 'border-cyan-500 text-cyan-400 bg-cyan-900/20' : 'border-slate-800 text-slate-600'}`}>SHUFFLE</button>
                            <button onClick={() => setIsSlideshowActive(!isSlideshowActive)} className={`text-[8px] px-1.5 py-0.5 border ${isSlideshowActive ? 'border-green-500 text-green-400 bg-green-900/20' : 'border-red-500 text-red-500'}`}>{isSlideshowActive ? 'AUTO ON' : 'AUTO OFF'}</button>
                        </div>
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                            <span>INTERVAL</span>
                            <span className="text-cyan-400">{slideshowInterval}s</span>
                        </div>
                        <input 
                            type="range" min="5" max="300" step="5" value={slideshowInterval}
                            onChange={(e) => setSlideshowInterval(parseInt(e.target.value))}
                            className="w-full h-1 bg-slate-800 appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>
                    
                    <div className="mt-3 flex justify-between items-center">
                        <span className="text-[9px] text-slate-500">ASSETS: {bgAssets.length}</span>
                        <button onClick={() => { setBgAssets([]); setCurrentBgIndex(0); }} className="text-[8px] text-red-500/60 hover:text-red-500 underline">CLEAR ALL</button>
                    </div>
                </div>

                {/* Audio Settings */}
                <div className="pt-4 border-t border-slate-800">
                    <h4 className="text-cyan-400 font-digital tracking-widest text-[10px] font-bold mb-3 uppercase">Background Volume</h4>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsBgMuted(!isBgMuted)} className={`text-[10px] transition-colors ${isBgMuted ? 'text-red-500' : 'text-cyan-400'}`}>
                            {isBgMuted ? 'MUTED' : 'LIVE'}
                        </button>
                        <input 
                            type="range" min="0" max="1" step="0.01" value={bgVolume}
                            onChange={(e) => setBgVolume(parseFloat(e.target.value))}
                            className="flex-1 h-1 bg-slate-800 appearance-none cursor-pointer accent-cyan-500"
                        />
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex gap-3 z-50 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <button onClick={() => setIsDisplaySettingsOpen(!isDisplaySettingsOpen)} className="text-slate-400 hover:text-white p-3 rounded-full border border-slate-700 bg-gray-900/80 transition-all hover:border-cyan-500/50 hover:shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        </button>
        <button onClick={() => setIsMusicOpen(!isMusicOpen)} className="text-slate-400 hover:text-white p-3 rounded-full border border-slate-700 bg-gray-900/80 transition-all hover:border-cyan-500/50 hover:shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-white p-3 rounded-full border border-slate-700 bg-gray-900/80 transition-all hover:border-cyan-500/50 hover:shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/mp4,video/quicktime,.mov" multiple className="hidden" />
      </div>
    </div>
  );
};

export default App;
