export interface AdversarialSignal {
  type: 'PATTERN' | 'POISONING' | 'CAUSAL_INVERSION' | 'NARRATIVE_HIJACK';
  severity: number; // 0–1
  details: string;
}
