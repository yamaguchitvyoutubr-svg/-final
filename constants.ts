
import { TimeZoneConfig } from './types';

export const WORLD_ZONES: TimeZoneConfig[] = [
  {
    id: 'jp',
    label: 'TYO',
    subLabel: 'TOKYO / JAPAN',
    zone: 'Asia/Tokyo',
    lat: 35.6895,
    lon: 139.6917,
  },
  {
    id: 'ru',
    label: 'MOW',
    subLabel: 'MOSCOW / RUSSIA',
    zone: 'Europe/Moscow',
    lat: 55.7558,
    lon: 37.6173,
  },
  {
    id: 'sg',
    label: 'SGP',
    subLabel: 'SINGAPORE / SGT',
    zone: 'Asia/Singapore',
    lat: 1.3521,
    lon: 103.8198,
  },
  {
    id: 'us-ny',
    label: 'NYC',
    subLabel: 'NEW YORK / USA',
    zone: 'America/New_York',
    lat: 40.7128,
    lon: -74.0060,
  }
];
