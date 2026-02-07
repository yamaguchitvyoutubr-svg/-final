
import { TimeZoneConfig } from './types';

export const WORLD_ZONES: TimeZoneConfig[] = [
  {
    id: 'jp',
    label: 'TYO',
    subLabel: 'TOKYO',
    zone: 'Asia/Tokyo',
    lat: 35.6895,
    lon: 139.6917,
  },
  {
    id: 'de',
    label: 'BER',
    subLabel: 'BERLIN',
    zone: 'Europe/Berlin',
    lat: 52.5200,
    lon: 13.4050,
  },
  {
    id: 'us-dc',
    label: 'WAS',
    subLabel: 'WASHINGTON D.C.',
    zone: 'America/New_York',
    lat: 38.8951,
    lon: -77.0364,
  },
  {
    id: 'sg',
    label: 'SGP',
    subLabel: 'SINGAPORE',
    zone: 'Asia/Singapore',
    lat: 1.3521,
    lon: 103.8198,
  }
];
