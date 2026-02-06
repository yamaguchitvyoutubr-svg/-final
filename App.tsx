
import React, { useState, useRef, useEffect } from 'react';
import { MainClock } from './components/MainClock';
import { WorldGrid } from './components/WorldGrid';
import { Timer } from './components/Timer';
import { WeatherWidget } from './components/WeatherWidget';
import { EarthquakeWidget } from './components/EarthquakeWidget';
import { ChatWidget } from './components/ChatWidget';
import { TutorialOverlay } from './components/TutorialOverlay';
import { useClock } from './hooks/useClock';

// Time Signal Audio Logic
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

    // "Bi-Bi" sound: Two short high pitched beeps
    // 1st Beep
    osc.frequency.setValueAtTime(1200, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);

    // 2nd Beep (slightly higher)
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
  const [isSignalEnabled, setIsSignalEnabled] = useState(false); // Time signal state
  const [isChatOpen, setIsChatOpen] = useState(false); // Chat window state
  const [showTutorial, setShowTutorial] = useState(false); // Tutorial state
  const lastSignalHourRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial Tutorial Check
  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenTutorial');
    if (!hasSeen) {
        setShowTutorial(true);
    }
  }, []);

  // Slideshow Logic: Rotate background every 60 seconds if multiple images exist
  useEffect(() => {
    if (bgImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % bgImages.length);
    }, 60000); // 60 seconds rotation

    return () => clearInterval(interval);
  }, [bgImages]);

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      bgImages.forEach(url => URL.revokeObjectURL(url));
    };
  }, [bgImages]);

  // Check for Time Signal trigger
  useEffect(() => {
    if (!isSignalEnabled) return;

    const currentHour = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    // Trigger exactly at 00:00, ensuring we haven't already played for this hour
    if (minutes === 0 && seconds === 0 && lastSignalHourRef.current !== currentHour) {
      playTimeSignal();
      lastSignalHourRef.current = currentHour;
    }
  }, [date, isSignalEnabled]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Clean up previous URLs before setting new ones
      bgImages.forEach(url => URL.revokeObjectURL(url));
      
      // Fix: Cast each file to Blob to satisfy URL.createObjectURL requirements and avoid 'unknown' type errors
      const newUrls = Array.from(files).map(file => URL.createObjectURL(file as Blob));
      setBgImages(newUrls);
      setCurrentBgIndex(0);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const currentBg = bgImages[currentBgIndex] || null;

  return (
    <div 
      className="min-h-screen bg-black text-slate-200 flex flex-col items-center p-4 md:p-8 relative overflow-y-auto overflow-x-hidden font-sans transition-all duration-700 bg-cover bg-center bg-no-repeat"
      style={currentBg ? { backgroundImage: `url(${currentBg})` } : {}}
    >
      {/* Dark Overlay to ensure text readability over custom images */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${currentBg ? 'bg-black/70' : 'bg-black'}`} />
      
      {/* Tutorial Overlay */}
      {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}

      {/* Main Layout Container - increased width to 95% for extra space */}
      <main className="w-[95%] flex flex-col items-center gap-10 md:gap-12 z-10 relative my-auto py-8">
        
        {/* Top Section: Main Clock, Weather & Earthquake */}
        <section className="w-full flex flex-col items-center py-4 gap-2">
          <MainClock date={date} />
          {/* Z-Index Stacking Context for Dropdowns */}
          <div className="w-full flex justify-center z-30">
            <WeatherWidget />
          </div>
          <div className="w-full flex justify-center z-20">
            <EarthquakeWidget />
          </div>
        </section>

        {/* Middle Section: Timer (Always Visible) */}
        <section className="w-full flex justify-center animate-[fadeIn_0.3s_ease-out] z-10">
          <Timer />
        </section>

        {/* Bottom Section: Grid */}
        <section className="w-full z-0">
          <WorldGrid date={date} />
        </section>

      </main>
      
      {/* Chat Widget (Fixed Position) */}
      <ChatWidget isOpen={isChatOpen} />

      {/* Bottom Right Controls */}
      <div className="fixed bottom-6 right-6 flex gap-3 z-50 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
        
        {/* Help / Tutorial Button */}
        <button
          onClick={() => setShowTutorial(true)}
          className="text-slate-400 hover:text-white p-3 rounded-full bg-gray-900/80 border border-slate-700 hover:border-cyan-500 transition-all duration-300 outline-none"
          title="Open Manual"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </button>

        {/* Chat Toggle Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`text-slate-400 hover:text-white p-3 rounded-full border transition-all duration-300 outline-none ${isChatOpen ? 'bg-cyan-900/50 border-cyan-500 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-gray-900/80 border-slate-700 hover:border-cyan-500'}`}
          title={isChatOpen ? "Close AI Chat" : "Open AI Chat"}
        >
          {/* Chat Bubble Icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>

        {/* Time Signal Toggle Button */}
        <button
          onClick={() => setIsSignalEnabled(!isSignalEnabled)}
          className={`text-slate-400 hover:text-white p-3 rounded-full border transition-all duration-300 outline-none ${isSignalEnabled ? 'bg-cyan-900/50 border-cyan-500 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-gray-900/80 border-slate-700 hover:border-cyan-500'}`}
          title={isSignalEnabled ? "Disable Hourly Signal" : "Enable Hourly Signal"}
        >
          {/* Bell Icon */}
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </button>

        {/* Background Upload Button (Gallery Mode Enabled) */}
        <button
          onClick={triggerFileInput}
          className={`text-slate-400 hover:text-white p-3 rounded-full border transition-all duration-300 outline-none ${bgImages.length > 1 ? 'bg-cyan-900/50 border-cyan-500 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-gray-900/80 border-slate-700 hover:border-cyan-500'}`}
          title={bgImages.length > 1 ? `Slideshow Active (${bgImages.length} images)` : "Set Background Image(s)"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          multiple
          className="hidden"
        />
      </div>
    </div>
  );
};

export default App;
