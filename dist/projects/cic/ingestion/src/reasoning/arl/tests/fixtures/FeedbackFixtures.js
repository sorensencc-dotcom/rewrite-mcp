"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeFeedbackCorrectingFalseRejects = makeFeedbackCorrectingFalseRejects;
exports.makeFeedbackCorrectingFalseAccepts = makeFeedbackCorrectingFalseAccepts;
exports.makeMixedFeedback = makeMixedFeedback;
exports.makeEmptyFeedback = makeEmptyFeedback;
function makeFeedbackCorrectingFalseRejects() {
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
function makeFeedbackCorrectingFalseAccepts() {
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
function makeMixedFeedback() {
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
function makeEmptyFeedback() {
    return [];
}
//# sourceMappingURL=FeedbackFixtures.js.map