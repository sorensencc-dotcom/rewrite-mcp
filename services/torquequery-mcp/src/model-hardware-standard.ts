import * as os from 'os';
import { execSync } from 'child_process';
import { RoutingTier } from './cost-routing-gateway.js';

export type MhsTier = 'MHS-1_ULTRA_LITE' | 'MHS-2_STANDARD' | 'MHS-3_POWER' | 'MHS-4_CLUSTER';

export interface HardwareProfile {
  totalRamGb: number;
  freeRamGb: number;
  cpuCores: number;
  cpuModel: string;
  architecture: string;
  platform: string;
  hasGpuAcceleration: boolean;
  gpuName?: string;
  vramGb?: number;
  mhsClass: MhsTier;
}

export interface ModelSpec {
  name: string;
  parameterSizeB: number; // e.g. 7, 8, 14, 32, 70, 123
  quantization: 'Q4_K_M' | 'Q8_0' | 'FP16' | 'BF16';
  contextLengthTokens: number;
  isMoE?: boolean;
  activeParameterSizeB?: number; // e.g. 12B active for 8x7B MoE
}

export interface ModelHardwareFit {
  modelName: string;
  canRunLocally: boolean;
  fitCategory: 'full_vram' | 'ram_offload' | 'cloud_mandatory';
  requiredRamGb: number;
  requiredVramGb: number;
  estimatedTokPerSec: number;
  recommendedRoutingTier: RoutingTier;
  mhsLevelRequired: MhsTier;
  reasoning: string;
}

export const KNOWN_MODEL_REGISTRY: Record<string, ModelSpec> = {
  'qwen2.5:1.5b': { name: 'qwen2.5:1.5b', parameterSizeB: 1.5, quantization: 'Q4_K_M', contextLengthTokens: 32768 },
  'llama3.1:8b': { name: 'llama3.1:8b', parameterSizeB: 8.0, quantization: 'Q4_K_M', contextLengthTokens: 131072 },
  'qwen2.5:7b': { name: 'qwen2.5:7b', parameterSizeB: 7.6, quantization: 'Q4_K_M', contextLengthTokens: 32768 },
  'qwen2.5:14b': { name: 'qwen2.5:14b', parameterSizeB: 14.7, quantization: 'Q4_K_M', contextLengthTokens: 32768 },
  'qwen2.5:32b': { name: 'qwen2.5:32b', parameterSizeB: 32.5, quantization: 'Q4_K_M', contextLengthTokens: 32768 },
  'llama3.1:70b': { name: 'llama3.1:70b', parameterSizeB: 70.0, quantization: 'Q4_K_M', contextLengthTokens: 131072 },
  'mistral-large': { name: 'mistral-large', parameterSizeB: 123.0, quantization: 'FP16', contextLengthTokens: 128000 },
  'claude-3-5-sonnet': { name: 'claude-3-5-sonnet', parameterSizeB: 175.0, quantization: 'FP16', contextLengthTokens: 200000 },
};

export class ModelHardwareStandard {
  private cachedProfile: HardwareProfile | null = null;

  /**
   * Profiles the host hardware (RAM, CPU, GPU, VRAM) and assigns an MHS class.
   */
  public getHardwareProfile(forceFresh = false): HardwareProfile {
    if (this.cachedProfile && !forceFresh) {
      return this.cachedProfile;
    }

    const totalRamBytes = os.totalmem();
    const freeRamBytes = os.freemem();
    const totalRamGb = parseFloat((totalRamBytes / (1024 ** 3)).toFixed(1));
    const freeRamGb = parseFloat((freeRamBytes / (1024 ** 3)).toFixed(1));
    const cpus = os.cpus() || [];
    const cpuCores = cpus.length;
    const cpuModel = cpus[0]?.model || 'Generic CPU';
    const architecture = os.arch();
    const platform = os.platform();

    let hasGpuAcceleration = false;
    let gpuName: string | undefined;
    let vramGb: number | undefined;

    // Probe NVIDIA GPU
    try {
      const smiOutput = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits', {
        encoding: 'utf8',
        timeout: 2000,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();

      if (smiOutput) {
        const parts = smiOutput.split(',');
        gpuName = parts[0]?.trim();
        const vramMb = parseFloat(parts[1]?.trim() || '0');
        vramGb = parseFloat((vramMb / 1024).toFixed(1));
        hasGpuAcceleration = true;
      }
    } catch {
      // No nvidia-smi, fallback to CPU detection
    }

    // Determine MHS classification tier
    const effectiveVram = vramGb || (platform === 'darwin' ? totalRamGb : 0);
    let mhsClass: MhsTier = 'MHS-1_ULTRA_LITE';

    if (effectiveVram >= 48 || totalRamGb >= 128) {
      mhsClass = 'MHS-4_CLUSTER';
    } else if (effectiveVram >= 16 || totalRamGb >= 32) {
      mhsClass = 'MHS-3_POWER';
    } else if (effectiveVram >= 6 || totalRamGb >= 12) {
      mhsClass = 'MHS-2_STANDARD';
    }

    this.cachedProfile = {
      totalRamGb,
      freeRamGb,
      cpuCores,
      cpuModel,
      architecture,
      platform,
      hasGpuAcceleration,
      gpuName,
      vramGb,
      mhsClass,
    };

    return this.cachedProfile;
  }

