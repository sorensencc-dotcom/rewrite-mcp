// budgetManager.ts — Token budget enforcement for remote analyzers
// Tracks and enforces per-file and per-pipeline token budgets

export interface BudgetContext {
  totalTokenBudget: number;
  remainingTokens: number;
  costPerToken: number;
  remainingBudgetUSD?: number;
}

export class BudgetManager {
  private totalBudget: number;
  private consumed: number = 0;
  private costPerToken: number;

  constructor(totalTokenBudget: number = 100000, costPerToken: number = 0.00001) {
    this.totalBudget = totalTokenBudget;
    this.costPerToken = costPerToken;
  }

  getContext(): BudgetContext {
    return {
      totalTokenBudget: this.totalBudget,
      remainingTokens: Math.max(0, this.totalBudget - this.consumed),
      costPerToken: this.costPerToken,
      remainingBudgetUSD: (this.totalBudget - this.consumed) * this.costPerToken,
    };
  }

  canAfford(tokens: number): boolean {
    return this.consumed + tokens <= this.totalBudget;
  }

  consume(tokens: number) {
    this.consumed += tokens;
  }

  reset() {
    this.consumed = 0;
  }
}

export const globalBudget = new BudgetManager();
