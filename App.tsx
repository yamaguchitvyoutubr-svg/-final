
import React, { useState, useRef, useEffect } from 'react';
import { MainClock } from './components/MainClock';
import { WorldGrid } from './components/WorldGrid';
import { Timer } from './components/Timer';
import { WeatherWidget } from './components/WeatherWidget';
import { EarthquakeWidget } from './components/EarthquakeWidget';
import { ChatWidget } from './components/ChatWidget';
import { LocalMusicPlayer } from './components/LocalMusicPlayer';
import { TutorialOverlay } from './components/TutorialOverlay';
import { useClock } from './hooks/useClock';

const playTimeSignal = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    osc.frequency.setValueAtTime(1600, now + 0.15);
    gain.gain.setValueAtTime(0.1, now + 0.15);
    gain.gain.linearRampToValueAtTime(0, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    console.error("Signal audio failed", e);
  }
};

const App: React.FC = () => {
  const { date } = useClock();
  const [bgImages, setBgImages] = useState<string[]>([]);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [isSignalEnabled, setIsSignalEnabled] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMusicOpen, setIsMusicOpen] = useState(false);
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Visibility States for Modules
  const [visibility, setVisibility] = useState({
    weather: true,
    earthquake: true,
    timer: true,
    grid: true,
  });

  const lastSignalHourRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenTutorial');
    if (!hasSeen) setShowTutorial(true);
    
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
    if (bgImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % bgImages.length);
    }, 60000);
    return () => clearInterval(interval);
  }, [bgImages]);

  useEffect(() => {
    return () => bgImages.forEach(url => URL.revokeObjectURL(url));
  }, [bgImages]);

  useEffect(() => {
    if (!isSignalEnabled) return;
    const currentHour = date.getHours();
    if (date.getMinutes() === 0 && date.getSeconds() === 0 && lastSignalHourRef.current !== currentHour) {
      playTimeSignal();
      lastSignalHourRef.current = currentHour;
    }
  }, [date, isSignalEnabled]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      bgImages.forEach(url => URL.revokeObjectURL(url));
      const newUrls = Array.from(files).map(file => URL.createObjectURL(file as Blob));
      setBgImages(newUrls);
      setCurrentBgIndex(0);
    }
  };

  const toggleVisibility = (key: keyof typeof visibility) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const triggerFileInput = () => fileInputRef.current?.click();
  const currentBg = bgImages[currentBgIndex] || null;

  return (
    <div 
      className="min-h-screen bg-black text-slate-200 flex flex-col items-center p-4 md:p-8 relative overflow-y-auto overflow-x-hidden font-sans transition-all duration-700 bg-cover bg-center bg-no-repeat"
      style={currentBg ? { backgroundImage: `url(${currentBg})` } : {}}
    >
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${currentBg ? 'bg-black/75' : 'bg-black'}`} />
      
      {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}

      <main className="w-[95%] flex flex-col items-center gap-10 md:gap-12 z-10 relative my-auto py-8">
        <section className="w-full flex flex-col items-center py-4 gap-2">
          <MainClock date={date} />
          
          {visibility.weather && (
            <div className="w-full flex justify-center z-30 transition-all duration-500 animate-[fadeIn_0.5s_ease-out]">
                <WeatherWidget />
            </div>
          )}
          
          {visibility.earthquake && (
            <div className="w-full flex justify-center z-20 transition-all duration-500 animate-[fadeIn_0.5s_ease-out]">
                <EarthquakeWidget />
            </div>
          )}
        </section>

        {visibility.timer && (
          <section className="w-full flex justify-center animate-[fadeIn_0.3s_ease-out] z-10 transition-all duration-500">
            <Timer />
          </section>
        )}

        {visibility.grid && (
          <section className="w-full z-0 transition-all duration-500 animate-[fadeIn_0.3s_ease-out]">
            <WorldGrid date={date} />
          </section>
        )}
      </main>
      
      <ChatWidget isOpen={isChatOpen} />
      <LocalMusicPlayer isOpen={isMusicOpen} onClose={() => setIsMusicOpen(false)} />

      {/* Display Control Menu */}
      {isDisplaySettingsOpen && (
        <div className="fixed bottom-24 right-6 bg-black/90 border border-slate-700 p-4 rounded-sm z-[60] shadow-2xl animate-[slideIn_0.2s_ease-out] w-56">
            <h4 className="text-cyan-400 font-digital tracking-widest text-[10px] font-bold mb-3 border-b border-slate-800 pb-1">MODULE DISPLAY CONFIG</h4>
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
                            className={`w-3.5 h-3.5 border flex items-center justify-center transition-colors ${visibility[key as keyof typeof visibility] ? 'bg-cyan-900 border-cyan-500' : 'border-slate-700 group-hover:border-slate-500'}`}
                        >
                            {visibility[key as keyof typeof visibility] && <span className="text-cyan-400 text-[10px]">✓</span>}
                        </div>
                        <span className={`text-[10px] tracking-widest ${visibility[key as keyof typeof visibility] ? 'text-slate-200' : 'text-slate-600'}`}>{label}</span>
                    </label>
                ))}
            </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 flex gap-3 z-50 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
        <button
          onClick={() => setIsDisplaySettingsOpen(!isDisplaySettingsOpen)}
          className={`text-slate-400 hover:text-white p-3 rounded-full border transition-all duration-300 outline-none ${isDisplaySettingsOpen ? 'bg-cyan-900/50 border-cyan-500 text-cyan-200' : 'bg-gray-900/80 border-slate-700 hover:border-cyan-500'}`}
          title="Display Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        </button>

        <button
          onClick={() => setShowTutorial(true)}
          className="text-slate-400 hover:text-white p-3 rounded-full bg-gray-900/80 border border-slate-700 hover:border-cyan-500 transition-all duration-300 outline-none"
          title="Manual"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </button>

        <button
          onClick={() => setIsMusicOpen(!isMusicOpen)}
          className={`text-slate-400 hover:text-white p-3 rounded-full border transition-all duration-300 outline-none ${isMusicOpen ? 'bg-cyan-900/50 border-cyan-500 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-gray-900/80 border-slate-700 hover:border-cyan-500'}`}
          title="Local Music Player"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
        </button>

        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`text-slate-400 hover:text-white p-3 rounded-full border transition-all duration-300 outline-none ${isChatOpen ? 'bg-cyan-900/50 border-cyan-500 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-gray-900/80 border-slate-700 hover:border-cyan-500'}`}
          title="AI Chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </button>

        <button
          onClick={() => setIsSignalEnabled(!isSignalEnabled)}
          className={`text-slate-400 hover:text-white p-3 rounded-full border transition-all duration-300 outline-none ${isSignalEnabled ? 'bg-cyan-900/50 border-cyan-500 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-gray-900/80 border-slate-700 hover:border-cyan-500'}`}
          title="Hourly Signal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>

        <button
          onClick={triggerFileInput}
          className={`text-slate-400 hover:text-white p-3 rounded-full border transition-all duration-300 outline-none ${bgImages.length > 1 ? 'bg-cyan-900/50 border-cyan-500 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-gray-900/80 border-slate-700 hover:border-cyan-500'}`}
          title="Background Upload"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
      </div>
    </div>
  );
};

export default App;
