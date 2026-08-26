import { ORES, pickOre, type Ore } from "./ores";
import type { SaveData } from "./storage";

export const TS = 22; // tile size in px
const WORLD_W = 72; // tiles
const CHUNK = 16;

const EMPTY = 0;
const DIRT = 1;
const ROCK = 2;
const LAVA = 3;
const GRASS = 4;
const BEDROCK = 5;
const ORE_BASE = 100;

export type RunResult = { depth: number; value: number; ores: Record<string, number> };

/* ---------------------------------- rng ---------------------------------- */

function hash2(x: number, y: number, s: number) {
  let h = x * 374761393 + y * 668265263 + s * 1442695040888963407;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function smooth(t: number) {
  return t * t * (3 - 2 * t);
}
function valueNoise(x: number, y: number, s: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = smooth(x - x0);
  const fy = smooth(y - y0);
  const a = hash2(x0, y0, s);
  const b = hash2(x0 + 1, y0, s);
  const c = hash2(x0, y0 + 1, s);
  const d = hash2(x0 + 1, y0 + 1, s);
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

/* -------------------------------- palettes -------------------------------- */

type Pal = { dark: string; base: string; light: string };

const BANDS: Pal[] = [
  { dark: "#4a2c16", base: "#6b3f1d", light: "#8a5628" },
  { dark: "#452a15", base: "#663b1c", light: "#845126" },
  { dark: "#3d2716", base: "#5c381d", light: "#7a4b26" },
  { dark: "#372519", base: "#523620", light: "#6d4a2c" },
  { dark: "#31241d", base: "#493426", light: "#634733" },
  { dark: "#2b2220", base: "#40322c", light: "#59453c" },
  { dark: "#241f24", base: "#372f38", light: "#4d434f" },
  { dark: "#1f1d2b", base: "#2f2b42", light: "#443e5c" },
  { dark: "#1a1c30", base: "#282c4b", light: "#3b4069" },
  { dark: "#151c33", base: "#1f2c52", light: "#2e4074" },
  { dark: "#131b2f", base: "#1b2a4d", light: "#26406e" },
  { dark: "#160f2b", base: "#241947", light: "#372666" },
  { dark: "#12091f", base: "#1d1038", light: "#2d1a54" },
  { dark: "#0d0716", base: "#170c2a", light: "#241343" },
  { dark: "#08050f", base: "#100820", light: "#1b0f33" },
];

function bandOf(ty: number) {
  return Math.max(0, Math.min(BANDS.length - 1, Math.floor(ty / 110)));
}

/* ------------------------------ tile sprites ------------------------------ */

const spriteCache = new Map<string, HTMLCanvasElement>();

function make(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function dirtSprite(band: number, v: number, grass: boolean) {
  const key = `d${band}_${v}_${grass ? 1 : 0}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const c = make(TS, TS);
  const g = c.getContext("2d")!;
  const p = BANDS[band];
  g.fillStyle = p.base;
  g.fillRect(0, 0, TS, TS);
  // speckled texture
  for (let i = 0; i < 42; i++) {
    const r = hash2(i * 7 + v * 31, band * 13 + i, 99);
    const x = Math.floor(hash2(i, v + band, 5) * TS);
    const y = Math.floor(hash2(i + 40, v * 3 + band, 7) * TS);
    const s = r > 0.86 ? 3 : r > 0.6 ? 2 : 1;
    g.fillStyle = r > 0.72 ? p.light : p.dark;
    g.globalAlpha = 0.55 + r * 0.35;
    g.fillRect(x, y, s, s);
  }
  g.globalAlpha = 1;
  // subtle inner bevel for depth
  g.fillStyle = "rgba(255,255,255,0.07)";
  g.fillRect(0, 0, TS, 2);
  g.fillStyle = "rgba(0,0,0,0.22)";
  g.fillRect(0, TS - 2, TS, 2);
  g.fillRect(TS - 2, 0, 2, TS);
  if (grass) {
    g.fillStyle = "#3f7f2b";
    g.fillRect(0, 0, TS, 7);
    g.fillStyle = "#5aa838";
    g.fillRect(0, 0, TS, 4);
    g.fillStyle = "#7ccb4d";
    for (let x = 0; x < TS; x += 2) {
      const hgt = 1 + Math.floor(hash2(x, v, 3) * 3);
      g.fillRect(x, 0, 1, hgt);
    }
    g.fillStyle = "rgba(0,0,0,0.25)";
    g.fillRect(0, 7, TS, 1);
  }
  spriteCache.set(key, c);
  return c;
}

function rockSprite(band: number, v: number) {
  const key = `r${band}_${v}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const c = make(TS, TS);
  const g = c.getContext("2d")!;
  const p = BANDS[band];
  g.fillStyle = p.dark;
  g.fillRect(0, 0, TS, TS);
  g.fillStyle = "#6f7178";
  g.fillRect(1, 1, TS - 2, TS - 2);
  g.fillStyle = "#8e9199";
  g.fillRect(1, 1, TS - 2, TS / 2 - 1);
  g.fillStyle = "#a8adb6";
  g.fillRect(2, 2, TS - 6, 3);
  g.fillStyle = "#54565c";
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(hash2(i, v, 11) * (TS - 3));
    const y = Math.floor(hash2(i + 9, v, 12) * (TS - 3));
    g.fillRect(x, y, 2, 2);
  }
  g.strokeStyle = "rgba(0,0,0,0.5)";
  g.lineWidth = 1;
  g.strokeRect(0.5, 0.5, TS - 1, TS - 1);
  spriteCache.set(key, c);
  return c;
}

function gem(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  o: Ore,
  rot: number,
) {
  const [dark, base, light, spark] = o.colors;
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fillRect(-s / 2 + 1, -s / 2 + 1, s, s);
  g.fillStyle = base;
  g.fillRect(-s / 2, -s / 2, s, s);
  g.fillStyle = dark;
  g.beginPath();
  g.moveTo(-s / 2, s / 2);
  g.lineTo(s / 2, s / 2);
  g.lineTo(s / 2, -s / 2);
  g.closePath();
  g.fill();
  g.fillStyle = light;
  g.fillRect(-s / 2 + 1, -s / 2 + 1, s * 0.45, s * 0.45);
  g.fillStyle = spark;
  g.fillRect(-s / 2 + 1, -s / 2 + 1, Math.max(1, s * 0.2), Math.max(1, s * 0.2));
  g.strokeStyle = "rgba(0,0,0,0.55)";
  g.lineWidth = 1;
  g.strokeRect(-s / 2 + 0.5, -s / 2 + 0.5, s - 1, s - 1);
  g.restore();
}

function oreSprite(oreIdx: number, band: number, v: number) {
  const key = `o${oreIdx}_${band}_${v}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const o = ORES[oreIdx];
  const c = make(TS, TS);
  const g = c.getContext("2d")!;
  g.drawImage(dirtSprite(band, v, false), 0, 0);
  const n = 3 + Math.floor(hash2(v, oreIdx, 21) * 3);
  for (let i = 0; i < n; i++) {
    const x = 5 + hash2(i, v + oreIdx, 31) * (TS - 10);
    const y = 5 + hash2(i + 5, v * 2 + oreIdx, 41) * (TS - 10);
    const s = 4 + hash2(i + 11, v + oreIdx, 51) * 5;
    gem(g, x, y, s, o, (hash2(i + 3, v, 61) - 0.5) * 0.8);
  }
  // glow for deep tiers
  if (o.hardness >= 4) {
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = 0.18;
    g.fillStyle = o.colors[2];
    g.fillRect(0, 0, TS, TS);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }
  spriteCache.set(key, c);
  return c;
}

/* --------------------------------- chunks --------------------------------- */

type Chunk = Int16Array;

class World {
  chunks = new Map<string, Chunk>();
  seed = Math.floor(Math.random() * 1e6);

  key(cx: number, cy: number) {
    return cx + "," + cy;
  }

  chunk(cx: number, cy: number): Chunk {
    const k = this.key(cx, cy);
    let c = this.chunks.get(k);
    if (c) return c;
    c = new Int16Array(CHUNK * CHUNK);
    this.gen(c, cx, cy);
    this.chunks.set(k, c);
    return c;
  }

  gen(c: Chunk, cx: number, cy: number) {
    const s = this.seed;
    for (let j = 0; j < CHUNK; j++) {
      const ty = cy * CHUNK + j;
      for (let i = 0; i < CHUNK; i++) {
        const tx = cx * CHUNK + i;
        let t: number = DIRT;
        if (tx < 0 || tx >= WORLD_W) t = BEDROCK;
        else if (ty < 0) t = EMPTY;
        else if (ty === 0) t = GRASS;
        else {
          const depth = ty;
          const cave = valueNoise(tx * 0.13, ty * 0.11, s);
          if (cave > 0.74 && depth > 6) t = EMPTY;
          const rockN = valueNoise(tx * 0.09 + 40, ty * 0.08 + 90, s + 3);
          const rockChance = 0.62 - Math.min(0.16, depth / 30000);
          if (t === DIRT && rockN > rockChance && depth > 14) t = ROCK;
          const lavaN = valueNoise(tx * 0.07 - 60, ty * 0.06 - 20, s + 7);
          const lavaThresh = 0.86 - Math.min(0.16, depth / 12000);
          if (depth > 45 && lavaN > lavaThresh) t = LAVA;
        }
        c[j * CHUNK + i] = t;
      }
    }
    // ore clusters
    const attempts = 7;
    for (let a = 0; a < attempts; a++) {
      const r = hash2(cx * 91 + a, cy * 57 + a * 13, s + 17);
      if (r > 0.82) continue;
      const ox = Math.floor(hash2(a, cx + cy * 7, s + 23) * CHUNK);
      const oy = Math.floor(hash2(a + 4, cx * 3 + cy, s + 29) * CHUNK);
      const ty = cy * CHUNK + oy;
      if (ty < 4) continue;
      const ore = pickOre(ty, hash2(a + 8, cx * 5 + cy * 11, s + 31));
      const idx = ORES.indexOf(ore);
      const size = 3 + Math.floor(hash2(a + 12, cx + cy, s + 37) * 6);
      let px = ox;
      let py = oy;
      for (let b = 0; b < size; b++) {
        if (px >= 0 && px < CHUNK && py >= 0 && py < CHUNK) {
          const cur = c[py * CHUNK + px];
          if (cur === DIRT || cur === ROCK) c[py * CHUNK + px] = ORE_BASE + idx;
        }
        const dir = hash2(a * 3 + b, cx * 13 + cy * 3 + b, s + 41);
        if (dir < 0.25) px++;
        else if (dir < 0.5) px--;
        else if (dir < 0.75) py++;
        else py--;
      }
    }
  }

  get(tx: number, ty: number) {
    if (tx < 0 || tx >= WORLD_W) return BEDROCK;
    if (ty < 0) return EMPTY;
    const cx = Math.floor(tx / CHUNK);
    const cy = Math.floor(ty / CHUNK);
    const c = this.chunk(cx, cy);
    return c[(ty - cy * CHUNK) * CHUNK + (tx - cx * CHUNK)];
  }

  set(tx: number, ty: number, v: number) {
    if (tx < 0 || tx >= WORLD_W || ty < 0) return;
    const cx = Math.floor(tx / CHUNK);
    const cy = Math.floor(ty / CHUNK);
    const c = this.chunk(cx, cy);
    c[(ty - cy * CHUNK) * CHUNK + (tx - cx * CHUNK)] = v;
  }
}

/* --------------------------------- helpers -------------------------------- */

const isSolid = (t: number) => t !== EMPTY && t !== LAVA;
const tileHardness = (t: number) => {
  if (t === DIRT || t === GRASS) return 0;
  if (t === ROCK) return 2;
  if (t >= ORE_BASE) return ORES[t - ORE_BASE].hardness;
  return 99;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  c: string;
  s: number;
};
type Popup = { x: number; y: number; text: string; c: string; life: number };

export type GameHandle = { destroy: () => void };

export function createGame(
  canvas: HTMLCanvasElement,
  opts: { save: SaveData; onEnd: (r: RunResult) => void; onQuit: () => void },
): GameHandle {
  const ctx = canvas.getContext("2d")!;
  const lv = (id: string) => opts.save.levels[id] ?? 0;

  const maxHp = 100 + lv("plating") * 20;
  const powerMul = 1 + lv("launcher") * 0.08;
  const speedMul = 1 + lv("spurs") * 0.06;
  const fuelMax = 100 * (1 + lv("stamina") * 0.15);
  const drill = lv("drill");
  const magnetR = lv("magnet") * 0.9 * TS;
  const fortune = 1 + lv("fortune") * 0.1;
  const coolant = Math.pow(0.9, lv("coolant"));

  const world = new World();

  const p = {
    x: (WORLD_W / 2) * TS,
    y: -30,
    vx: 0,
    vy: 0,
    r: 10,
    rot: 0,
    hp: maxHp,
    fuel: fuelMax,
  };

  let state: "aim" | "roll" | "over" = "aim";
  let aiming = false;
  let aimX = 0;
  let aimY = 0;
  let camX = p.x;
  let camY = 0;
  let shake = 0;
  let hurtFlash = 0;
  let burnCd = 0;
  let stallTime = 0;
  let value = 0;
  let maxDepth = 0;
  const collected: Record<string, number> = {};
  const particles: Particle[] = [];
  const popups: Popup[] = [];
  const keys = new Set<string>();
  let touchDir = 0;
  let running = true;
  let W = 0;
  let H = 0;
  let t = 0;

  /* ------------------------------- resizing ------------------------------- */
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  /* --------------------------------- input -------------------------------- */
  function pos(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function onDown(e: PointerEvent) {
    canvas.setPointerCapture(e.pointerId);
    const q = pos(e);
    if (state === "aim") {
      aiming = true;
      aimX = q.x;
      aimY = q.y;
    } else if (state === "roll") {
      touchDir = q.x < W / 2 ? -1 : 1;
    }
  }
  function onMove(e: PointerEvent) {
    const q = pos(e);
    if (aiming) {
      aimX = q.x;
      aimY = q.y;
    } else if (state === "roll" && touchDir !== 0) {
      touchDir = q.x < W / 2 ? -1 : 1;
    }
  }
  function onUp() {
    if (aiming && state === "aim") launch();
    aiming = false;
    touchDir = 0;
  }
  function onKeyDown(e: KeyboardEvent) {
    keys.add(e.key.toLowerCase());
    if (e.key === "Escape") opts.onQuit();
    if ([" ", "ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"].includes(e.key))
      e.preventDefault();
  }
  function onKeyUp(e: KeyboardEvent) {
    keys.delete(e.key.toLowerCase());
  }
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  function launch() {
    const sx = W / 2;
    const sy = H * 0.32;
    let dx = sx - aimX;
    let dy = sy - aimY;
    const len = Math.hypot(dx, dy);
    if (len < 12) return;
    const power = Math.min(len, 170) / 170;
    dx /= len;
    dy /= len;
    const speed = (420 + power * 780) * powerMul;
    p.vx = dx * speed;
    p.vy = Math.max(dy * speed, -220);
    state = "roll";
    shake = 8;
    burst(p.x, p.y, 22, "#f4d58d");
  }

  /* ------------------------------- particles ------------------------------ */
  function burst(x: number, y: number, n: number, c: string, spd = 180) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * spd;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.4 + Math.random() * 0.5,
        max: 0.9,
        c,
        s: 2 + Math.random() * 3,
      });
    }
  }
  function popup(x: number, y: number, text: string, c: string) {
    popups.push({ x, y, text, c, life: 1.1 });
  }

  /* -------------------------------- digging ------------------------------- */
  function hitTile(tx: number, ty: number, t: number): boolean {
    // returns true if tile destroyed
    const h = tileHardness(t);
    if (h > drill) return false;
    const band = bandOf(ty);
    world.set(tx, ty, EMPTY);
    const cx = tx * TS + TS / 2;
    const cy = ty * TS + TS / 2;
    if (t >= ORE_BASE) {
      const o = ORES[t - ORE_BASE];
      const gain = Math.round(o.value * fortune);
      value += gain;
      collected[o.id] = (collected[o.id] ?? 0) + 1;
      popup(cx, cy, `+${gain} ${o.name}`, o.colors[2]);
      burst(cx, cy, 14, o.colors[2], 150);
      shake = Math.max(shake, 3);
      p.fuel = Math.min(fuelMax, p.fuel + 1.5);
    } else {
      burst(cx, cy, 6, BANDS[band].light, 110);
      if (t === ROCK) {
        burst(cx, cy, 6, "#b9bec7", 130);
        shake = Math.max(shake, 2);
      }
    }
    return true;
  }

  function collide(dt: number) {
    const minTx = Math.floor((p.x - p.r - TS) / TS);
    const maxTx = Math.floor((p.x + p.r + TS) / TS);
    const minTy = Math.floor((p.y - p.r - TS) / TS);
    const maxTy = Math.floor((p.y + p.r + TS) / TS);
    const speed = Math.hypot(p.vx, p.vy);
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        const t = world.get(tx, ty);
        if (t === EMPTY) continue;
        const rx = tx * TS;
        const ry = ty * TS;
        const nx = Math.max(rx, Math.min(p.x, rx + TS));
        const ny = Math.max(ry, Math.min(p.y, ry + TS));
        const dx = p.x - nx;
        const dy = p.y - ny;
        const d2 = dx * dx + dy * dy;
        if (d2 > p.r * p.r) continue;

        if (t === LAVA) {
          if (burnCd <= 0) {
            const dmg = Math.min(maxHp * 0.18, 14 * coolant + maxHp * 0.03);
            p.hp -= dmg;
            burnCd = 0.85;
            hurtFlash = 1;
            shake = 12;
            popup(p.x, p.y - 16, `-${Math.round(dmg)} HP`, "#ff6b6b");
            burst(p.x, p.y, 20, "#ff9a3c", 220);
            const kx = p.vx === 0 ? 0 : -Math.sign(p.vx);
            p.vx = kx * 260 + (Math.random() - 0.5) * 60;
            p.vy = -320;
            p.fuel = Math.max(0, p.fuel - 6 * coolant);
          }
          continue;
        }

        const destroyed = speed > 45 || tileHardness(t) === 0 ? hitTile(tx, ty, t) : false;
        if (destroyed) {
          p.fuel -= tileHardness(t) === 0 ? 0.18 : 0.5;
          const damp = tileHardness(t) === 0 ? 0.995 : 0.965;
          p.vx *= damp;
          p.vy *= damp;
          continue;
        }
        // bounce off unbreakable
        const dist = Math.sqrt(d2) || 0.001;
        let nxn = dx / dist;
        let nyn = dy / dist;
        if (d2 < 0.0001) {
          nxn = 0;
          nyn = -1;
        }
        const push = p.r - dist;
        p.x += nxn * push;
        p.y += nyn * push;
        const dot = p.vx * nxn + p.vy * nyn;
        p.vx = (p.vx - 2 * dot * nxn) * 0.42;
        p.vy = (p.vy - 2 * dot * nyn) * 0.42;
        if (speed > 300) {
          shake = Math.max(shake, 4);
          burst(p.x, p.y, 5, "#cfd4dc", 90);
        }
      }
    }
    void dt;
  }

  function magnet() {
    if (magnetR <= 0) return;
    const rad = Math.ceil(magnetR / TS) + 1;
    const ptx = Math.floor(p.x / TS);
    const pty = Math.floor(p.y / TS);
    for (let ty = pty - rad; ty <= pty + rad; ty++) {
      for (let tx = ptx - rad; tx <= ptx + rad; tx++) {
        const t = world.get(tx, ty);
        if (t < ORE_BASE) continue;
        if (ORES[t - ORE_BASE].hardness > drill) continue;
        const dx = tx * TS + TS / 2 - p.x;
        const dy = ty * TS + TS / 2 - p.y;
        if (dx * dx + dy * dy <= magnetR * magnetR) hitTile(tx, ty, t);
      }
    }
  }

  /* --------------------------------- update -------------------------------- */
  function update(dt: number) {
    t += dt;
    if (state === "aim") {
      p.y += dt * 0;
      camX += (p.x - camX) * 0.1;
      camY += (0 - camY) * 0.1;
      return;
    }
    if (state === "over") return;

    const left = keys.has("arrowleft") || keys.has("a") || touchDir === -1;
    const right = keys.has("arrowright") || keys.has("d") || touchDir === 1;
    const hasFuel = p.fuel > 0;
    const steer = (hasFuel ? 1250 : 380) * speedMul;
    if (left) p.vx -= steer * dt;
    if (right) p.vx += steer * dt;
    if (hasFuel && (keys.has("arrowdown") || keys.has("s"))) p.vy += 900 * dt;

    p.vy += 1500 * dt;
    // drag
    const dragBase = hasFuel ? 0.16 : 1.5;
    p.vx -= p.vx * dragBase * dt;
    p.vy -= p.vy * dragBase * 0.35 * dt;

    const cap = 1000 * speedMul;
    p.vx = Math.max(-cap, Math.min(cap, p.vx));
    p.vy = Math.max(-cap, Math.min(cap * 1.2, p.vy));

    const speed = Math.hypot(p.vx, p.vy);
    p.fuel -= dt * (2.2 + speed / 900) * (left || right ? 1.35 : 1);
    p.fuel = Math.max(0, p.fuel);

    // integrate in substeps to avoid tunneling
    const steps = Math.max(1, Math.ceil((speed * dt) / (TS * 0.4)));
    for (let i = 0; i < steps; i++) {
      p.x += (p.vx * dt) / steps;
      p.y += (p.vy * dt) / steps;
      collide(dt / steps);
    }
    magnet();

    p.rot += (p.vx * dt) / p.r;
    p.x = Math.max(TS + p.r, Math.min(p.x, (WORLD_W - 1) * TS - p.r));

    maxDepth = Math.max(maxDepth, Math.floor(p.y / TS));
    burnCd -= dt;
    hurtFlash = Math.max(0, hurtFlash - dt * 2);
    shake *= 0.88;

    if (p.fuel <= 0 && speed < 55) {
      stallTime += dt;
      if (stallTime > 1.6) end("Out of steam!");
    } else stallTime = 0;

    if (p.hp <= 0) {
      p.hp = 0;
      end("Shell cracked!");
    }

    camX += (p.x - camX) * 0.12;
    camY += (p.y + 60 - camY) * 0.1;

    for (let i = particles.length - 1; i >= 0; i--) {
      const q = particles[i];
      q.vy += 700 * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.life -= dt;
      if (q.life <= 0) particles.splice(i, 1);
    }
    for (let i = popups.length - 1; i >= 0; i--) {
      popups[i].y -= dt * 28;
      popups[i].life -= dt;
      if (popups[i].life <= 0) popups.splice(i, 1);
    }
  }

  let endMsg = "";
  function end(msg: string) {
    if (state === "over") return;
    state = "over";
    endMsg = msg;
    burst(p.x, p.y, 40, "#ffd166", 260);
    setTimeout(() => {
      if (running) opts.onEnd({ depth: maxDepth, value, ores: collected });
    }, 900);
  }

  /* ---------------------------------- draw --------------------------------- */
  function drawSky(topY: number) {
    const g = ctx.createLinearGradient(0, 0, 0, Math.max(1, topY));
    g.addColorStop(0, "#63c8f2");
    g.addColorStop(1, "#a7e3fb");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, topY);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 337 + t * 6) % (W + 200)) - 100;
      const cy = 30 + ((i * 53) % 70);
      if (cy > topY) continue;
      ctx.fillRect(cx, cy, 46, 10);
      ctx.fillRect(cx + 10, cy - 8, 26, 10);
    }
  }

  function drawArmadillo(x: number, y: number, rot: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const r = p.r + 2;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.arc(1.5, 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9d6b45";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c28d5f";
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.3, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
    // shell bands
    ctx.strokeStyle = "#6f4527";
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * (r / 2.6), -r);
      ctx.lineTo(i * (r / 2.6), r);
      ctx.stroke();
    }
    ctx.strokeStyle = "#4c2e18";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r - 0.5, 0, Math.PI * 2);
    ctx.stroke();
    // snout + eye peeking
    ctx.fillStyle = "#f2d3b3";
    ctx.beginPath();
    ctx.arc(r * 0.55, r * 0.1, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2b1a0f";
    ctx.fillRect(r * 0.62, r * 0.02, 3, 3);
    ctx.restore();
  }

  function draw() {
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    const ox = Math.round(camX - W / 2 + sx);
    const oy = Math.round(camY - H * (state === "aim" ? 0.32 : 0.42) + sy);

    ctx.clearRect(0, 0, W, H);
    const surfaceY = -oy;
    if (surfaceY > 0) drawSky(Math.min(H, surfaceY));
    else {
      ctx.fillStyle = "#0a0a12";
      ctx.fillRect(0, 0, W, H);
    }

    const tx0 = Math.floor(ox / TS) - 1;
    const tx1 = Math.floor((ox + W) / TS) + 1;
    const ty0 = Math.floor(oy / TS) - 1;
    const ty1 = Math.floor((oy + H) / TS) + 1;

    for (let ty = Math.max(0, ty0); ty <= ty1; ty++) {
      const band = bandOf(ty);
      for (let tx = tx0; tx <= tx1; tx++) {
        const tl = world.get(tx, ty);
        if (tl === EMPTY) continue;
        const dx = tx * TS - ox;
        const dy = ty * TS - oy;
        const v = Math.floor(hash2(tx, ty, 5) * 4);
        if (tl === LAVA) {
          const glow = 0.6 + 0.4 * Math.sin(t * 3 + tx + ty);
          ctx.fillStyle = "#7a1e05";
          ctx.fillRect(dx, dy, TS, TS);
          ctx.fillStyle = `rgba(255,${90 + glow * 70},20,1)`;
          ctx.fillRect(dx + 1, dy + 1, TS - 2, TS - 2);
          ctx.fillStyle = `rgba(255,230,140,${0.35 + glow * 0.4})`;
          ctx.fillRect(dx + 3, dy + 3 + Math.sin(t * 4 + tx) * 2, TS - 8, 3);
          continue;
        }
        if (tl === BEDROCK) {
          ctx.fillStyle = "#15100c";
          ctx.fillRect(dx, dy, TS, TS);
          ctx.fillStyle = "#241a13";
          ctx.fillRect(dx + 2, dy + 2, TS - 4, TS - 4);
          continue;
        }
        let img: HTMLCanvasElement;
        if (tl >= ORE_BASE) img = oreSprite(tl - ORE_BASE, band, v);
        else if (tl === ROCK) img = rockSprite(band, v);
        else img = dirtSprite(band, v, tl === GRASS);
        ctx.drawImage(img, dx, dy);
      }
    }

    // vignette darkness with depth
    const dark = Math.min(0.45, Math.max(0, (camY / TS - 150) / 4000));
    if (dark > 0) {
      ctx.fillStyle = `rgba(0,0,0,${dark})`;
      ctx.fillRect(0, 0, W, H);
    }

    for (const q of particles) {
      ctx.globalAlpha = Math.max(0, q.life / q.max);
      ctx.fillStyle = q.c;
      ctx.fillRect(q.x - ox, q.y - oy, q.s, q.s);
    }
    ctx.globalAlpha = 1;

    drawArmadillo(p.x - ox, p.y - oy, p.rot);

    // aim trajectory
    if (state === "aim") {
      const cx = p.x - ox;
      const cy = p.y - oy;
      if (aiming) {
        let dx = cx - aimX;
        let dy = cy - aimY;
        const len = Math.hypot(dx, dy) || 1;
        const power = Math.min(len, 170) / 170;
        dx /= len;
        dy /= len;
        const speed = (420 + power * 780) * powerMul;
        let vx = dx * speed;
        let vy = Math.max(dy * speed, -220);
        let x = cx;
        let y = cy;
        for (let i = 0; i < 34; i++) {
          x += vx * 0.035;
          y += vy * 0.035;
          vy += 1500 * 0.035;
          ctx.globalAlpha = 1 - i / 36;
          ctx.fillStyle = "#fff2b8";
          ctx.fillRect(x - 2, y - 2, 4, 4);
        }
        ctx.globalAlpha = 1;
        // power meter
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(cx - 42, cy - 46, 84, 14);
        ctx.fillStyle = power > 0.8 ? "#ff7a4d" : "#ffd166";
        ctx.fillRect(cx - 40, cy - 44, 80 * power, 10);
      }
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(W / 2 - 190, H - 96, 380, 56);
      ctx.fillStyle = "#fff8e6";
      ctx.font = "bold 20px 'Baloo 2', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Drag back and release to launch!", W / 2, H - 68);
      ctx.font = "16px 'Baloo 2', system-ui, sans-serif";
      ctx.fillStyle = "#ffe9a8";
      ctx.fillText("Then steer with  A / D  or  ← →", W / 2, H - 48);
    }

    for (const q of popups) {
      ctx.globalAlpha = Math.min(1, q.life);
      ctx.font = "bold 17px 'Baloo 2', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(0,0,0,0.8)";
      ctx.strokeText(q.text, q.x - ox, q.y - oy);
      ctx.fillStyle = q.c;
      ctx.fillText(q.text, q.x - ox, q.y - oy);
    }
    ctx.globalAlpha = 1;

    if (hurtFlash > 0) {
      ctx.fillStyle = `rgba(255,40,40,${hurtFlash * 0.35})`;
      ctx.fillRect(0, 0, W, H);
    }

    drawHud();

    if (state === "over") {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 42px 'Baloo 2', system-ui, sans-serif";
      ctx.fillText(endMsg, W / 2, H / 2);
    }
  }

  function bar(
    x: number,
    y: number,
    w: number,
    h: number,
    pct: number,
    fill: string,
    label: string,
    icon: string,
  ) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.fillStyle = "#2a2018";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, pct)), h);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, pct)), h * 0.35);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
    ctx.textAlign = "left";
    ctx.font = "bold 16px 'Baloo 2', system-ui, sans-serif";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(`${icon} ${label}`, x + 6, y + h - 5);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${icon} ${label}`, x + 6, y + h - 5);
  }

  function drawHud() {
    bar(
      16,
      16,
      Math.min(300, W * 0.42),
      26,
      p.hp / maxHp,
      "#e63946",
      `${Math.ceil(p.hp)} / ${maxHp}`,
      "❤",
    );
    bar(
      16,
      54,
      Math.min(220, W * 0.32),
      16,
      p.fuel / fuelMax,
      "#3ec46d",
      `${Math.ceil(p.fuel)} fuel`,
      "⚡",
    );
    ctx.textAlign = "right";
    ctx.font = "bold 26px 'Baloo 2', system-ui, sans-serif";
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    const depthText = `⬇ ${maxDepth} m`;
    const coinText = `🪙 ${value}`;
    ctx.strokeText(depthText, W - 16, 40);
    ctx.fillStyle = "#ffe9a8";
    ctx.fillText(depthText, W - 16, 40);
    ctx.strokeText(coinText, W - 16, 70);
    ctx.fillStyle = "#ffd166";
    ctx.fillText(coinText, W - 16, 70);
  }

  /* ---------------------------------- loop --------------------------------- */
  let last = performance.now();
  function frame(now: number) {
    if (!running) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    destroy() {
      running = false;
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}
