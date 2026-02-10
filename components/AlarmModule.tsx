
import React, { useState } from 'react';

interface Alarm {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
}

interface AlarmModuleProps {
  alarms: Alarm[];
  setAlarms: React.Dispatch<React.SetStateAction<Alarm[]>>;
}

export const AlarmModule: React.FC<AlarmModuleProps> = ({ alarms, setAlarms }) => {
  const [newTime, setNewTime] = useState("07:00");
  const [newLabel, setNewLabel] = useState("");

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

  return (
    <div className="w-full max-w-4xl bg-slate-900/40 border border-slate-800 backdrop-blur-md p-4 md:p-6 rounded-sm shadow-xl flex flex-col md:flex-row gap-6">
      {/* Input Section */}
      <div className="flex flex-col gap-3 w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 pb-4 md:pb-0 md:pr-6">
        <h3 className="text-cyan-400 font-digital tracking-widest text-xs font-bold uppercase">ADD_ALARM</h3>
        <input 
            type="time" 
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="bg-black border border-slate-700 p-2 text-white font-digital text-2xl rounded-sm focus:border-cyan-500 outline-none"
        />
        <input 
            type="text"
            placeholder="LABEL..."
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value.toUpperCase())}
            className="bg-black border border-slate-700 p-2 text-[10px] text-slate-400 tracking-widest font-mono rounded-sm outline-none"
        />
        <button 
            onClick={addAlarm}
            className="w-full bg-cyan-900/30 border border-cyan-700 text-cyan-400 py-2 text-xs font-bold hover:bg-cyan-500 hover:text-black transition-all uppercase tracking-widest"
        >
            Deploy Trigger
        </button>
      </div>

      {/* List Section */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        <div className="flex justify-between items-center px-1">
             <h3 className="text-slate-500 font-digital tracking-widest text-xs font-bold uppercase">Active_Schedulers</h3>
             <span className="text-[8px] text-slate-700 font-mono uppercase">Background Check: ON</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {alarms.length === 0 ? (
                <div className="col-span-full py-8 text-center text-[9px] text-slate-700 tracking-[0.4em] uppercase">No active alarm protocols</div>
            ) : (
                alarms.map(alarm => (
                    <div key={alarm.id} className={`flex items-center justify-between p-3 border rounded-sm transition-all ${alarm.enabled ? 'bg-cyan-950/20 border-cyan-900/50' : 'bg-transparent border-slate-800'}`}>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => toggleAlarm(alarm.id)}
                                className={`w-8 h-4 rounded-full relative transition-colors ${alarm.enabled ? 'bg-cyan-500' : 'bg-slate-800'}`}
                            >
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${alarm.enabled ? 'left-4.5' : 'left-0.5'}`} />
                            </button>
                            <div>
                                <div className={`font-digital text-xl leading-none ${alarm.enabled ? 'text-white' : 'text-slate-600'}`}>{alarm.time}</div>
                                <div className="text-[7px] text-slate-500 tracking-widest mt-0.5 truncate max-w-[80px]">{alarm.label}</div>
                            </div>
                        </div>
                        <button onClick={() => deleteAlarm(alarm.id)} className="text-slate-600 hover:text-red-500 transition-colors">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                        </button>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};
