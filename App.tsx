import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MainClock } from './components/MainClock';
import { WorldGrid } from './components/WorldGrid';
import { Timer } from './components/Timer';
import { WeatherWidget } from './components/WeatherWidget';
import { EarthquakeWidget } from './components/EarthquakeWidget';
import { LocalMusicPlayer } from './components/LocalMusicPlayer';
import { AlarmModule } from './components/AlarmModule';
import { useClock } from './hooks/useClock';

/**
 * 背景アセットの型定義
 */
interface BackgroundAsset {
  id: string;
  url: string;
  type: 'image' | 'video';
  label?: string;
}

interface Alarm {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
}

interface EEWAlert {
  hypocenter: string;
  time: string;
  isWarning: boolean;
}

// ブラウザの自動再生制限を回避するための共有オーディオコンテキスト
let globalAudioCtx: AudioContext | null = null;
const getAudioContext = () => {
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) globalAudioCtx = new AudioContextClass();
  }
  return globalAudioCtx;
};

// アラーム音（ビープ音）を再生する関数
const playSystemAlarmSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    const now = ctx.currentTime;
    // 短いビープ音を3回鳴らすパターン
    const createBeep = (startTime: number, freq: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq / 2, startTime + 0.1);
      
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.linearRampToValueAtTime(0, startTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.1);
    };

    // ピピピ！と鳴らす
    createBeep(now, 1200);
    createBeep(now + 0.15, 1200);
    createBeep(now + 0.3, 1200);

  } catch (e) {
    console.error("Alarm sound error:", e);
  }
};

const App: React.FC = () => {
  // 高精度な時刻同期フック
  const { date } = useClock();

  // --- 状態管理 ---
  const [bgAssets, setBgAssets] = useState<BackgroundAsset[]>([]);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [isMusicOpen, setIsMusicOpen] = useState(false);
  const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false); // 設定パネルの開閉
  
  const [isBgMuted, setIsBgMuted] = useState(true);
  const [bgVolume, setBgVolume] = useState(0.5); // 背景動画の音量 (0-1)
  const [isSystemStarted, setIsSystemStarted] = useState(false);
  
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [firingAlarm, setFiringAlarm] = useState<Alarm | null>(null); // 現在鳴っているアラーム
  const lastTriggeredTime = useRef<string>(""); // 重複発火防止用

  const [bgDimming, setBgDimming] = useState(0.85); // 背景の暗さ (0-1)
  const [bgBlur, setBgBlur] = useState(4);          // 背景のぼかし (px)
  const [isTransitioning, setIsTransitioning] = useState(false); // 切り替えアニメーション用フラグ
  const [activeEEW, setActiveEEW] = useState<EEWAlert | null>(null);

  // 各モジュールの表示・非表示フラグ
  const [visibility, setVisibility] = useState({
    weather: true,
    earthquake: true,
    timer: true,
    grid: true,
    alarms: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // アラーム音のループ再生用タイマー
  const alarmLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- 初期化と保存ロジック ---
  useEffect(() => {
    // ローカルストレージからユーザー設定を復元
    const savedVisibility = localStorage.getItem('module_visibility_v5');
    if (savedVisibility) try { setVisibility(JSON.parse(savedVisibility)); } catch (e) {}
    const savedAlarms = localStorage.getItem('system_alarms_v3');
    if (savedAlarms) try { setAlarms(JSON.parse(savedAlarms)); } catch (e) {}
    const savedDim = localStorage.getItem('bg_dimming');
    const savedBlur = localStorage.getItem('bg_blur');
    const savedVol = localStorage.getItem('bg_volume');
    if (savedDim) setBgDimming(parseFloat(savedDim));
    if (savedBlur) setBgBlur(parseFloat(savedBlur));
    if (savedVol) setBgVolume(parseFloat(savedVol));
  }, []);

  // 設定変更時に自動保存
  useEffect(() => { localStorage.setItem('module_visibility_v5', JSON.stringify(visibility)); }, [visibility]);
  useEffect(() => { localStorage.setItem('system_alarms_v3', JSON.stringify(alarms)); }, [alarms]);
  useEffect(() => { localStorage.setItem('bg_dimming', bgDimming.toString()); }, [bgDimming]);
  useEffect(() => { localStorage.setItem('bg_blur', bgBlur.toString()); }, [bgBlur]);
  useEffect(() => { localStorage.setItem('bg_volume', bgVolume.toString()); }, [bgVolume]);

  /**
   * 背景動画の音量を適用
   * 音量が変更されたり、背景が切り替わったりした時にvideoタグへ反映
   */
  useEffect(() => {
    if (videoRef.current) {
