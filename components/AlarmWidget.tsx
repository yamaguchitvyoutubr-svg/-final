
import React, { useState, useEffect, useCallback, useRef } from 'react';

interface Alarm {
  id: string;
  time: string; // HH:MM
  label: string;
  enabled: boolean;
}

interface AlarmWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
}

const playAlarmSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // 強力な警告音の生成
    const sequence = 10;
    for (let i = 0; i < sequence; i++) {
      const startTime = now + (i * 0.4);
      [880, 1100, 1320].forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq / 2, startTime + 0.3);
        
        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    }
  } catch (e) {
    console.error("Alarm audio failed", e);
  }
};

export const AlarmWidget: React.FC<AlarmWidgetProps> = ({ isOpen, onClose, currentDate }) => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [newTime, setNewTime] = useState("07:00");
  const [newLabel, setNewLabel] = useState("");
  const [triggeredAlarm, setTriggeredAlarm] = useState<Alarm | null>(null);
  const lastCheckedMinute = useRef<number>(-1);

  useEffect(() => {
    const saved = localStorage.getItem('system_alarms_v2');
    if (saved) {
      try { setAlarms(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('system_alarms_v2', JSON.stringify(alarms));
  }, [alarms]);

  // アラームチェック
  useEffect(() => {
    const hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    if (currentMinutes === lastCheckedMinute.current) return;
    lastCheckedMinute.current = currentMinutes;

    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    const matched = alarms.find(a => a.enabled && a.time === timeString);
    if (matched) {
      setTriggeredAlarm(matched);
      playAlarmSound();
    }
  }, [currentDate, alarms]);

  const addAlarm = () => {
    if (!newTime) return;
    const alarm: Alarm = {
      id: Math.random().toString(36).substr(2, 9),
      time: newTime,
      label: newLabel || "ALARM",
      enabled: true
    };
    setAlarms(prev => [...prev, alarm].sort((a, b) => a.time.localeCompare(b.time)));
    setNewLabel("");
  };

  const deleteAlarm = (id: string) => {
    setAlarms(prev => prev.filter(a => a.id !== id));
  };

  const toggleAlarm = (id: string) => {
    setAlarms(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  if (triggeredAlarm) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-xl animate-pulse">
        <div className="flex flex-col items-center gap-8 p-16 border-8 border-red-500 shadow-[0_0_100px_rgba(239,68,68,0.8)]">
            <div className="text-red-500 font-digital text-[12rem] leading-none tracking-tighter italic animate-bounce">
                {triggeredAlarm.time}
            </div>
            <div className="text-white font-digital tracking-[1em] text-4xl uppercase text-center font-bold">
                {triggeredAlarm.label} DETECTED
            </div>
            <button 
                onClick={() => setTriggeredAlarm(null)}
                className="mt-8 px-20 py-6 bg-white text-red-600 font-black tracking-[0.5em] text-2xl hover:bg-red-600 hover:text-white transition-all duration-300 shadow-2xl"
            >
                ACKNOWLEDGE
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-24 right-6 w-80 md:w-96 bg-black/95 border border-slate-700 p-4 rounded-sm z-[60] shadow-2xl backdrop-blur-xl transition-all duration-300 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-3">
        <h3 className="text-cyan-400 font-digital tracking-[0.3em] text-sm font-bold uppercase">ALARM_TERMINAL</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">✕</button>
      </div>

      <div className="space-y-6">
        <div className="p-3 bg-slate-900/40 border border-slate-800">
            <label className="text-[10px] text-slate-500 tracking-widest uppercase mb-2 block">Trigger Time</label>
            <div className="flex gap-2">
                <input 
                    type="time" 
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="flex-1 bg-black border border-slate-700 p-2 text-white font-digital text-2xl rounded-sm focus:border-cyan-500 outline-none"
                />
                <button 
                    onClick={addAlarm}
                    className="px-6 bg-cyan-900/30 border border-cyan-700 text-cyan-400 font-bold hover:bg-cyan-500 hover:text-black transition-all"
                >
                    ADD
                </button>
            </div>
            <input 
                type="text"
                placeholder="LABEL (e.g. MEETING)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value.toUpperCase())}
                className="mt-2 w-full bg-black border border-slate-700 p-2 text-[10px] text-slate-400 tracking-widest font-mono rounded-sm focus:border-cyan-500 outline-none"
            />
        </div>

        <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {alarms.length === 0 ? (
                <div className="py-10 text-center text-[9px] text-slate-700 tracking-[0.4em]">NO_DATA</div>
            ) : (
                alarms.map(alarm => (
                    <div key={alarm.id} className={`flex items-center justify-between p-3 border rounded-sm transition-all ${alarm.enabled ? 'bg-cyan-950/20 border-cyan-900/50' : 'bg-transparent border-slate-800'}`}>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => toggleAlarm(alarm.id)}
                                className={`w-10 h-5 rounded-full relative transition-colors ${alarm.enabled ? 'bg-cyan-500' : 'bg-slate-800'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${alarm.enabled ? 'left-6' : 'left-1'}`} />
                            </button>
                            <div>
                                <div className={`font-digital text-2xl leading-none ${alarm.enabled ? 'text-white' : 'text-slate-600'}`}>{alarm.time}</div>
                                <div className="text-[8px] text-slate-500 tracking-widest mt-1">{alarm.label}</div>
                            </div>
                        </div>
                        <button onClick={() => deleteAlarm(alarm.id)} className="text-slate-600 hover:text-red-500 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};
