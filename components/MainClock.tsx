
import React, { useMemo } from 'react';

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
    <div className="flex flex-col items-center px-8">
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
                <div className="text-5xl font-digital text-white leading-none tracking-tighter italic">{day}</div>
                <div className="text-[10px] font-digital text-cyan-500/80 tracking-[0.2em] font-bold mt-1">{weekday}</div>
            </div>
        </div>
    );
};

const CountdownWidget: React.FC<{ currentDate: Date }> = ({ currentDate }) => {
    const targetDate = localStorage.getItem('system_countdown_target') || "";
    const timeLeft = useMemo(() => {
        let target: number;
        if (targetDate) target = new Date(targetDate).getTime();
        else {
            const nextMidnight = new Date(currentDate);
            nextMidnight.setHours(24, 0, 0, 0);
            target = nextMidnight.getTime();
        }
        const diff = target - currentDate.getTime();
        if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, expired: true };
        return {
            d: Math.floor(diff / (1000 * 60 * 60 * 24)),
            h: Math.floor((diff / (1000 * 60 * 60)) % 24),
            m: Math.floor((diff / (1000 * 60)) % 60),
            s: Math.floor((diff / 1000) % 60),
            expired: false
        };
    }, [targetDate, currentDate]);

    return (
        <div className="hidden lg:flex flex-col items-start justify-center w-48 gap-4 select-none">
            <div className="w-full">
                <div className="text-[10px] text-cyan-600 tracking-widest font-mono mb-2 border-b border-slate-800 pb-1">COUNTDOWN</div>
                <div className="space-y-3">
                    <div className="flex flex-col gap-2 border-l border-slate-800 pl-3">
                        <div className="flex justify-between items-baseline">
                            <span className="text-[24px] font-digital text-white leading-none italic">{timeLeft.d}</span>
                            <span className="text-[8px] text-slate-500 tracking-widest">DAYS</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                            <div className="flex gap-2 font-digital text-lg text-cyan-400 italic">
                                <span>{timeLeft.h.toString().padStart(2, '0')}</span>
                                <span className="animate-pulse">:</span>
                                <span>{timeLeft.m.toString().padStart(2, '0')}</span>
                                <span className="animate-pulse">:</span>
                                <span>{timeLeft.s.toString().padStart(2, '0')}</span>
                            </div>
                            <span className="text-[8px] text-slate-600 font-mono uppercase">T-MINUS</span>
                        </div>
                    </div>
                </div>
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
                <div className="text-slate-800 text-[8px] md:text-xs mb-2 md:mb-4 font-bold tracking-[0.5em] md:tracking-[1em] uppercase">PRIMARY TIME ENGINE</div>
                <div className="font-digital text-5xl md:text-[10rem] leading-none tracking-widest text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] tabular-nums font-bold italic relative px-6 md:px-12">
                    <span className="hidden md:inline-block absolute left-0 top-1/2 -translate-y-1/2 text-slate-900 text-6xl font-thin opacity-20">[</span>
                    {timeString}
                    <span className="hidden md:inline-block absolute right-0 top-1/2 -translate-y-1/2 text-slate-900 text-6xl font-thin opacity-20">]</span>
                </div>
                <div className="mt-4 flex flex-row justify-center">
                    <SubClock label="LONDON / UTC" zone="Europe/London" date={date} color="text-cyan-500/80" />
                </div>
                <div className="mt-8 md:mt-12 w-full max-w-md h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div>
            </div>
            <CountdownWidget currentDate={date} />
        </div>
    </div>
  );
};
