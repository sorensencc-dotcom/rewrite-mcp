import { ReasoningPacket } from '../contracts/ReasoningPacket';

export interface PremiseExtractionResult {
  claims: string[];
  entities: string[];
  relationships: string[];
}

export function extractPremises(packet: ReasoningPacket): PremiseExtractionResult {
  const { candidate } = packet;
  const content = candidate.content || '';

  const claims = extractClaims(content);
  const entities = extractEntities(content);
  const relationships = extractRelationships(content, entities);

  return {
    claims,
    entities,
    relationships
  };
}

function extractClaims(content: string): string[] {
  // Split by sentence boundaries, normalize whitespace
  return content
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.length < 500);
}

function extractEntities(content: string): string[] {
  const entities = new Set<string>();

  // Capitalized phrases (potential proper nouns/entities)
  const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  const capitalized = content.match(capitalizedPattern) || [];

  capitalized.forEach(entity => {
    if (
      entity.length > 1 &&
      ![
        'The',
        'A',
        'An',
        'And',
        'Or',
        'But',
        'In',
        'On',
        'At',
        'Is',
        'Are'
      ].includes(entity)
    ) {
      entities.add(entity);
    }
  });

  // Quoted phrases
  const quotedPattern = /"([^"]+)"/g;
  let match;
  while ((match = quotedPattern.exec(content)) !== null) {
    if (match[1].length > 0) {
      entities.add(match[1]);
    }
  }

  return Array.from(entities);
}

function extractRelationships(content: string, entities: string[]): string[] {
  const relationships: string[] = [];

  // For each pair of entities, check if they co-occur in same sentence
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const e1 = entities[i];
      const e2 = entities[j];

      const pattern = new RegExp(
        `${escapeRegex(e1)}[^.!?]*${escapeRegex(e2)}|${escapeRegex(e2)}[^.!?]*${escapeRegex(e1)}`,
        'i'
      );

      if (pattern.test(content)) {
        relationships.push(`${e1}—${e2}`);
      }
    }
  }

  return relationships;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
