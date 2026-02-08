
import React, { useState, useRef, useEffect } from 'react';
import { MainClock } from './components/MainClock';
import { WorldGrid } from './components/WorldGrid';
import { Timer } from './components/Timer';
import { WeatherWidget } from './components/WeatherWidget';
import { EarthquakeWidget } from './components/EarthquakeWidget';
import { LocalMusicPlayer } from './components/LocalMusicPlayer';
import { TutorialOverlay } from './components/TutorialOverlay';
import { useClock } from './hooks/useClock';

interface BackgroundAsset {
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
  const [isBgMuted, setIsBgMuted] = useState(true); // 初期値はブラウザ制限回避のためtrue
  const [isSystemStarted, setIsSystemStarted] = useState(false);
  
  const [visibility, setVisibility] = useState({
    weather: true,
    earthquake: true,
    timer: true,
    grid: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenTutorial');
    if (!hasSeen) {
        setShowTutorial(true);
    } else {
        // すでに見たことがある場合も、どこかをクリックしないと音が出ないので注意喚起が必要
        setIsSystemStarted(false); 
    }
    
    const savedVisibility = localStorage.getItem('module_visibility');
    if (savedVisibility) {
        try {
            setVisibility(JSON.parse(savedVisibility));
        } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('module_visibility', JSON.stringify(visibility));
  }, [visibility]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && isSystemStarted) {
        video.volume = isBgMuted ? 0 : bgVolume;
        video.muted = isBgMuted;
        
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                // 自動再生が拒否された場合はミュートにする
                video.muted = true;
            });
        }
    }
  }, [bgVolume, isBgMuted, currentBgIndex, isSystemStarted]);

  const handleStartSystem = () => {
    setIsSystemStarted(true);
    setIsBgMuted(false); // システム開始時に音を出す
    setShowTutorial(false);
    localStorage.setItem('hasSeenTutorial', 'true');
    
    // 背景ビデオがあれば再生
    if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.play().catch(e => console.warn("Video play failed on start", e));
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newAssets: BackgroundAsset[] = Array.from(files).map((file: File) => {
        const type = (file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.mov')) ? 'video' : 'image';
        return {
          url: URL.createObjectURL(file as Blob),
          type: type as 'image' | 'video',
          label: 'USER'
        };
      });
      setBgAssets(prev => [...prev, ...newAssets]);
      setCurrentBgIndex(bgAssets.length);
      setIsBgMuted(false);
    }
  };

  const toggleVisibility = (key: keyof typeof visibility) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const triggerFileInput = () => fileInputRef.current?.click();
  const currentAsset = bgAssets[currentBgIndex] || null;

  return (
    <div className="min-h-screen bg-black text-slate-200 flex flex-col items-center p-4 md:p-8 relative overflow-y-auto overflow-x-hidden font-sans transition-all duration-700">
      
      {/* Background Layer */}
      {currentAsset && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          {currentAsset.type === 'video' ? (
            <video 
              ref={videoRef}
              key={currentAsset.url}
              autoPlay 
              loop 
              muted={isBgMuted}
              playsInline
              preload="auto"
              className="w-full h-full object-cover"
            >
              <source src={currentAsset.url} type="video/mp4" />
              <source src={currentAsset.url} type="video/quicktime" />
            </video>
          ) : (
            <div 
              className="w-full h-full bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${currentAsset.url})` }}
            />
          )}
          <div className="absolute inset-0 bg-black/75 transition-opacity duration-1000" />
        </div>
      )}
      
      {showTutorial && <TutorialOverlay onClose={handleStartSystem} />}

      {/* Start Button Overlay for returning users to unlock audio */}
      {!isSystemStarted && !showTutorial && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <button 
                onClick={handleStartSystem}
                className="group relative px-12 py-4 bg-cyan-900/20 border border-cyan-500 text-cyan-400 font-digital tracking-[0.5em] text-xl hover:bg-cyan-500 hover:text-black transition-all duration-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                  INITIALIZE SYSTEM
                  <div className="absolute -inset-1 border border-cyan-500/30 group-hover:scale-110 transition-transform duration-500 pointer-events-none"></div>
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
        <div className="fixed bottom-24 right-6 bg-black/90 border border-slate-700 p-4 rounded-sm z-[60] shadow-2xl w-64">
            <h4 className="text-cyan-400 font-digital tracking-widest text-[10px] font-bold mb-3 border-b border-slate-800 pb-1">DISPLAY CONFIG</h4>
            <div className="flex flex-col gap-3">
                {Object.entries({
                    weather: 'WEATHER SENSOR',
                    earthquake: 'DISASTER MONITOR',
                    timer: 'CHRONOGRAPH',
                    grid: 'WORLD GRID'
                }).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer group">
                        <div 
                            onClick={() => toggleVisibility(key as any)}
                            className={`w-3.5 h-3.5 border flex items-center justify-center transition-colors ${visibility[key as keyof typeof visibility] ? 'bg-cyan-900 border-cyan-500' : 'border-slate-700'}`}
                        >
                            {visibility[key as keyof typeof visibility] && <span className="text-cyan-400 text-[10px]">✓</span>}
                        </div>
                        <span className="text-[10px] tracking-widest">{label}</span>
                    </label>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800">
                <h4 className="text-cyan-400 font-digital tracking-widest text-[10px] font-bold mb-3">BACKGROUND AUDIO</h4>
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                        <button 
                            onClick={() => setIsBgMuted(!isBgMuted)}
                            className={`p-1.5 border text-[10px] rounded-sm transition-all ${isBgMuted ? 'border-red-500 text-red-500' : 'border-cyan-800 text-cyan-400'}`}
                        >
                            {isBgMuted ? 'MUTE ON' : 'MUTE OFF'}
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

      <div className="fixed bottom-6 right-6 flex gap-3 z-50 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <button onClick={() => setIsDisplaySettingsOpen(!isDisplaySettingsOpen)} className="text-slate-400 hover:text-white p-3 rounded-full border border-slate-700 bg-gray-900/80 transition-all"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></button>
        <button onClick={() => setIsMusicOpen(!isMusicOpen)} className="text-slate-400 hover:text-white p-3 rounded-full border border-slate-700 bg-gray-900/80 transition-all"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg></button>
        <button onClick={triggerFileInput} className="text-slate-400 hover:text-white p-3 rounded-full border border-slate-700 bg-gray-900/80 transition-all"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/mp4,video/quicktime,.mov" multiple className="hidden" />
      </div>
    </div>
  );
};

export default App;
