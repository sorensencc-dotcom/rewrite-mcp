// File: projects/cic/ui/src/router.tsx | Date: 2026-06-03 | v1.0.0

import React from "react";
import { Route } from "react-router-dom";
import { MemoryExplorer } from "./components/memory/MemoryExplorer.js";
import { SkillExplorer } from "./components/skills/SkillExplorer.js";
import { PlannerConsole } from "./components/apr/PlannerConsole.js";
import { ExecutionConsole } from "./components/cro/ExecutionConsole.js";
import { KnowledgeExplorer } from "./components/ckg/KnowledgeExplorer.js";
import { MetaEvolutionConsole } from "./components/mee/MetaEvolutionConsole.js";

export function AppRouter() {
  return (
    <>
      {/* existing routes... */}
      <Route path="/memory" element={<MemoryExplorer />} />
      <Route path="/skills" element={<SkillExplorer />} />
      <Route path="/apr" element={<PlannerConsole />} />
      <Route path="/cro" element={<ExecutionConsole />} />
      <Route path="/knowledge" element={<KnowledgeExplorer />} />
      <Route path="/mee" element={<MetaEvolutionConsole />} />
    </>
  );
}
