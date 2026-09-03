import { AppConfig, UnitStatus } from '../types';
import { TOWER_IDS, stageForTower, DEFAULT_AREAS } from '../constants/catalog';
import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';

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
  if (!config) return defaultConfig();
  if (!Array.isArray(config.towers)) config.towers = [];
  if (!Array.isArray(config.areas)) config.areas = DEFAULT_AREAS.slice();
  if (!Array.isArray(config.masterActivities)) config.masterActivities = [];

  config.towers.forEach(t => {
    if (!Array.isArray(t.floors)) t.floors = [];
    if (!t.stage) t.stage = stageForTower(t.id);
  });
  return config;
}

// Local cache keys for offline fallback and personal user info
const STORAGE_CONFIG_KEY = 'vidapark-config';
const STORAGE_STATUSES_KEY = 'vidapark-statuses';
const STORAGE_USER_KEY = 'vidapark-user-email';

// Firestore collection and document references
const APP_DATA_COLLECTION = 'app-data';
const CONFIG_DOC = 'config';
const STATUSES_DOC = 'statuses';

/**
 * Load project configuration and apartment statuses from Cloud Firestore.
 * Falls back to local cache or defaults if Firestore is not yet populated.
 */
export async function loadStoredData(): Promise<{ config: AppConfig; statuses: Record<string, UnitStatus> }> {
  try {
    const configDocRef = doc(db, APP_DATA_COLLECTION, CONFIG_DOC);
    const statusesDocRef = doc(db, APP_DATA_COLLECTION, STATUSES_DOC);

    const [configSnap, statusesSnap] = await Promise.all([
      getDoc(configDocRef),
      getDoc(statusesDocRef),
    ]);

    let config: AppConfig;
    if (configSnap.exists()) {
      const raw = configSnap.data();
      config = migrateConfig({
        projectName: raw.projectName || 'Vida Park',
        towers: raw.towers || [],
        areas: raw.areas || DEFAULT_AREAS.slice(),
        masterActivities: raw.masterActivities || [],
      });
      // Update local cache
      try {
        localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
      } catch (_) {}
    } else {
      // Check local storage or generate default, then seed Firestore
      const localCfg = localStorage.getItem(STORAGE_CONFIG_KEY);
      config = localCfg ? migrateConfig(JSON.parse(localCfg)) : defaultConfig();
      await saveStoredConfig(config);
    }

    let statuses: Record<string, UnitStatus> = {};
    if (statusesSnap.exists()) {
      const raw = statusesSnap.data();
      if (raw.items && typeof raw.items === 'object') {
        statuses = raw.items;
      } else if (raw.data && typeof raw.data === 'object') {
        statuses = raw.data;
      } else if (typeof raw.data === 'string') {
        try {
          statuses = JSON.parse(raw.data);
        } catch (_) {}
      } else {
        const { updatedAt, ...rest } = raw;
        statuses = rest as Record<string, UnitStatus>;
      }
      // Update local cache
      try {
        localStorage.setItem(STORAGE_STATUSES_KEY, JSON.stringify(statuses));
      } catch (_) {}
    } else {
      // Check local storage or seed empty
      const localSt = localStorage.getItem(STORAGE_STATUSES_KEY);
      statuses = localSt ? JSON.parse(localSt) : {};
      await saveStoredStatuses(statuses);
    }

    return { config, statuses };
  } catch (e) {
    console.error('Error loading stored data from Firestore, checking local cache:', e);
    try {
      const cfgRaw = localStorage.getItem(STORAGE_CONFIG_KEY);
      const config = cfgRaw ? migrateConfig(JSON.parse(cfgRaw)) : defaultConfig();
      const stRaw = localStorage.getItem(STORAGE_STATUSES_KEY);
      const statuses = stRaw ? JSON.parse(stRaw) : {};
      return { config, statuses };
    } catch (localErr) {
      return { config: defaultConfig(), statuses: {} };
    }
  }
}

/**
 * Save application configuration to Cloud Firestore (app-data/config)
 */
export async function saveStoredConfig(config: AppConfig): Promise<void> {
  // Update local cache immediately
  try {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(config));
  } catch (_) {}

  try {
    const configDocRef = doc(db, APP_DATA_COLLECTION, CONFIG_DOC);
    await setDoc(configDocRef, {
      projectName: config.projectName || 'Vida Park',
      towers: config.towers || [],
      areas: config.areas || [],
      masterActivities: config.masterActivities || [],
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.error('Error saving config to Firestore:', e);
  }
}

/**
 * Save apartment statuses to Cloud Firestore (app-data/statuses)
 */
export async function saveStoredStatuses(statuses: Record<string, UnitStatus>): Promise<void> {
  // Update local cache immediately
  try {
    localStorage.setItem(STORAGE_STATUSES_KEY, JSON.stringify(statuses));
  } catch (_) {}

  try {
    const statusesDocRef = doc(db, APP_DATA_COLLECTION, STATUSES_DOC);
    await setDoc(statusesDocRef, {
      items: statuses,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.error('Error saving statuses to Firestore:', e);
  }
}

/**
 * Subscribe to real-time updates from Cloud Firestore for live multi-user collaboration.
 */
export function subscribeToAppData(
  onData: (data: { config?: AppConfig; statuses?: Record<string, UnitStatus> }) => void
): () => void {
  const unsubConfig = onSnapshot(
    doc(db, APP_DATA_COLLECTION, CONFIG_DOC),
    snapshot => {
      if (snapshot.exists()) {
        const raw = snapshot.data();
        const config = migrateConfig({
          projectName: raw.projectName || 'Vida Park',
          towers: raw.towers || [],
          areas: raw.areas || DEFAULT_AREAS.slice(),
          masterActivities: raw.masterActivities || [],
        });
        onData({ config });
      }
    },
    err => {
      console.warn('Config snapshot subscription error:', err);
    }
  );

  const unsubStatuses = onSnapshot(
    doc(db, APP_DATA_COLLECTION, STATUSES_DOC),
    snapshot => {
      if (snapshot.exists()) {
        const raw = snapshot.data();
        let statuses: Record<string, UnitStatus> = {};
        if (raw.items && typeof raw.items === 'object') {
          statuses = raw.items;
        } else if (raw.data && typeof raw.data === 'object') {
          statuses = raw.data;
        } else if (typeof raw.data === 'string') {
          try {
            statuses = JSON.parse(raw.data);
          } catch (_) {}
        } else {
          const { updatedAt, ...rest } = raw;
          statuses = rest as Record<string, UnitStatus>;
        }
        onData({ statuses });
      }
    },
    err => {
      console.warn('Statuses snapshot subscription error:', err);
    }
  );

  return () => {
    unsubConfig();
    unsubStatuses();
  };
}

/**
 * User personal email continues to be stored locally on the device (STORAGE_USER_KEY).
 */
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
    console.error('Error saving user email to localStorage', e);
  }
}

export function computeIsEditor(email: string | null): boolean {
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return clean.includes('@coninsa.co') && clean.endsWith('@coninsa.co');
}
