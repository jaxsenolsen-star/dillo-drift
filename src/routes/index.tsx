import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { GameCanvas } from "@/components/game/GameCanvas";
import { ORES } from "@/game/ores";
import { UPGRADES, upgradeCost } from "@/game/upgrades";
import {
  defaultSave,
  loadBoard,
  loadSave,
  saveSave,
  submitScore,
  type LeaderEntry,
  type SaveData,
} from "@/game/storage";
import type { RunResult } from "@/game/engine";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dillo Drift — Roll Deep, Mine Rare Ore" },
      {
        name: "description",
        content:
          "Slingshot an armadillo underground, smash through dirt and rock, collect Copper to Singularity ore, and upgrade your shell.",
      },
      { property: "og:title", content: "Dillo Drift" },
      {
        property: "og:description",
        content: "A pixel-art digging game: launch, roll, mine, upgrade, repeat.",
      },
    ],
  }),
  component: Index,
});

type Screen = "name" | "menu" | "shop" | "board" | "play" | "result";

function Index() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("menu");
  const [save, setSave] = useState<SaveData>(defaultSave);
  const [board, setBoard] = useState<LeaderEntry[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    const s = loadSave();
    setSave(s);
    setBoard(loadBoard());
    setScreen(s.username ? "menu" : "name");
    setReady(true);
  }, []);

  const persist = useCallback((next: SaveData) => {
    setSave(next);
    saveSave(next);
  }, []);

  const onEnd = useCallback(
    (r: RunResult) => {
      setResult(r);
      const next: SaveData = {
        ...save,
        coins: save.coins + r.value,
        bestDepth: Math.max(save.bestDepth, r.depth),
        bestValue: Math.max(save.bestValue, r.value),
        runs: save.runs + 1,
      };
      persist(next);
      setBoard(submitScore(next.username, next.bestDepth, next.bestValue));
      setScreen("result");
    },
    [save, persist],
  );

  if (!ready) return <div className="min-h-screen bg-background" />;

  if (screen === "play")
    return <GameCanvas save={save} onEnd={onEnd} onQuit={() => setScreen("menu")} />;

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Backdrop />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-4 py-10">
        {screen === "name" && (
          <NamePrompt
            value={nameInput}
            onChange={setNameInput}
            onSubmit={() => {
              const name = nameInput.trim().slice(0, 14) || "Dillo";
              persist({ ...save, username: name });
              setScreen("menu");
            }}
          />
        )}
        {screen === "menu" && (
          <Menu save={save} go={setScreen} onPlay={() => setScreen("play")} />
        )}
        {screen === "shop" && (
          <Shop save={save} persist={persist} back={() => setScreen("menu")} />
        )}
        {screen === "board" && (
          <Leaderboard board={board} me={save.username} back={() => setScreen("menu")} />
        )}
        {screen === "result" && result && (
          <Result
            result={result}
            save={save}
            again={() => setScreen("play")}
            menu={() => setScreen("menu")}
            shop={() => setScreen("shop")}
          />
        )}
      </div>
    </main>
  );
}

function Backdrop() {
  return (
    <div aria-hidden className="absolute inset-0">
      <div className="h-[26vh] w-full" style={{ background: "var(--gradient-sky)" }} />
      <div className="h-[6px] w-full bg-grass" />
      <div className="h-[74vh] w-full" style={{ background: "var(--gradient-dirt)" }} />
      <div className="absolute inset-0 opacity-40 mix-blend-overlay [background-image:radial-gradient(circle_at_1px_1px,oklch(1_0_0/0.35)_1px,transparent_0)] [background-size:7px_7px]" />
    </div>
  );
}

function Title() {
  return (
    <div className="mb-6 text-center">
      <h1 className="title-outline text-5xl font-extrabold text-gold sm:text-7xl">
        DILLO DRIFT
      </h1>
      <p className="mt-2 font-pixel text-[10px] leading-relaxed text-foreground sm:text-xs">
        launch • roll • smash • mine deeper
      </p>
    </div>
  );
}

