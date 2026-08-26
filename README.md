# Dillo Drift: Ore Odyssey

Build a high-quality 2D browser game called "Dillo Drift"

An armadillo launches like a cannonball into an infinite underground dirt cross-section (grass/sky strip on top, dirt below) and rolls, steering left/right to smash through dirt and collect ore clusters. Match the attached reference image's polished pixel-art style: shaded gems, textured dirt, clean linework — not flat placeholder shapes.

Ores: Copper, Stone, Iron, Gold, Diamond, Plasma, Cosmic, Chrome, Rainbow, Glitch, plus more invented tiers. Rarity blends by depth — shallow layers are mostly common ore with small chances of rarer finds; as depth increases, common ore's spawn chance drops sharply while rarer tiers become dominant, until at extreme depth common ore is a rare sight and higher tiers make up most spawns.

Mechanics:

Drag-to-aim/power slingshot launch from the surface

Physics-based rolling + left/right steering, momentum decays via a fuel/stamina meter

Destructible tile-based dirt, harder rock needs upgrades to break

Lava only, no enemies — damages HP and knocks back, never one-shots; run ends only when HP bar fully depletes

Infinite procedural terrain, no bottom

Upgrades (shell plating, speed spurs, magnet snout, better launcher, etc.) are infinitely purchasable with escalating cost/effect

Launch screen: dedicated Shop button (not forced post-run) showing each upgrade's level, next cost, and buy button.

Meta systems:

Username prompt on first launch

Main menu: Play, Leaderboard, Shop/Settings

Leaderboard always accessible, shows other players' usernames + high scores only (deepest depth/highest ore value) — no live run data

Save currency, upgrade levels, unlocks, username, and high score via localStorage

Readability (all ages): large high-contrast HP bar, small fading damage/collection popups ("-5 HP", "+3 Gold"), bold clear fonts, distinct bright colors per ore tier, simple icons paired with text (coin, heart, etc.)

Visual bar: match the reference image's fidelity exactly — shaded ore clusters, textured dirt with depth, digging particle effects, screen shake/impact feedback. Should look like a finished, indie game, not a prototype.

Tech: single-page HTML5 Canvas + vanilla JS, self-contained, localStorage for saves/leaderboard.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://dillo-drift.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/466b849c-578e-4a57-af7a-f81d611cc106).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
