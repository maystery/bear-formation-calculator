/** Shared contracts consumed by JSDoc; no runtime module or build output. */
export type TroopKey = 'inf' | 'cav' | 'arc';
export type Troops = Record<TroopKey, number>;
export type FillStrategy = 'equal' | 'sequential';
export type Skill = 'valora' | 'bison';
export type Theme = 'auto' | 'light' | 'dark';
export type ParsedNumber = { valid: boolean; value: number };
export interface FormationSettings {
  troops: Troops;
  ratios: Troops;
  marchCount: number;
  leaders: string[];
  squadCapacity: number;
  baseCapacity: number;
  valoraLevel: string | number;
  bisonLevel: string | number;
  bisonEnabled: boolean;
  strategy?: FillStrategy;
}
export interface CapacitySummary {
  baseCapacity: number;
  valoraBonus: number;
  bisonRecordedBonus: number;
  isBisonBuffEnabled: boolean;
  appliedBisonBonus: number;
  total: number;
}
export interface FormationCapacity {
  capacityBuffs: CapacitySummary;
  heroCapacity: number;
  squadCapacityLimit: number;
  ratioSum: number;
}
export interface TroopLimit {
  key: TroopKey;
  ceiling: number;
}
export interface ValidFormation extends FormationCapacity {
  valid: true;
  marchCount: number;
  ratio: Troops;
  troops: Troops;
  leaders: string[];
  strategy: FillStrategy;
  marchCaps: number[];
  totalCapacity: number;
  capacityUsage: { hero: boolean; squad: boolean };
  bottlenecks: { troops: TroopLimit[]; capacity: boolean };
  marchTotals: number[];
  rows: Troops[];
  totals: Troops;
  totalTroops: number;
}
export type FormationResult = ValidFormation | (FormationCapacity & { valid: false });
export interface MarchCheck {
  total: number;
  ideal: Troops;
  actual: Troops;
  differences: Troops;
  outside: Record<TroopKey, boolean>;
  worstKey: TroopKey;
  worstDifference: number;
  adjustment: number;
  matches: boolean;
}
export interface FieldDefinition {
  id: string;
  key: string;
  shareKey: string;
  shared: boolean;
  kind:
    | 'amount'
    | 'ratio'
    | 'range'
    | 'skill'
    | 'checkbox'
    | 'select'
    | 'tolerance'
    | 'radio'
    | 'toggle'
    | 'fold'
    | 'theme';
  scope: 'formation' | 'check' | 'preference';
  skill?: Skill;
  values?: readonly string[];
}
/** Serialized drafts retain numeric text so invalid saved edits remain editable. */
export type SavedSettings = Partial<Record<string, string | boolean>>;
export interface HeroController {
  leaderOrder(): string[];
  sync(order: string[], marchCount: number): void;
}
export interface CapacityController {
  readonly enabled: boolean;
  setEnabled(value: boolean): void;
  sync(baseCapacity: number | null): CapacitySummary;
}
export interface Feedback {
  animateFeedback(
    element: HTMLElement,
    frames: Keyframe[],
    options: KeyframeAnimationOptions,
  ): void;
  setFieldValidity(id: string, valid: boolean, message: string): void;
  setVal(id: string, text: string): void;
  copyText(text: string): Promise<void>;
  copyFeedback(button: HTMLButtonElement, message: string, ok: boolean): void;
}
export interface SettingsController {
  load(): boolean;
  save(): void;
  scheduleSave(): void;
  setupUrl(): string;
  clear(): void;
}
export interface FormationView {
  calculate(): boolean;
  check(): void;
  formationText(): string;
  readonly result: ValidFormation | null;
}
