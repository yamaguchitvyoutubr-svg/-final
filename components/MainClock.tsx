
import React, { useMemo, useState, useEffect } from 'react';

interface MainClockProps {
  date: Date;
}

const SubClock: React.FC<{ label: string; zone: string; date: Date; color: string }> = ({ label, zone, date, color }) => {
  const time = useMemo(() => {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  }, [date, zone]);

  return (
    <div className="flex flex-col items-center px-8 border-x border-slate-800/30">
      <span className={`text-[9px] tracking-[0.4em] font-bold ${color} mb-1 opacity-70 uppercase`}>{label}</span>
      <span className="font-digital text-xl md:text-3xl tracking-[0.1em] text-slate-300 tabular-nums font-medium">
        {time}
      </span>
    </div>
  );
};

const CalendarWidget: React.FC<{ date: Date }> = ({ date }) => {
    const month = useMemo(() => new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase(), [date]);
    const day = useMemo(() => date.getDate().toString().padStart(2, '0'), [date]);
    const year = useMemo(() => date.getFullYear(), [date]);
    const weekday = useMemo(() => new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date).toUpperCase(), [date]);

    return (
        <div className="hidden lg:flex flex-col items-end justify-center w-48 gap-3 select-none">
            <div className="w-full text-right">
                <div className="text-[10px] text-cyan-600 tracking-[0.4em] font-mono mb-1">DATE MODULE</div>
                <div className="text-[9px] text-slate-500 font-sans tracking-widest uppercase">{month} / {year}</div>
            </div>
            <div className="flex flex-col items-end border-r-2 border-slate-800 pr-3 py-1 gap-1">
                <div className="text-5xl font-digital text-white leading-none tracking-tighter italic">
                    {day}
                </div>
                <div className="text-[10px] font-digital text-cyan-500/80 tracking-[0.2em] font-bold mt-1">
                    {weekday}
                </div>
            </div>
        </div>
    );
};

const CountdownWidget: React.FC<{ currentDate: Date }> = ({ currentDate }) => {
    const [targetDate, setTargetDate] = useState<string>(() => {
        return localStorage.getItem('system_countdown_target') || "";
    });
    const [isEditing, setIsEditing] = useState(false);

    const timeLeft = useMemo(() => {
        let target: number;
        let isFallback = false;

        if (targetDate) {
            target = new Date(targetDate).getTime();
        } else {
            // 未設定時は次の日の00:00をターゲットにする
            const nextMidnight = new Date(currentDate);
            nextMidnight.setHours(24, 0, 0, 0);
            target = nextMidnight.getTime();
            isFallback = true;
        }

        const now = currentDate.getTime();
        const diff = target - now;

        if (diff <= 0 && !isFallback) return { d: 0, h: 0, m: 0, s: 0, expired: true, isFallback };

        return {
            d: Math.floor(diff / (1000 * 60 * 60 * 24)),
            h: Math.floor((diff / (1000 * 60 * 60)) % 24),
            m: Math.floor((diff / (1000 * 60)) % 60),
            s: Math.floor((diff / 1000) % 60),
            expired: false,
            isFallback
        };
    }, [targetDate, currentDate]);

    const handleSave = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTargetDate(e.target.value);
        localStorage.setItem('system_countdown_target', e.target.value);
    };

    const handleReset = () => {
        setTargetDate("");
        localStorage.removeItem('system_countdown_target');
    };

    return (
        <div className="hidden lg:flex flex-col items-start justify-center w-48 gap-4 select-none">
            <div className="w-full">
                <div className="text-[10px] text-cyan-600 tracking-widest font-mono mb-2 flex justify-between items-center border-b border-slate-800 pb-1">
                    <span>COUNTDOWN</span>
                    <button 
                        onClick={() => setIsEditing(!isEditing)} 
                        className="text-[8px] border border-slate-700 px-2 py-0.5 text-slate-500 hover:border-cyan-500 hover:text-cyan-400 transition-all"
                    >
                        {isEditing ? 'CLOSE' : 'SET TARGET'}
                    </button>
                </div>

                {isEditing ? (
                    <div className="animate-[fadeIn_0.2s] space-y-2">
                        <input 
                            type="datetime-local" 
                            value={targetDate}
                            onChange={handleSave}
                            className="bg-black border border-slate-700 text-cyan-400 text-[10px] p-2 w-full outline-none focus:border-cyan-500 rounded-sm font-digital"
                        />
                        <button 
                            onClick={handleReset}
                            className="w-full text-[8px] bg-red-950/20 border border-red-900/50 text-red-500 py-1 hover:bg-red-900/40 transition-all font-mono uppercase tracking-widest"
                        >
                            Reset to Daily 00:00
                        </button>
                        <div className="text-[8px] text-slate-600 font-mono uppercase">SYTEM TARGET LOCK</div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {timeLeft?.expired ? (
                            <div className="text-red-500 font-digital text-xl tracking-widest animate-pulse border-l border-red-900 pl-3">
                                MISSION COMPLETE
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 border-l border-slate-800 pl-3">
                                {timeLeft?.isFallback && (
                                    <div className="text-[8px] text-slate-600 font-mono tracking-widest mb-1">UNTIL NEXT 00:00</div>
                                )}
                                <div className="flex justify-between items-baseline">
                                    <span className="text-[24px] font-digital text-white leading-none italic">{timeLeft?.d}</span>
                                    <span className="text-[8px] text-slate-500 tracking-widest">DAYS</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <div className="flex gap-2 font-digital text-lg text-cyan-400 italic">
                                        <span>{timeLeft?.h.toString().padStart(2, '0')}</span>
                                        <span className="animate-pulse">:</span>
                                        <span>{timeLeft?.m.toString().padStart(2, '0')}</span>
                                        <span className="animate-pulse">:</span>
                                        <span>{timeLeft?.s.toString().padStart(2, '0')}</span>
                                    </div>
                                    <span className="text-[8px] text-slate-600 font-mono uppercase">T-MINUS</span>
                                </div>
                            </div>
                        )}
                        <div className="text-[7px] text-slate-700 font-mono tracking-widest uppercase">
                            Objective Synchronizer v1.1
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export const MainClock: React.FC<MainClockProps> = ({ date }) => {
  const timeString = useMemo(() => {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  }, [date]);

  return (
    <div className="flex items-center justify-center w-full max-w-[95%] gap-4 lg:gap-16 flex-col animate-[fadeIn_1s_ease-out]">
        
        <div className="flex items-center justify-center w-full gap-4 lg:gap-16">
            <CalendarWidget date={date} />

            <div className="flex flex-col items-center select-none z-10 flex-1">
                <div className="text-slate-800 text-[10px] md:text-xs mb-4 font-bold tracking-[1em] uppercase">
                    PRIMARY TIME ENGINE
                </div>
                
                <div className="font-digital text-7xl md:text-[10rem] leading-none tracking-widest text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] tabular-nums font-bold italic relative px-12">
                    <span className="hidden md:inline-block absolute left-0 top-1/2 -translate-y-1/2 text-slate-900 text-6xl font-thin opacity-20 select-none">[</span>
                    {timeString}
                    <span className="hidden md:inline-block absolute right-0 top-1/2 -translate-y-1/2 text-slate-900 text-6xl font-thin opacity-20 select-none">]</span>
                </div>

                <div className="mt-4 flex flex-row justify-center">
                    <SubClock label="LONDON / UTC" zone="Europe/London" date={date} color="text-cyan-500/80" />
                </div>

                <div className="mt-12 w-full max-w-md h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
            </div>

            <CountdownWidget currentDate={date} />
        </div>
    </div>
  );
};
