import {
  IdeaInboxItem,
  PRI,
  ListInboxResponseSchema,
  HarvestResponseSchema,
  HarvestBatchResponseSchema,
  ListPRIsResponseSchema,
  UpdateStatusResponseSchema,
  ConfigResponseSchema,
  DailyDigestResponseSchema,
  ListInboxResponse,
  HarvestResponse,
  HarvestBatchResponse,
  ListPRIsResponse,
  UpdateStatusResponse,
  ConfigResponse,
  DailyDigestResponse
} from "./ideaSchemas.js";

export interface IdeaClientConfig {
  callTool: <T = unknown>(
    tool: string,
    args: Record<string, unknown>
  ) => Promise<T>;
}

export class IdeaClientValidated {
  private callTool: IdeaClientConfig["callTool"];

  constructor(config: IdeaClientConfig) {
    this.callTool = config.callTool;
  }

  async capture(text: string, source: string | null = null): Promise<IdeaInboxItem> {
    const raw = await this.callTool("idea:capture", { text, source });
    const parsed = ListInboxResponseSchema.shape.items.element.parse(raw);
    return parsed;
  }

  async listInbox(): Promise<ListInboxResponse> {
    const raw = await this.callTool("idea:list-inbox", {});
    return ListInboxResponseSchema.parse(raw);
  }

  async getItem(id: string): Promise<IdeaInboxItem> {
    const raw = await this.callTool("idea:get-item", { id });
    return ListInboxResponseSchema.shape.items.element.parse(raw);
  }

  async harvest(id: string): Promise<HarvestResponse> {
    const raw = await this.callTool("idea:harvest", { id });
    return HarvestResponseSchema.parse(raw);
  }

  async harvestBatch(ids: string[]): Promise<HarvestBatchResponse> {
    const raw = await this.callTool("idea:harvest-batch", { ids });
    return HarvestBatchResponseSchema.parse(raw);
  }

  async listPRIs(): Promise<ListPRIsResponse> {
    const raw = await this.callTool("idea:list-pris", {});
    return ListPRIsResponseSchema.parse(raw);
  }

  async getPRI(id: string): Promise<PRI> {
    const raw = await this.callTool("idea:get-pri", { id });
    return ListPRIsResponseSchema.shape.pris.element.parse(raw);
  }

  async updateStatus(id: string, status: string): Promise<UpdateStatusResponse> {
    const raw = await this.callTool("idea:update-status", { id, status });
    return UpdateStatusResponseSchema.parse(raw);
  }

  async config<T = unknown>(key: string, value: T): Promise<ConfigResponse> {
    const raw = await this.callTool("idea:config", { key, value });
    return ConfigResponseSchema.parse(raw);
  }

  async dailyDigest(): Promise<DailyDigestResponse> {
    const raw = await this.callTool("idea:daily-digest", {});
    return DailyDigestResponseSchema.parse(raw);
  }
}
