import { AppConfig, UnitStatus } from '../types';
import { TOWER_IDS, stageForTower, DEFAULT_AREAS } from '../constants/catalog';

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function defaultFloors() {
  const floors = [];
  for (let i = 1; i <= 8; i++) {
    floors.push({ id: 'f' + i, label: 'Piso ' + i, start: i * 100 + 1, count: 0 });
  }
  return floors;
}

export function defaultConfig(): AppConfig {
  return {
    projectName: 'Vida Park',
    towers: TOWER_IDS.map(t => ({
      id: t,
      name: 'Torre ' + t,
      stage: stageForTower(t),
      floors: defaultFloors(),
    })),
    areas: DEFAULT_AREAS.slice(),
    masterActivities: [],
  };
}

export function migrateConfig(config: AppConfig): AppConfig {
  config.towers.forEach(t => {
    if (!Array.isArray(t.floors)) t.floors = [];
    if (!t.stage) t.stage = stageForTower(t.id);
  });
  return config;
}

const STORAGE_CONFIG_KEY = 'vidapark-config';
const STORAGE_STATUSES_KEY = 'vidapark-statuses';
const STORAGE_USER_KEY = 'vidapark-user-email';

export function loadStoredData(): { config: AppConfig; statuses: Record<string, UnitStatus> } {
  try {
    const cfgRaw = localStorage.getItem(STORAGE_CONFIG_KEY);
    const config = cfgRaw ? migrateConfig(JSON.parse(cfgRaw)) : defaultConfig();
    const stRaw = localStorage.getItem(STORAGE_STATUSES_KEY);
    const statuses = stRaw ? JSON.parse(stRaw) : {};
    return { config, statuses };
  } catch (e) {
    console.error('Error loading stored data', e);
    return { config: defaultConfig(), statuses: {} };
  }
}

export function saveStoredConfig(config: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving config', e);
  }
}

export function saveStoredStatuses(statuses: Record<string, UnitStatus>): void {
  try {
    localStorage.setItem(STORAGE_STATUSES_KEY, JSON.stringify(statuses));
  } catch (e) {
    console.error('Error saving statuses', e);
  }
}

export function loadStoredUserEmail(): string | null {
  try {
    return localStorage.getItem(STORAGE_USER_KEY);
  } catch (e) {
    return null;
  }
}

export function saveStoredUserEmail(email: string): void {
  try {
    localStorage.setItem(STORAGE_USER_KEY, email);
  } catch (e) {
    console.error('Error saving user email', e);
  }
}

export function computeIsEditor(email: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return clean.includes('@coninsa.co') && clean.endsWith('@coninsa.co');
}
