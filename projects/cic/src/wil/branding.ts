/**
 * CIC Branding Pack (Phase 46.8)
 *
 * Add branding to:
 * - Structured log events (brand field)
 * - Artifact metadata (accent_color, brand)
 * - Pipeline session payloads (session_brand, session_icon, session_color)
 * - Agent graph visualizer (optional)
 */

export interface BrandingConfig {
  brand: string;
  primary_color: string;
  accent_color: string;
  assets: {
    icon_16: string;
    icon_32: string;
    icon_64: string;
    icon_128: string;
    logo_horizontal: string;
    logo_stack: string;
  };
  session_appearance: {
    icon: string;
    color: string;
    theme: string;
  };
}

export interface BrandedLogEvent {
  timestamp: string;
  level: string;
  correlationId: string;
  event: string;
  brand: string;
  data?: Record<string, unknown>;
}

export interface BrandedArtifact {
  id: string;
  name: string;
  size_bytes: number;
  size_mb: number;
  accent_color: string;
  brand: string;
  watermark?: string;
  created_at: string;
}

export interface BrandedSessionPayload {
  session_id: string;
  pipeline_id: string;
  session_brand: string;
  session_icon: string;
  session_color: string;
  created_at: string;
}

export class BrandingManager {
  private config: BrandingConfig;

  constructor(config?: Partial<BrandingConfig>) {
    this.config = {
      brand: config?.brand || 'CIC',
      primary_color: config?.primary_color || '#0B1B2B',
      accent_color: config?.accent_color || '#35C2FF',
      assets: config?.assets || {
        icon_16: 'branding/cic/icon-16.png',
        icon_32: 'branding/cic/icon-32.png',
        icon_64: 'branding/cic/icon-64.png',
        icon_128: 'branding/cic/icon-128.png',
        logo_horizontal: 'branding/cic/logo-horizontal.png',
        logo_stack: 'branding/cic/logo-stack.png'
      },
      session_appearance: config?.session_appearance || {
        icon: 'branding/cic/session-icon.svg',
        color: '#35C2FF',
        theme: 'dark'
      }
    };
  }

  /**
   * Add brand to log event
   */
  brandLogEvent(event: Record<string, unknown>): BrandedLogEvent {
    return {
      timestamp: event.timestamp as string || new Date().toISOString(),
      level: event.level as string || 'info',
      correlationId: event.correlationId as string || 'unknown',
      event: event.event as string || 'event',
      brand: this.config.brand,
      data: Object.fromEntries(
        Object.entries(event).filter(
          ([key]) => !['timestamp', 'level', 'correlationId', 'event'].includes(key)
        )
      )
    };
  }

  /**
   * Add branding metadata to artifact
   */
  brandArtifact(artifact: Record<string, unknown>): BrandedArtifact {
    return {
      id: artifact.id as string || '',
      name: artifact.name as string || '',
      size_bytes: artifact.size_bytes as number || 0,
      size_mb: artifact.size_mb as number || 0,
      accent_color: this.config.accent_color,
      brand: this.config.brand,
      watermark: this.config.brand,
      created_at: artifact.created_at as string || new Date().toISOString()
    };
  }

  /**
   * Add branding to session payload
   */
  brandSessionPayload(session: Record<string, unknown>): BrandedSessionPayload {
    return {
      session_id: session.session_id as string || '',
      pipeline_id: session.pipeline_id as string || '',
      session_brand: this.config.brand,
      session_icon: this.config.session_appearance.icon,
      session_color: this.config.session_appearance.color,
      created_at: session.created_at as string || new Date().toISOString()
    };
  }

  /**
   * Generate agent graph node for visualizer
   */
  generateAgentGraphNode(): Record<string, unknown> {
    return {
      id: 'cic-foreman',
      label: this.config.brand,
      type: 'agent',
      icon: this.config.assets.icon_64,
      color: this.config.primary_color,
      accent_color: this.config.accent_color,
      theme: this.config.session_appearance.theme,
      properties: {
        brand: this.config.brand,
        icon: this.config.assets.icon_128,
        logo: this.config.assets.logo_horizontal
      }
    };
  }

  /**
   * Generate branding manifest for asset delivery
   */
  generateAssetManifest(): Record<string, unknown> {
    return {
      brand: this.config.brand,
      version: '1.0.0',
      assets: {
        icons: {
          'icon-16': { path: this.config.assets.icon_16, size: 16 },
          'icon-32': { path: this.config.assets.icon_32, size: 32 },
          'icon-64': { path: this.config.assets.icon_64, size: 64 },
          'icon-128': { path: this.config.assets.icon_128, size: 128 }
        },
        logos: {
          horizontal: { path: this.config.assets.logo_horizontal },
          stack: { path: this.config.assets.logo_stack }
        },
        session: {
          icon: this.config.session_appearance.icon,
          color: this.config.session_appearance.color,
          theme: this.config.session_appearance.theme
        }
      },
      colors: {
        primary: this.config.primary_color,
        accent: this.config.accent_color
      }
    };
  }

  /**
   * Get branding config
   */
  getConfig(): BrandingConfig {
    return { ...this.config };
  }

  /**
   * Update branding config
   */
  updateConfig(updates: Partial<BrandingConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

export default BrandingManager;
