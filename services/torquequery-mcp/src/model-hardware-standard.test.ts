import {
  ModelHardwareStandard,
  HardwareProfile,
  KNOWN_MODEL_REGISTRY,
} from './model-hardware-standard';

describe('Model Hardware Standard (MHS Spike - ACT-04)', () => {
  let mhs: ModelHardwareStandard;

  beforeEach(() => {
    mhs = new ModelHardwareStandard();
  });

  describe('Hardware Detection & Profiling', () => {
    test('detects local machine hardware profile and assigns MHS tier', () => {
      const profile = mhs.getHardwareProfile(true);
      expect(profile.totalRamGb).toBeGreaterThan(0);
      expect(profile.cpuCores).toBeGreaterThan(0);
      expect(profile.architecture).toBeDefined();
      expect(['MHS-1_ULTRA_LITE', 'MHS-2_STANDARD', 'MHS-3_POWER', 'MHS-4_CLUSTER']).toContain(profile.mhsClass);
    });
  });

  describe('Model Hardware Fit Evaluation', () => {
    test('evaluates 8B model on workstation profile with full VRAM fit', () => {
      const powerProfile: HardwareProfile = {
        totalRamGb: 64,
        freeRamGb: 48,
        cpuCores: 16,
        cpuModel: 'AMD Ryzen 9',
        architecture: 'x64',
        platform: 'win32',
        hasGpuAcceleration: true,
        gpuName: 'NVIDIA RTX 4090',
        vramGb: 24,
        mhsClass: 'MHS-3_POWER',
      };

      const fit = mhs.evaluateModelFit('llama3.1:8b', powerProfile);
      expect(fit.canRunLocally).toBe(true);
      expect(fit.fitCategory).toBe('full_vram');
      expect(fit.recommendedRoutingTier).toBe('tier_0_local');
      expect(fit.estimatedTokPerSec).toBeGreaterThanOrEqual(25);
    });

    test('evaluates 70B model on low-end profile requiring cloud offload', () => {
      const lowProfile: HardwareProfile = {
        totalRamGb: 16,
        freeRamGb: 8,
        cpuCores: 8,
        cpuModel: 'Intel i5',
        architecture: 'x64',
        platform: 'win32',
        hasGpuAcceleration: false,
        mhsClass: 'MHS-2_STANDARD',
      };

      const fit = mhs.evaluateModelFit('llama3.1:70b', lowProfile);
      expect(fit.canRunLocally).toBe(false);
      expect(fit.fitCategory).toBe('cloud_mandatory');
      expect(fit.recommendedRoutingTier).toBe('tier_1_muscle');
      expect(fit.mhsLevelRequired).toBe('MHS-4_CLUSTER');
    });

    test('evaluates 123B Mistral Large requiring Tier 1 Muscle cloud routing', () => {
      const fit = mhs.evaluateModelFit('mistral-large');
      expect(fit.mhsLevelRequired).toBe('MHS-4_CLUSTER');
      expect(fit.requiredVramGb).toBeGreaterThan(100);
      expect(['tier_1_muscle', 'tier_2_frontier']).toContain(fit.recommendedRoutingTier);
    });

    test('infers unlisted model specs dynamically from name', () => {
      const fit = mhs.evaluateModelFit('custom-coder-14b');
      expect(fit.modelName).toBe('custom-coder-14b');
      expect(fit.requiredRamGb).toBeGreaterThan(9);
    });
  });
});