  /**
   * Evaluates if a given model can fit and run on current hardware.
   */
  public evaluateModelFit(modelInput: string | ModelSpec, profileOverride?: HardwareProfile): ModelHardwareFit {
    const profile = profileOverride || this.getHardwareProfile();
    const spec: ModelSpec = typeof modelInput === 'string'
      ? (KNOWN_MODEL_REGISTRY[modelInput.toLowerCase()] || this.inferModelSpec(modelInput))
      : modelInput;

    // VRAM/RAM required heuristic:
    // Q4: ~0.65 GB per 1B params + 1.5 GB context overhead
    // Q8: ~1.15 GB per 1B params + 2.5 GB context overhead
    // FP16: ~2.1 GB per 1B params + 4.0 GB context overhead
    const bytesPerParam = spec.quantization === 'Q4_K_M' ? 0.65 : spec.quantization === 'Q8_0' ? 1.15 : 2.1;
    const contextOverheadGb = (spec.contextLengthTokens / 32768) * 1.5;
    const requiredMemoryGb = parseFloat(((spec.parameterSizeB * bytesPerParam) + contextOverheadGb).toFixed(1));

    const availableVram = profile.vramGb || 0;
    const availableRam = profile.totalRamGb;

    // Required MHS tier for model
    let mhsLevelRequired: MhsTier = 'MHS-1_ULTRA_LITE';
    if (requiredMemoryGb > 48) {
      mhsLevelRequired = 'MHS-4_CLUSTER';
    } else if (requiredMemoryGb > 16) {
      mhsLevelRequired = 'MHS-3_POWER';
    } else if (requiredMemoryGb > 6) {
      mhsLevelRequired = 'MHS-2_STANDARD';
    }

    // Determine fit category
    let fitCategory: 'full_vram' | 'ram_offload' | 'cloud_mandatory' = 'cloud_mandatory';
    let canRunLocally = false;
    let estimatedTokPerSec = 0;
    let recommendedRoutingTier: RoutingTier = 'tier_1_muscle';
    let reasoning = '';

    if (availableVram >= requiredMemoryGb) {
      fitCategory = 'full_vram';
      canRunLocally = true;
      estimatedTokPerSec = Math.max(25, Math.round(450 / Math.sqrt(spec.parameterSizeB)));
      recommendedRoutingTier = 'tier_0_local';
      reasoning = `Model fits 100% in VRAM (${requiredMemoryGb}GB <= ${availableVram}GB VRAM). High performance local inference.`;
    } else if (availableRam >= (requiredMemoryGb * 1.3)) {
      fitCategory = 'ram_offload';
      canRunLocally = true;
      estimatedTokPerSec = profile.hasGpuAcceleration
        ? Math.max(8, Math.round(120 / Math.sqrt(spec.parameterSizeB)))
        : Math.max(3, Math.round(45 / Math.sqrt(spec.parameterSizeB)));

      // If CPU inference throughput is too low (<10 tok/s) and model is large, recommend cloud tier
      if (estimatedTokPerSec < 10) {
        recommendedRoutingTier = 'tier_1_muscle';
        reasoning = `Model fits in System RAM (${requiredMemoryGb}GB <= ${availableRam}GB RAM) but CPU/offload speed is slow (~${estimatedTokPerSec} tok/s). Recommend Tier 1 Cloud.`;
      } else {
        recommendedRoutingTier = 'tier_0_local';
        reasoning = `Model fits in System RAM with acceptable offload speed (~${estimatedTokPerSec} tok/s).`;
      }
    } else {
      fitCategory = 'cloud_mandatory';
      canRunLocally = false;
      estimatedTokPerSec = 0;
      recommendedRoutingTier = spec.parameterSizeB > 100 ? 'tier_2_frontier' : 'tier_1_muscle';
      reasoning = `Model requires ${requiredMemoryGb}GB which exceeds available local memory (${availableRam}GB RAM / ${availableVram}GB VRAM). Cloud routing mandatory.`;
    }

    return {
      modelName: spec.name,
      canRunLocally,
      fitCategory,
      requiredRamGb: requiredMemoryGb,
      requiredVramGb: requiredMemoryGb,
      estimatedTokPerSec,
      recommendedRoutingTier,
      mhsLevelRequired,
      reasoning,
    };
  }

  private inferModelSpec(name: string): ModelSpec {
    const lower = name.toLowerCase();
    let size = 7;
    const match = lower.match(/(\d+)b/);
    if (match && match[1]) {
      size = parseInt(match[1], 10);
    }
    return {
      name,
      parameterSizeB: size,
      quantization: 'Q4_K_M',
      contextLengthTokens: 32768,
    };
  }
}
