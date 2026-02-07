
import React, { useState, useEffect } from 'react';

interface TutorialOverlayProps {
  onClose: () => void;
}

const STEPS = [
  {
    title: "SYSTEM INITIALIZED",
    content: "Welcome to the World Chronometer Dashboard. This system provides high-precision timekeeping, real-time disaster monitoring, and local asset management. Click 'NEXT' to review operational procedures."
  },
  {
    title: "TOP SECTOR: CHRONOMETRY",
    content: (
        <ul className="list-disc list-inside space-y-2 text-slate-300">
            <li><strong className="text-cyan-400">Main Clock:</strong> Displays local time with atomic precision. Brackets indicate active synchronization.</li>
            <li><strong className="text-cyan-400">Date Module:</strong> A dedicated calendar unit showing current Month, Year, Day, and Weekday.</li>
            <li><strong className="text-cyan-400">UTC Monitor:</strong> Secondary chronometer displaying London/Standard time for global coordination.</li>
        </ul>
    )
  },
  {
    title: "ENVIRONMENTAL SENSORS",
    content: (
        <ul className="list-disc list-inside space-y-2 text-slate-300">
            <li><strong className="text-cyan-400">Weather Sensor:</strong> Shows local conditions. Data for all monitors and world cities is synchronized every 15 minutes. Check the <span className="text-cyan-500 font-mono">SYNC</span> timestamp for data freshness.</li>
            <li><strong className="text-cyan-400">Disaster Monitor:</strong> Real-time Seismic & Tsunami data. High-speed polling (6s) is active for maximum safety. Use <span className="text-xs border border-slate-600 px-1 rounded">TEST</span> to simulate emergency events.</li>
        </ul>
    )
  },
  {
    title: "UTILITIES & GRID",
    content: (
        <ul className="list-disc list-inside space-y-2 text-slate-300">
            <li><strong className="text-cyan-400">Chronograph:</strong> Toggle between TIMER and STOPWATCH. Operation continues accurately in background sessions.</li>
            <li><strong className="text-cyan-400">World Grid:</strong> Monitors TYO, BER, WAS, and SGP. Highlights in <span className="text-red-500">RED</span> if severe weather is detected at the target coordinate.</li>
        </ul>
    )
  },
  {
    title: "COMMAND DECK: LOCAL ASSETS",
    content: (
        <ul className="list-disc list-inside space-y-2 text-slate-300">
            <li><strong className="text-cyan-400">Audio Terminal:</strong> Import and play local MP3 files directly from your device. Supports playlists and background playback.</li>
            <li><strong className="text-cyan-400">AI Comm Link:</strong> Consult the System Operator (Gemini AI) for data analysis or assistance.</li>
            <li><strong className="text-cyan-400">Display Config:</strong> Use the grid icon to toggle visibility of specific modules for a cleaner interface.</li>
            <li><strong className="text-cyan-400">Visuals:</strong> Customize the dashboard by uploading local image or video (<span className="text-cyan-400">.mp4 / .mov</span>) assets as background textures.</li>
        </ul>
    )
  }
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay for fade-in effect
    setIsVisible(true);
  }, []);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('hasSeenTutorial', 'true');
    }
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for fade out
  };

  const step = STEPS[currentStep];

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="bg-slate-900 border border-cyan-500/50 w-full max-w-lg p-1 shadow-[0_0_30px_rgba(6,182,212,0.2)] m-4 relative overflow-hidden">
        
        {/* Decorative corner markers */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-500"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-500"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-500"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-500"></div>

        {/* Header */}
        <div className="bg-cyan-950/50 p-3 border-b border-cyan-900 flex justify-between items-center">
            <h2 className="text-cyan-400 font-digital tracking-widest font-bold text-lg">OPERATIONAL MANUAL</h2>
            <div className="flex gap-1">
                {STEPS.map((_, idx) => (
                    <div key={idx} className={`h-1.5 w-6 skew-x-[-20deg] ${idx === currentStep ? 'bg-cyan-400' : idx < currentStep ? 'bg-cyan-800' : 'bg-slate-800'}`}></div>
                ))}
            </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[220px] flex flex-col justify-center">
            <h3 className="text-white font-sans font-bold tracking-widest text-xl mb-4 border-l-4 border-cyan-500 pl-3">
                {step.title}
            </h3>
            <div className="text-sm font-sans leading-relaxed text-slate-300">
                {step.content}
            </div>
        </div>

        {/* Footer / Controls */}
        <div className="p-4 border-t border-cyan-900/30 bg-black/20 flex flex-col gap-4">
            
            <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-4 h-4 border border-slate-600 flex items-center justify-center transition-colors ${dontShowAgain ? 'bg-cyan-900 border-cyan-500' : 'group-hover:border-cyan-500'}`}>
                        {dontShowAgain && <span className="text-cyan-400 text-xs">✓</span>}
                    </div>
                    <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={dontShowAgain}
                        onChange={(e) => setDontShowAgain(e.target.checked)}
                    />
                    <span className={`text-[10px] tracking-wider ${dontShowAgain ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
                        DO NOT SHOW ON NEXT STARTUP
                    </span>
                </label>

                <div className="text-[10px] text-slate-600 font-mono">
                    PROCEDURE {currentStep + 1}/{STEPS.length}
                </div>
            </div>

            <div className="flex gap-3 justify-end">
                {currentStep > 0 && (
                    <button 
                        onClick={handlePrev}
                        className="px-4 py-2 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-xs tracking-widest transition-colors"
                    >
                        PREVIOUS
                    </button>
                )}
                
                <button 
                    onClick={handleNext}
                    className="px-6 py-2 bg-cyan-900/30 border border-cyan-600 text-cyan-400 hover:bg-cyan-800/40 hover:text-cyan-200 text-xs tracking-widest font-bold transition-all shadow-[0_0_10px_rgba(6,182,212,0.1)] hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                    {currentStep === STEPS.length - 1 ? "ACKNOWLEDGE & CLOSE" : "NEXT PROCEDURE"}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};
