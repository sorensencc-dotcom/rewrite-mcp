/**
 * consumer.mjs - v0.1.0
 * Bus consumer that emits SkillOptItems for trained skills
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { log } from '../logging/logger.js';
import { loadRedesignSkill } from './skillRegistryLoader.mjs';
import { createRedesignAgent } from './redesignAgent.mjs';
import { validateRedesignOutput } from './validator.mjs';

export class SkillOptConsumer {
  constructor({ skillsDir, outputDir, devMode = false }) {
    this.skillsDir = skillsDir;
    this.outputDir = outputDir;
    this.devMode = devMode;
    this.skill = null;
    this.agent = null;
  }

  async initialize() {
    if (this.agent) return;
    const skill = loadRedesignSkill({ skillsDir: this.skillsDir, devMode: this.devMode });
    this.agent = createRedesignAgent(skill);
    this.skill = skill;
  }

  async consume(event) {
    try {
      await this.initialize();

      const itemId = crypto.randomUUID();
      const redesignPlan = this.agent.generate({
        dom: event.dom || '',
        contentBlocks: event.contentBlocks || [],
        auditDeltas: event.auditDeltas || {},
        metadata: event.metadata || {},
      });

      // Optionally validate
      const validation = validateRedesignOutput(
        { auditDeltas: event.auditDeltas || {}, metadata: event.metadata || {} },
        redesignPlan
      );

      if (validation.overall < 0.7 && !this.devMode) {
        log.warn('redesign_validation_failed', {
          itemId,
          score: validation.overall.toFixed(3),
          warnings: validation.warnings,
        });
        return;
      }

      // Write to skillopt/data
      const itemPath = path.join(this.outputDir, `item-${itemId}.json`);
      const planPath = path.join(this.outputDir, `item-${itemId}.md`);

      fs.mkdirSync(path.dirname(itemPath), { recursive: true });
      fs.writeFileSync(
        itemPath,
        JSON.stringify({
          id: itemId,
          timestamp: new Date().toISOString(),
          input: {
            dom: event.dom || '',
            contentBlocks: event.contentBlocks || [],
            auditDeltas: event.auditDeltas || {},
            metadata: event.metadata || {},
          },
          validation,
        }, null, 2)
      );

      fs.writeFileSync(planPath, redesignPlan);

      log.info('skillopt_item_emitted', {
        itemId,
        validation_score: validation.overall.toFixed(3),
        skill_version: this.skill.version,
      });
    } catch (err) {
      log.error('skillopt_consume_failed', {
        eventId: event.id,
        err: err.message,
      });
    }
  }
}
