import {
  IdeaClientValidated,
  IdeaClientConfig
} from "./clients/ideaClientValidated.js";
import { PRI, IdeaInboxItem } from "./clients/ideaSchemas.js";

export interface IdeasSummary {
  inboxCount: number;
  priCount: number;
  acceptedCount: number;
  underReviewCount: number;
  escalatedCount: number;
  highSignal: PRI[];
}

export class IdeasService {
  private client: IdeaClientValidated;

  constructor(config: IdeaClientConfig) {
    this.client = new IdeaClientValidated(config);
  }

  async getInbox(): Promise<IdeaInboxItem[]> {
    const { items } = await this.client.listInbox();
    return items;
  }

  async getPRIs(): Promise<PRI[]> {
    const { pris } = await this.client.listPRIs();
    return pris;
  }

  async getSummary(): Promise<IdeasSummary> {
    const [inbox, pris] = await Promise.all([
      this.getInbox(),
      this.getPRIs()
    ]);

    const accepted = pris.filter(p => p.status === "Accepted");
    const underReview = pris.filter(p => p.status === "Under Review");
    const escalated = inbox.filter(i => i.status === "Escalated");

    const highSignal = accepted
      .filter(p => (p.metadata?.score ?? 0) >= 70)
      .slice(0, 10);

    return {
      inboxCount: inbox.length,
      priCount: pris.length,
      acceptedCount: accepted.length,
      underReviewCount: underReview.length,
      escalatedCount: escalated.length,
      highSignal
    };
  }

  async searchPRIs(query: string): Promise<PRI[]> {
    const { pris } = await this.client.listPRIs();
    const q = query.toLowerCase();

    return pris
      .filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q)
      )
      .sort((a, b) => (b.metadata?.score ?? 0) - (a.metadata?.score ?? 0))
      .slice(0, 20);
  }
}
