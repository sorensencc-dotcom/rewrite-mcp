import { OperatorFeedback } from '../../contracts/OperatorFeedback';

export function makeFeedbackCorrectingFalseRejects(): OperatorFeedback[] {
  return [
    {
      id: 'fb-1',
      timestamp: '2026-01-01T10:00:00Z',
      originalVerdict: 'REJECT',
      operatorVerdict: 'ACCEPT',
      reason: 'System was too conservative',
    },
    {
      id: 'fb-2',
      timestamp: '2026-01-01T11:00:00Z',
      originalVerdict: 'REJECT',
      operatorVerdict: 'QUARANTINE',
      reason: 'Should be quarantined, not rejected',
    },
  ];
}

export function makeFeedbackCorrectingFalseAccepts(): OperatorFeedback[] {
  return [
    {
      id: 'fb-1',
      timestamp: '2026-01-01T10:00:00Z',
      originalVerdict: 'ACCEPT',
      operatorVerdict: 'REJECT',
      reason: 'System was too permissive',
    },
    {
      id: 'fb-2',
      timestamp: '2026-01-01T11:00:00Z',
      originalVerdict: 'ACCEPT',
      operatorVerdict: 'QUARANTINE',
      reason: 'Should have been quarantined',
    },
  ];
}

export function makeMixedFeedback(): OperatorFeedback[] {
  return [
    {
      id: 'fb-1',
      timestamp: '2026-01-01T10:00:00Z',
      originalVerdict: 'REJECT',
      operatorVerdict: 'ACCEPT',
      reason: 'False reject corrected',
    },
    {
      id: 'fb-2',
      timestamp: '2026-01-01T11:00:00Z',
      originalVerdict: 'ACCEPT',
      operatorVerdict: 'REJECT',
      reason: 'False accept corrected',
    },
    {
      id: 'fb-3',
      timestamp: '2026-01-01T12:00:00Z',
      originalVerdict: 'QUARANTINE',
      operatorVerdict: 'QUARANTINE',
      reason: 'Correct verdict, no adjustment',
    },
  ];
}

export function makeEmptyFeedback(): OperatorFeedback[] {
  return [];
}
