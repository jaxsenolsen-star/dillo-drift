import { UPGRADES } from "./upgrades";

export type SaveData = {
  username: string;
  coins: number;
  levels: Record<string, number>;
  bestDepth: number;
  bestValue: number;
  runs: number;
};

export type LeaderEntry = { name: string; depth: number; value: number; you?: boolean };

const SAVE_KEY = "dillo-drift.save.v1";
const BOARD_KEY = "dillo-drift.board.v1";

export function defaultSave(): SaveData {
  return {
    username: "",
    coins: 0,
    levels: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
    bestDepth: 0,
    bestValue: 0,
    runs: 0,
  };
}

export function loadSave(): SaveData {
  const base = defaultSave();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...base,
      ...parsed,
      levels: { ...base.levels, ...(parsed.levels ?? {}) },
    };
  } catch {
    return base;
  }
}

export function saveSave(data: SaveData) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable */
  }
}

const SEED_BOARD: LeaderEntry[] = [
  { name: "TunnelTina", depth: 8420, value: 184300 },
  { name: "RollyPoly", depth: 6110, value: 96500 },
  { name: "GlitchGus", depth: 4980, value: 71200 },
  { name: "MagmaMitts", depth: 3640, value: 40100 },
  { name: "CopperKid", depth: 2210, value: 18700 },
  { name: "DustDevil", depth: 1480, value: 9100 },
  { name: "PebblePete", depth: 860, value: 3900 },
  { name: "SurfaceSam", depth: 310, value: 1200 },
];

export function loadBoard(): LeaderEntry[] {
  try {
    const raw = localStorage.getItem(BOARD_KEY);
    if (raw) return JSON.parse(raw) as LeaderEntry[];
  } catch {
    /* ignore */
  }
  saveBoard(SEED_BOARD);
  return SEED_BOARD;
}

function saveBoard(entries: LeaderEntry[]) {
  try {
    localStorage.setItem(BOARD_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

/** Records only final high scores — never live run data. */
export function submitScore(name: string, depth: number, value: number): LeaderEntry[] {
  const board = loadBoard().filter((e) => e.name !== name);
  board.push({ name, depth, value, you: true });
  board.sort((a, b) => b.depth - a.depth);
  const trimmed = board.slice(0, 20);
  saveBoard(trimmed);
  return trimmed;
}