function Btn({
  children,
  onClick,
  tone = "primary",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "primary" | "secondary" | "accent";
  disabled?: boolean;
}) {
  const tones = {
    primary: "bg-gold text-gold-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    accent: "bg-accent text-accent-foreground",
  } as const;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`chunky w-full rounded-2xl border-2 border-border px-6 py-3 text-xl font-extrabold disabled:cursor-not-allowed disabled:opacity-45 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function NamePrompt({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="w-full max-w-md">
      <Title />
      <form
        className="panel space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <h2 className="text-2xl">Pick your dillo name</h2>
        <p className="text-sm text-muted-foreground">
          Shown on the leaderboard with your best depth.
        </p>
        <input
          autoFocus
          value={value}
          maxLength={14}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. RollyPoly"
          className="w-full rounded-xl border-2 border-border bg-input px-4 py-3 text-lg font-bold text-foreground outline-none focus:border-ring"
        />
        <Btn>Start digging</Btn>
      </form>
    </div>
  );
}

function Stat({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border-2 border-border bg-card px-3 py-1.5 text-lg font-extrabold">
      <span aria-hidden>{icon}</span>
      {label}
    </span>
  );
}

function Menu({
  save,
  go,
  onPlay,
}: {
  save: SaveData;
  go: (s: Screen) => void;
  onPlay: () => void;
}) {
  return (
    <div className="w-full max-w-md">
      <Title />
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        <Stat icon="🪙" label={`${save.coins} coins`} />
        <Stat icon="⬇" label={`${save.bestDepth} m best`} />
        <Stat icon="🦔" label={save.username || "Dillo"} />
      </div>
      <div className="panel space-y-3 p-6">
        <Btn onClick={onPlay}>▶ Play</Btn>
        <Btn tone="accent" onClick={() => go("shop")}>
          🛠 Shop
        </Btn>
        <Btn tone="secondary" onClick={() => go("board")}>
          🏆 Leaderboard
        </Btn>
        <p className="pt-1 text-center text-sm text-muted-foreground">
          Drag to aim, release to launch. Steer with A / D or ← →. Esc quits a run.
        </p>
      </div>
    </div>
  );
}

function Shop({
  save,
  persist,
  back,
}: {
  save: SaveData;
  persist: (s: SaveData) => void;
  back: () => void;
}) {
  return (
    <div className="w-full max-w-2xl">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-3xl font-extrabold text-gold">🛠 Shop</h2>
        <Stat icon="🪙" label={`${save.coins}`} />
      </header>
      <div className="panel divide-y-2 divide-border p-2">
        {UPGRADES.map((u) => {
          const level = save.levels[u.id] ?? 0;
          const cost = upgradeCost(u, level);
          const afford = save.coins >= cost;
          return (
            <div key={u.id} className="flex items-center gap-3 p-3">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl border-2 border-border bg-secondary text-2xl">
                <span aria-hidden>{u.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-extrabold">
                  {u.name} <span className="text-muted-foreground">Lv {level}</span>
                </p>
                <p className="truncate text-sm text-muted-foreground">{u.desc}</p>
                <p className="text-sm font-bold text-accent">
                  now: {u.effect(level)} → next: {u.effect(level + 1)}
                </p>
              </div>
              <button
                disabled={!afford}
                onClick={() =>
                  persist({
                    ...save,
                    coins: save.coins - cost,
                    levels: { ...save.levels, [u.id]: level + 1 },
                  })
                }
                className="chunky shrink-0 rounded-xl border-2 border-border bg-gold px-4 py-2 font-extrabold text-gold-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                🪙 {cost}
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-4">
        <Btn tone="secondary" onClick={back}>
          ← Back
        </Btn>
      </div>
    </div>
  );
}

function Leaderboard({
  board,
  me,
  back,
}: {
  board: LeaderEntry[];
  me: string;
  back: () => void;
}) {
  return (
    <div className="w-full max-w-xl">
      <h2 className="mb-4 text-3xl font-extrabold text-gold">🏆 Deepest Dillos</h2>
      <div className="panel overflow-hidden p-2">
        {board.map((e, i) => (
          <div
            key={e.name + i}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
              e.name === me ? "bg-secondary" : ""
            }`}
          >
            <span className="w-8 font-pixel text-[10px] text-muted-foreground">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-lg font-extrabold">
              {e.name}
              {e.name === me && <span className="ml-2 text-sm text-accent">you</span>}
            </span>
            <span className="font-extrabold text-gem">⬇ {e.depth} m</span>
            <span className="w-24 text-right font-extrabold text-gold">🪙 {e.value}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        High scores only — no live runs shown.
      </p>
      <div className="mt-4">
        <Btn tone="secondary" onClick={back}>
          ← Back
        </Btn>
      </div>
    </div>
  );
}

function Result({
  result,
  save,
  again,
  menu,
  shop,
}: {
  result: RunResult;
  save: SaveData;
  again: () => void;
  menu: () => void;
  shop: () => void;
}) {
  const found = ORES.filter((o) => result.ores[o.id]);
  return (
    <div className="w-full max-w-md">
      <h2 className="mb-4 text-center text-4xl font-extrabold text-gold">Run over!</h2>
      <div className="panel space-y-4 p-6">
        <div className="flex justify-center gap-2">
          <Stat icon="⬇" label={`${result.depth} m`} />
          <Stat icon="🪙" label={`+${result.value}`} />
        </div>
        {found.length > 0 ? (
          <ul className="space-y-1">
            {found.map((o) => (
              <li key={o.id} className="flex items-center gap-2 text-base font-bold">
                <span
                  aria-hidden
                  className="size-4 rounded-sm border border-border"
                  style={{ background: o.colors[1] }}
                />
                <span className="flex-1">{o.name}</span>
                <span className="text-muted-foreground">×{result.ores[o.id]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-muted-foreground">No ore this time — dig on!</p>
        )}
        <p className="text-center text-sm text-muted-foreground">
          Best depth {save.bestDepth} m · {save.coins} coins banked
        </p>
        <Btn onClick={again}>▶ Launch again</Btn>
        <Btn tone="accent" onClick={shop}>
          🛠 Spend coins
        </Btn>
        <Btn tone="secondary" onClick={menu}>
          ← Main menu
        </Btn>
      </div>
    </div>
  );
}
