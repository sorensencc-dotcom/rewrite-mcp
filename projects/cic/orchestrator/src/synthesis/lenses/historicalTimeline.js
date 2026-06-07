/**
 * projects/cic/orchestrator/src/synthesis/lenses/historicalTimeline.js
 * @version 1.0.0
 * @date 2026-05-24
 *
 * Sorensen Master Timeline Registry
 */

export const ERAS = [
  {
    id: "era:early-ford",
    label: "Early Ford Motor Company & Piquette Avenue",
    years: [1903, 1908],
    keywords: ["piquette", "model n", "model s", "malcomson", "dodge brothers"]
  },
  {
    id: "era:early-model-t",
    label: "Early Model T & Highland Park",
    years: [1908, 1914],
    keywords: ["model t", "highland park", "magneto", "tin lizzie", "edsel"],
    scenes: ["factory", "assembly-line"]
  },
  {
    id: "era:rouge-expansion",
    label: "River Rouge & Vertical Integration",
    years: [1917, 1930],
    keywords: ["rouge", "river rouge", "vertical integration", "blast furnace", "foundry", "ore"],
    scenes: ["foundry", "steel-mill", "docks"]
  },
  {
    id: "era:ww2-production",
    label: "World War II & Willow Run",
    years: [1941, 1945],
    keywords: ["willow run", "b-24", "liberator", "bomber", "arsenal of democracy", "war production"],
    scenes: ["airfield", "hangar", "assembly-line"]
  },
  {
    id: "era:post-war",
    label: "Post-War Era",
    years: [1945, 1950],
    keywords: ["henry ford ii", "whiz kids", "post-war", "modernization"]
  }
];

export const FACILITIES = [
  {
    id: "plant:piquette",
    label: "Piquette Avenue Plant",
    keywords: ["piquette", "milwaukee junction"]
  },
  {
    id: "plant:highland-park",
    label: "Highland Park Plant",
    keywords: ["highland park", "crystal palace", "manchester avenue"]
  },
  {
    id: "plant:rouge",
    label: "River Rouge Complex",
    keywords: ["rouge", "river rouge", "blast furnace", "coke oven", "eagle boat"]
  },
  {
    id: "plant:willow-run",
    label: "Willow Run Bomber Plant",
    keywords: ["willow run", "ypsilanti", "bomber plant"]
  }
];

export const EVENTS = [
  {
    id: "event:moving-line-1913",
    label: "1913 Moving Assembly Line Rollout",
    keywords: ["moving line", "conveyor", "chassis line", "gravity slide"]
  },
  {
    id: "event:five-dollar-day",
    label: "Five Dollar Day Announcement",
    keywords: ["five dollar day", "sociological department", "profit sharing"]
  },
  {
    id: "event:b24-production",
    label: "B-24 Liberator Production",
    keywords: ["b-24", "liberator", "bomber production", "one a hour"]
  }
];
