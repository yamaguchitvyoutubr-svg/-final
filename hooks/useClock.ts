
import { useState, useEffect, useRef } from 'react';

export const useClock = () => {
  const [date, setDate] = useState<Date>(new Date());
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startClock = () => {
    // 既存のタイマーをクリア
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    if (intervalIdRef.current) clearInterval(intervalIdRef.current);

    const now = new Date();
    const delay = 1000 - now.getMilliseconds();

    // 次の秒の開始に合わせてタイマーをセット
    timeoutIdRef.current = setTimeout(() => {
      setDate(new Date());
      intervalIdRef.current = setInterval(() => {
        setDate(new Date());
      }, 1000);
    }, delay);
  };

  useEffect(() => {
    // 初回起動
    startClock();

    // 15分（900,000ms）ごとに時刻を再同期する
    syncIntervalRef.current = setInterval(() => {
      console.log("SYSTEM CLOCK AUTO RESYNC");
      startClock();
    }, 15 * 60 * 1000);

    // 手動同期イベントのリスナー
    const handleManualSync = () => {
      console.log("SYSTEM CLOCK MANUAL RESYNC");
      startClock();
    };
    window.addEventListener('system-sync', handleManualSync);

    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      window.removeEventListener('system-sync', handleManualSync);
    };
  }, []);

  return { date };
};
