export type Ore = {
  id: string;
  name: string;
  value: number;
  hardness: number; // drill level required
  /** hex colors: deep shade, base, light, sparkle */
  colors: [string, string, string, string];
  peak: number; // depth (m) where this ore is most common
  spread: number; // how wide its depth band is
  base: number; // relative abundance
};

export const ORES: Ore[] = [
  {
    id: "copper",
    name: "Copper",
    value: 2,
    hardness: 0,
    colors: ["#6b3311", "#c96a24", "#f0a355", "#ffe0b8"],
    peak: 0,
    spread: 260,
    base: 1.0,
  },
  {
    id: "stone",
    name: "Stone",
    value: 3,
    hardness: 0,
    colors: ["#4c4f56", "#8c9199", "#c3c9d1", "#f0f4f8"],
    peak: 60,
    spread: 300,
    base: 0.95,
  },
  {
    id: "iron",
    name: "Iron",
    value: 6,
    hardness: 1,
    colors: ["#4a3b33", "#9b8478", "#d3c3b6", "#fff2e6"],
    peak: 220,
    spread: 300,
    base: 0.8,
  },
  {
    id: "gold",
    name: "Gold",
    value: 14,
    hardness: 1,
    colors: ["#8a5a06", "#e8b21b", "#ffe066", "#fffbd6"],
    peak: 420,
    spread: 320,
    base: 0.7,
  },
  {
    id: "diamond",
    name: "Diamond",
    value: 32,
    hardness: 2,
    colors: ["#0f4f7a", "#3fa9e8", "#a8e6ff", "#ffffff"],
    peak: 700,
    spread: 360,
    base: 0.62,
  },
  {
    id: "ruby",
    name: "Ruby",
    value: 55,
    hardness: 2,
    colors: ["#6b0f1c", "#cf2038", "#ff7a8a", "#ffe1e6"],
    peak: 1000,
    spread: 380,
    base: 0.58,
  },
  {
    id: "emerald",
    name: "Emerald",
    value: 90,
    hardness: 3,
    colors: ["#0b4a34", "#17a06b", "#6ce8b0", "#e3fff3"],
    peak: 1350,
    spread: 400,
    base: 0.55,
  },
  {
    id: "plasma",
    name: "Plasma",
    value: 150,
    hardness: 3,
    colors: ["#5a1263", "#c032d8", "#ff8cf5", "#ffe8ff"],
    peak: 1800,
    spread: 420,
    base: 0.52,
  },
  {
    id: "chrome",
    name: "Chrome",
    value: 240,
    hardness: 4,
    colors: ["#2c3a4a", "#7f9ec2", "#dff0ff", "#ffffff"],
    peak: 2350,
    spread: 460,
    base: 0.5,
  },
  {
    id: "cosmic",
    name: "Cosmic",
    value: 380,
    hardness: 4,
    colors: ["#161a4a", "#3b3fa8", "#8f7bff", "#e8e0ff"],
    peak: 3000,
    spread: 520,
    base: 0.48,
  },
  {
    id: "voidsteel",
    name: "Voidsteel",
    value: 600,
    hardness: 5,
    colors: ["#141018", "#3b3244", "#7a6f8c", "#c9bcd8"],
    peak: 3800,
    spread: 560,
    base: 0.46,
  },
  {
    id: "emberglass",
    name: "Emberglass",
    value: 950,
    hardness: 5,
    colors: ["#6d1a04", "#ef5b12", "#ffb35c", "#fff0cf"],
    peak: 4700,
    spread: 620,
    base: 0.44,
  },
  {
    id: "aurora",
    name: "Aurora",
    value: 1500,
    hardness: 6,
    colors: ["#0b3f4a", "#1fc7b6", "#8dfff0", "#f0fffd"],
    peak: 5800,
    spread: 700,
    base: 0.42,
  },
  {
    id: "rainbow",
    name: "Rainbow",
    value: 2400,
    hardness: 6,
    colors: ["#5b2a7a", "#e0479a", "#7ee0ff", "#fffbe8"],
    peak: 7200,
    spread: 800,
    base: 0.4,
  },
  {
    id: "glitch",
    name: "Glitch",
    value: 4000,
    hardness: 7,
    colors: ["#0a1a12", "#25ff8e", "#d9ff4b", "#ffffff"],
    peak: 9000,
    spread: 900,
    base: 0.38,
  },
  {
    id: "singularity",
    name: "Singularity",
    value: 7000,
    hardness: 7,
    colors: ["#050508", "#241a3a", "#6b4fd8", "#ffffff"],
    peak: 11500,
    spread: 1200,
    base: 0.36,
  },
];

export const ORE_INDEX: Record<string, number> = Object.fromEntries(
  ORES.map((o, i) => [o.id, i]),
);

/** Depth-weighted rarity: common tiers fade out, deep tiers take over. */
export function oreWeights(depth: number): number[] {
  return ORES.map((o) => {
    const d = (depth - o.peak) / o.spread;
    let w = o.base * Math.exp(-d * d);
    // shallow ores keep a thin tail deep down (a rare sight, never zero)
    if (depth > o.peak) w += o.base * 0.02 * Math.exp(-Math.abs(d) / 6);
    return w;
  });
}

export function pickOre(depth: number, rnd: number): Ore {
  const w = oreWeights(depth);
  const total = w.reduce((a, b) => a + b, 0);
  let t = rnd * total;
  for (let i = 0; i < w.length; i++) {
    t -= w[i]!;
    if (t <= 0) return ORES[i]!;
  }
  return ORES[0]!;
}
