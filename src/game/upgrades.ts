export type Upgrade = {
  id: string;
  name: string;
  icon: string;
  desc: string;
  cost: number;
  growth: number;
  effect: (level: number) => string;
};

export const UPGRADES: Upgrade[] = [
  {
    id: "launcher",
    name: "Cannon Launcher",
    icon: "🎯",
    desc: "More launch power off the surface.",
    cost: 40,
    growth: 1.32,
    effect: (l) => `+${l * 8}% power`,
  },
  {
    id: "plating",
    name: "Shell Plating",
    icon: "🛡️",
    desc: "More max HP and less lava damage.",
    cost: 60,
    growth: 1.34,
    effect: (l) => `${100 + l * 20} max HP`,
  },
  {
    id: "spurs",
    name: "Speed Spurs",
    icon: "💨",
    desc: "Faster rolling and sharper steering.",
    cost: 55,
    growth: 1.31,
    effect: (l) => `+${l * 6}% speed & steer`,
  },
  {
    id: "stamina",
    name: "Stamina Tank",
    icon: "🔋",
    desc: "Bigger fuel meter, slower burn.",
    cost: 50,
    growth: 1.3,
    effect: (l) => `+${l * 15}% fuel`,
  },
  {
    id: "drill",
    name: "Drill Snout",
    icon: "⛏️",
    desc: "Break harder rock and tougher ore.",
    cost: 120,
    growth: 1.55,
    effect: (l) => `dig tier ${l}`,
  },
  {
    id: "magnet",
    name: "Magnet Snout",
    icon: "🧲",
    desc: "Vacuum up nearby loose ore.",
    cost: 70,
    growth: 1.33,
    effect: (l) => `${(l * 0.9).toFixed(1)} tile pull`,
  },
  {
    id: "fortune",
    name: "Fortune Charm",
    icon: "🍀",
    desc: "Every ore is worth more coins.",
    cost: 90,
    growth: 1.38,
    effect: (l) => `+${l * 10}% value`,
  },
  {
    id: "coolant",
    name: "Lava Coolant",
    icon: "❄️",
    desc: "Shorter burn and faster recovery in lava.",
    cost: 80,
    growth: 1.36,
    effect: (l) => `-${Math.round((1 - Math.pow(0.9, l)) * 100)}% burn`,
  },
];

export function upgradeCost(u: Upgrade, level: number) {
  return Math.round(u.cost * Math.pow(u.growth, level));
}
