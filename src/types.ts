export interface ActivityItem {
  id: string;
  name: string;
  zone?: string;
  done: boolean;
  doneBy?: string | null;
  doneAt?: number | null;
}

export interface UnitStatus {
  activities: ActivityItem[];
  note: string;
  updated: number | null;
  lastEditedBy: string | null;
  m2?: number | null;
  finish?: string | null;
  typology?: string | null;
  rooms?: number | null;
  baths?: number | null;
  customReforms?: boolean;
  numberOverride?: string | null;
  deleted?: boolean;
}

export interface Floor {
  id: string;
  label: string;
  start: number;
  count: number;
}

export interface Tower {
  id: string;
  name: string;
  stage: string;
  floors: Floor[];
}

export interface CommonArea {
  id: string;
  name: string;
}

export interface MasterActivityItem {
  name: string;
  zone?: string;
}

export interface AppConfig {
  projectName: string;
  towers: Tower[];
  areas: CommonArea[];
  masterActivities: (string | MasterActivityItem)[];
}

export type Scope =
  | { type: 'all' }
  | { type: 'status'; status: 'done' | 'pending' }
  | { type: 'tower'; towerId: string }
  | { type: 'floor'; towerId: string; floorId: string }
  | { type: 'areas' };

export interface AptKeyInfo {
  towerId: string;
  floorId: string;
  idx: number;
  floor: Floor | null;
  number: number | string;
}

export interface UnitCardItem {
  key: string;
  kind: 'apt' | 'area';
  area?: CommonArea;
}
