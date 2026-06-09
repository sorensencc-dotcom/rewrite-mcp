import { APR } from "../apr/APR";
import { CRO } from "../cro/CRO";
import { MemoryStore } from "../memory/MemoryStore";
import { CKG } from "../ckg/CKG";
import { SecurityPolicy, SecurityConfig } from "../security/SecurityPolicy";
import { WaylandSessionMapper } from "./session/WaylandSessionMapper";
import {
  ShellAdapter,
  FileAdapter,
  ModelAdapter,
  HttpAdapter,
  BrowserAdapter
} from "./adapters";

export class CICForeman {
  private apr = new APR();
  private cro = new CRO();
  private memory = new MemoryStore();
  private ckg = new CKG();
  private mapper: WaylandSessionMapper;
  private policy: SecurityPolicy;

  constructor(
    private shell: ShellAdapter,
    private file: FileAdapter,
    private model: ModelAdapter,
    private http: HttpAdapter,
    private browser: BrowserAdapter,
    securityConfig?: SecurityConfig
  ) {
    this.policy = new SecurityPolicy(securityConfig);
    this.mapper = new WaylandSessionMapper(this.memory);
  }

  async handleRequest(sessionId: string, instruction: string) {
    try {
      this.memory.writeAgentTelemetry('cic_foreman', 'running', { sessionId });

      const aprPlan = await this.apr.generatePlan(instruction);
      this.mapper.mapPlan(sessionId, aprPlan.planId);

      this.memory.writeAPRPlan(aprPlan, sessionId);
      this.ckg.ingestAPRPlan(aprPlan);

      const croRun = await this.cro.executePlan(aprPlan, {
        shell: this.shell,
        file: this.file,
        model: this.model,
        http: this.http,
        browser: this.browser
      });

      this.mapper.mapRun(sessionId, croRun.runId);

      this.memory.writeCRORun(croRun, sessionId);
      this.ckg.ingestCRORun(croRun);

      this.memory.writeAgentTelemetry('cic_foreman', 'idle', {
        sessionId,
        planId: aprPlan.planId,
        runId: croRun.runId,
      });

      return {
        plan: aprPlan,
        run: croRun
      };
    } catch (error: any) {
      this.memory.writeAgentTelemetry('cic_foreman', 'failed', {
        sessionId,
        error: error.message,
      });
      throw error;
    }
  }

  getSecurityPolicy(): SecurityPolicy {
    return this.policy;
  }

  getMemoryEvents() {
    return this.memory.getEvents();
  }

  getSessionMapper() {
    return this.mapper;
  }
}
