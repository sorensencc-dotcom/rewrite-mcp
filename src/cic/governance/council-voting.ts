/**
 * CIC Council Voting Logic
 * Phase 24.1: Council Voting Model
 *
 * Rule: Unanimous block veto, majority permit, else require revision
 * - If ANY council member votes BLOCK → verdict = BLOCK
 * - Else if MAJORITY (>50%) vote PERMIT → verdict = PERMIT
 * - Else → verdict = REVISE
 */

import { CouncilVote, CouncilVerdict, VoteVerdict } from './types';

export class CouncilVoting {
  /**
   * Compute council verdict from votes
   */
  static computeVerdict(
    council_id: string,
    run_id: string,
    votes: CouncilVote[],
  ): CouncilVerdict {
    if (votes.length === 0) {
      throw new Error('Council requires at least one vote');
    }

    // Rule 1: Unanimous block veto
    const blockVotes = votes.filter((v) => v.vote === VoteVerdict.BLOCK);
    if (blockVotes.length > 0) {
      return {
        council_id,
        run_id,
        votes,
        verdict: VoteVerdict.BLOCK,
        conditions: blockVotes.map((v) => `Block: ${v.rationale}`),
        timestamp: new Date().toISOString(),
      };
    }

    // Rule 2: Majority permit
    const permitVotes = votes.filter((v) => v.vote === VoteVerdict.PERMIT);
    const permitRatio = permitVotes.length / votes.length;

    if (permitRatio > 0.5) {
      return {
        council_id,
        run_id,
        votes,
        verdict: VoteVerdict.PERMIT,
        conditions: permitVotes.map((v) => `Permit: ${v.rationale}`),
        timestamp: new Date().toISOString(),
      };
    }

    // Rule 3: Require revision (no consensus)
    return {
      council_id,
      run_id,
      votes,
      verdict: VoteVerdict.REVISE,
      conditions: ['No unanimous block, no majority permit — requires revision'],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validate that a verdict decision is sound (for testing/auditing)
   */
  static validateVerdict(verdict: CouncilVerdict): {
    valid: boolean;
    reason?: string;
  } {
    if (!verdict.votes || verdict.votes.length === 0) {
      return { valid: false, reason: 'No votes recorded' };
    }

    const blockVotes = verdict.votes.filter(
      (v) => v.vote === VoteVerdict.BLOCK,
    );
    const permitVotes = verdict.votes.filter(
      (v) => v.vote === VoteVerdict.PERMIT,
    );

    // Verify unanimous block veto rule
    if (blockVotes.length > 0) {
      if (verdict.verdict !== VoteVerdict.BLOCK) {
        return {
          valid: false,
          reason: 'Block votes present but verdict is not BLOCK',
        };
      }
    }

    // Verify majority permit rule
    const permitRatio = permitVotes.length / verdict.votes.length;
    if (permitRatio > 0.5) {
      if (verdict.verdict !== VoteVerdict.PERMIT) {
        return {
          valid: false,
          reason: 'Majority permit but verdict is not PERMIT',
        };
      }
    }

    // Verify no unanimous block and no majority permit → REVISE
    if (blockVotes.length === 0 && permitRatio <= 0.5) {
      if (verdict.verdict !== VoteVerdict.REVISE) {
        return {
          valid: false,
          reason: 'No consensus achieved but verdict is not REVISE',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Summarize voting distribution for logging/audit
   */
  static summarizeVotes(votes: CouncilVote[]): {
    blocks: number;
    permits: number;
    revises: number;
    total: number;
  } {
    return {
      blocks: votes.filter((v) => v.vote === VoteVerdict.BLOCK).length,
      permits: votes.filter((v) => v.vote === VoteVerdict.PERMIT).length,
      revises: votes.filter((v) => v.vote === VoteVerdict.REVISE).length,
      total: votes.length,
    };
  }
}
