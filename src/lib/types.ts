export type Role = 'admin' | 'unit_manager' | 'field_rabbi' | 'hq_viewer';

export interface UserScope {
  command: string | null;
  division: string | null;
  brigade: string | null;
  battalion: string | null;
}

export interface User {
  id: string;
  name: string;
  personalId: string;
  role: Role;
  scope: UserScope;
  active: boolean;
  email?: string | null;
}

export interface FacilityFields {
  mainKitchen?: string;
  stoveType?: string;
  salon?: boolean;
  macshRoom?: boolean;
  lightTable?: boolean;
  lightBox?: boolean;
  flourMachine?: boolean;
  riceMachine?: boolean;
  riceMachineSize?: string;
  warmCabinetWithDevice?: number;
  warmCabinetNoDevice?: number;
  heatingPlates?: number;
  plateSeparatorMilk?: number;
  plateCoverShabbat?: boolean;
  galeyShabbat?: boolean;
  pesachStore?: boolean;
  kitchenettes?: number;
  kitchenNotes?: string;
  eruv?: string;
  sgEntryShape?: string;
  rakemEruv?: boolean;
  eruvPolesNeeded?: number;
  eruvNotes?: string;
  waterPressurePump?: boolean;
  shabbatAdaptation?: boolean;
  sgShabbatDeviceNeeded?: boolean;
  sgShabbatDevicesNeeded?: number;
  sgShabbatDevicesInstalled?: number;
  iceMachines?: number;
  iceMachineDevice?: boolean;
  shabbatNotes?: string;
  mezuzotResidentialNeeded?: number;
  mezuzotResidentialInstalled?: number;
  mezuzotOtherNeeded?: number;
  mezuzotOtherInstalled?: number;
  mezuzotNotes?: string;
  synagogueExists?: boolean;
  synagogueStatus?: string;
  seatsMen?: number;
  seatsWomen?: number;
  separateEntranceWomen?: boolean;
  hasNetilatHandwash?: boolean;
  gnizaBox?: boolean;
  synagogueNotes?: string;
  arkKodesh?: boolean;
  parochet?: boolean;
  bimaReading?: boolean;
  bimaCover?: boolean;
  chazzanStand?: boolean;
  chazzanStandCover?: boolean;
  bookCabinets?: number;
  bookShelves?: number;
  torahScrolls?: number;
  synagogueContentsNotes?: string;
}

export interface Facility {
  id: string;
  name: string;
  command: string;
  division: string | null;
  brigade: string | null;
  battalion: string | null;
  campType: string | null;
  status: string | null;
  project: string | null;
  maxCapacity: number;
  mealCapacity: number;
  notes: string | null;
  fields: FacilityFields;
  active: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
}

export interface StandardTier {
  id: string;
  label: string;
  min: number;
  max: number;
}

export type GapStatus = 'ok' | 'missing' | 'surplus' | 'not-relevant';

export interface ComplianceRow {
  itemId: string;
  name: string;
  category: string;
  required: number;
  actual: number;
  gap: number;
  status: GapStatus;
}

export interface Compliance {
  tier: StandardTier;
  rows: ComplianceRow[];
  compliancePct: number;
  totalGap: number;
  totalSurplus: number;
  missingItems: number;
}

export interface FacilityWithCompliance extends Facility {
  compliance: Compliance;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  entityId: string | null;
  summary: string;
}
