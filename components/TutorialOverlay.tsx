
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
    title: "CHRONOMETRY & SENSORS",
    content: (
        <ul className="list-disc list-inside space-y-2 text-slate-300">
            <li><strong className="text-cyan-400">Main Clock:</strong> Atomic precision monitoring with localized time zone support.</li>
            <li><strong className="text-cyan-400">Environment:</strong> Real-time weather and seismic sensors polled at high speed.</li>
        </ul>
    )
  },
  {
    title: "LOCAL ASSET TERMINAL",
    content: (
        <ul className="list-disc list-inside space-y-2 text-slate-300">
            <li><strong className="text-cyan-400">Privacy First:</strong> This system does not load external assets. All media is handled locally.</li>
            <li><strong className="text-cyan-400">Usage:</strong> Use the icons in the bottom right corner to import your own audio, video, or image files to customize your workspace.</li>
        </ul>
    )
  }
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }
  };

  const step = STEPS[currentStep];

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="bg-slate-900 border border-cyan-500/50 w-full max-w-lg p-1 shadow-[0_0_30px_rgba(6,182,212,0.2)] m-4 relative">
        <div className="bg-cyan-950/50 p-3 border-b border-cyan-900 flex justify-between items-center">
            <h2 className="text-cyan-400 font-digital tracking-widest font-bold text-lg uppercase">SYSTEM PROTOCOL</h2>
            <div className="flex gap-1">
                {STEPS.map((_, idx) => (
                    <div key={idx} className={`h-1.5 w-6 skew-x-[-20deg] ${idx === currentStep ? 'bg-cyan-400' : 'bg-slate-800'}`}></div>
                ))}
            </div>
        </div>

        <div className="p-6 min-h-[200px] flex flex-col justify-center">
            <h3 className="text-white font-sans font-bold tracking-widest text-xl mb-4 border-l-4 border-cyan-500 pl-3 uppercase">
                {step.title}
            </h3>
            <div className="text-sm font-sans leading-relaxed text-slate-300">
                {step.content}
            </div>
        </div>

        <div className="p-4 border-t border-cyan-900/30 bg-black/20 flex justify-end gap-3">
            <button 
                onClick={handleNext}
                className="px-8 py-3 bg-cyan-900/30 border border-cyan-600 text-cyan-400 hover:bg-cyan-800/40 hover:text-cyan-200 text-xs tracking-widest font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] uppercase"
            >
                {currentStep === STEPS.length - 1 ? "INITIALIZE SYSTEM" : "NEXT PROCEDURE"}
            </button>
        </div>
      </div>
    </div>
  );
};
