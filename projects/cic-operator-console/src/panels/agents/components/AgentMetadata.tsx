import { CICGrid, CICStat, CICText } from '../../../components/cic-primitives';
import { cic } from '../../../tokens/cic-tokens';
import type { AgentMetadata } from '../types';

interface AgentMetadataProps {
  metadata: AgentMetadata;
}

/**
 * AgentMetadata — Display agent name, version, region, capabilities
 */
export function AgentMetadata({ metadata }: AgentMetadataProps) {
  return (
    <div className={cic.cls.spacingVertical}>
      <CICGrid cols={2} gap={4}>
        <CICStat label="Name" value={metadata.name} tone="accent" />
        <CICStat label="Version" value={metadata.version} tone="accent" />
        <CICStat label="Region" value={metadata.region} tone="accent" />
      </CICGrid>

      <div className="mt-4">
        <CICText variant="label-sm" className="mb-2">
          Capabilities
        </CICText>
        <div className="flex flex-wrap gap-2">
          {metadata.capabilities.map(cap => (
            <span key={cap} className={`${cic.cls.badge} px-2 py-1 text-xs rounded`}>
              {cap}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
