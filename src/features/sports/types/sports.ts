export type SportKind = 'archery';

export type ArcheryArrowValues = [number, number, number, number, number, number];

export interface SportDefinition {
  id: string;
  name: string;
  kind: SportKind;
  createdBy: string;
  createdAt: Date;
}

export interface ArcheryRound {
  id: string;
  distanceM: number;
  arrows: ArcheryArrowValues;
  createdAt: Date;
}

export interface SportSession {
  id: string;
  sportId: string;
  sportName: string;
  kind: SportKind;
  userId: string;
  startedAt: Date;
  completedAt?: Date;
  rounds: ArcheryRound[];
  notes?: string;
}
