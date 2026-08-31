export type NvetPetSpecies = 'DOG' | 'CAT' | 'BIRD' | 'RABBIT' | 'REPTILE' | 'FISH' | 'OTHER';
export type NvetAllergySeverity = 'MILD' | 'MODERATE' | 'SEVERE';
export type NvetConditionStatus = 'ACTIVE' | 'RESOLVED' | 'UNKNOWN';
export type NvetPreventiveCareType = 'CHECKUP' | 'VACCINATION' | 'DEWORMING' | 'DENTAL' | 'LAB' | 'OTHER';
export type NvetPreventiveCareStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface NvetPetAllergy {
  id: string;
  substance: string;
  reaction?: string;
  severity: NvetAllergySeverity;
  notedAt?: string;
}

export interface NvetPetMedication {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  startedAt?: string;
  endedAt?: string;
  active: boolean;
  notes?: string;
}

export interface NvetPetCondition {
  id: string;
  name: string;
  diagnosedAt?: string;
  status: NvetConditionStatus;
  notes?: string;
}

export interface NvetPetVaccination {
  id: string;
  vaccine: string;
  administeredAt: string;
  nextDueAt?: string;
  batch?: string;
  provider?: string;
}

export interface NvetPetDeworming {
  id: string;
  product: string;
  administeredAt: string;
  nextDueAt?: string;
  notes?: string;
}

export interface NvetPetPreventiveCare {
  id: string;
  type: NvetPreventiveCareType;
  title: string;
  dueAt: string;
  status: NvetPreventiveCareStatus;
  notes?: string;
}

export interface NvetPetHealthProfile {
  schemaVersion: 1;
  source: 'OWNER_REPORTED';
  allergies: NvetPetAllergy[];
  medications: NvetPetMedication[];
  conditions: NvetPetCondition[];
  vaccinations: NvetPetVaccination[];
  deworming: NvetPetDeworming[];
  preventiveCare: NvetPetPreventiveCare[];
}

export type NvetPetHealthProfileInput = Omit<NvetPetHealthProfile, 'schemaVersion' | 'source'>;

export const EMPTY_NVET_PET_HEALTH_PROFILE: NvetPetHealthProfileInput = {
  allergies: [],
  medications: [],
  conditions: [],
  vaccinations: [],
  deworming: [],
  preventiveCare: [],
};

export interface NvetPet {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  weight?: number | null;
  birthDate?: string | null;
  notes?: string | null;
  healthProfile?: NvetPetHealthProfile | null;
  healthProfileVersion?: number | null;
  healthProfileUpdatedAt?: string | null;
}
