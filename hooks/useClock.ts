
import { useState, useEffect, useRef } from 'react';

/**
 * useClock: システムの時刻管理を行うカスタムフック
 * 
 * 単純な1秒ごとのsetIntervalでは、ブラウザの負荷により数ミリ秒ずつズレが生じます。
 * このフックでは「次の秒が始まる瞬間」を計算して待機することで、
 * デジタル時計としての正確な表示タイミングを実現しています。
 */
export const useClock = () => {
  const [date, setDate] = useState<Date>(new Date());
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startClock = () => {
    // 既存のタイマーをクリアして二重起動を防止
    if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    if (intervalIdRef.current) clearInterval(intervalIdRef.current);

    const now = new Date();
    // 次の「000ミリ秒」までの残り時間を計算（例: 現在が400msなら残り600ms）
    const delay = 1000 - now.getMilliseconds();

    // 次の秒の開始に合わせて一度だけ実行
    timeoutIdRef.current = setTimeout(() => {
      setDate(new Date());
      // 以降は1000ミリ秒ごとに更新
      intervalIdRef.current = setInterval(() => {
        setDate(new Date());
      }, 1000);
    }, delay);
  };

  useEffect(() => {
    // コンポーネントのマウント時に時計を開始
    startClock();

    // 15分ごとに時刻を再同期して、長期的なズレを補正
    syncIntervalRef.current = setInterval(() => {
      console.log("SYSTEM CLOCK AUTO RESYNC");
      startClock();
    }, 15 * 60 * 1000);

    // 手動同期イベント（外部コンポーネントからの通知）
    const handleManualSync = () => {
      console.log("SYSTEM CLOCK MANUAL RESYNC");
      setDate(new Date());
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
