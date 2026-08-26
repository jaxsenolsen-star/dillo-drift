import { useEffect, useRef } from "react";
import { createGame, type RunResult } from "@/game/engine";
import type { SaveData } from "@/game/storage";

export function GameCanvas({
  save,
  onEnd,
  onQuit,
}: {
  save: SaveData;
  onEnd: (r: RunResult) => void;
  onQuit: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const endRef = useRef(onEnd);
  const quitRef = useRef(onQuit);
  endRef.current = onEnd;
  quitRef.current = onQuit;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const handle = createGame(canvas, {
      save,
      onEnd: (r) => endRef.current(r),
      onQuit: () => quitRef.current(),
    });
    return () => handle.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-background">
      <canvas ref={ref} className="h-full w-full touch-none select-none" />
      <button
        onClick={() => quitRef.current()}
        className="chunky absolute bottom-4 right-4 rounded-xl bg-secondary px-4 py-2 font-bold text-secondary-foreground"
      >
        Quit run
      </button>
    </div>
  );
}
