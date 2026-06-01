import { ReasoningPacket } from '../contracts/ReasoningPacket';

export interface PremiseExtractionResult {
  claims: string[];
  entities: string[];
  relationships: string[];
}

export function extractPremises(packet: ReasoningPacket): PremiseExtractionResult {
  return {
    claims: [],
    entities: [],
    relationships: []
  };
}
