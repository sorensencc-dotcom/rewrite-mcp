import { ReasoningPacket } from '../contracts/ReasoningPacket';
export interface PremiseExtractionResult {
    claims: string[];
    entities: string[];
    relationships: string[];
}
export declare function extractPremises(packet: ReasoningPacket): PremiseExtractionResult;
