import type { ThemeId } from "./types";

/** Colours used inside the 3D scene for each theme. UI colours live in globals.css. */
export interface SceneTheme {
  label: string;
  wall: string;
  trim: string;
  floor: string;
  ceiling: string;
  light: string;
  ambient: number;
  sky: string;
  frame: string;
  swatch: [string, string];
}

export const SCENE_THEMES: Record<ThemeId, SceneTheme> = {
  classic: {
    label: "Classic White Gallery",
    wall: "#f6f3ee",
    trim: "#e4ddd3",
    floor: "#d9d2c8",
    ceiling: "#fbfaf7",
    light: "#fff6ea",
    ambient: 0.55,
    sky: "#f3efe9",
    frame: "#b8924a",
    swatch: ["#f6f3ee", "#b8924a"],
  },
  blush: {
    label: "Blush Pink",
    wall: "#f6dfe3",
    trim: "#e9c3cb",
    floor: "#e6d4d0",
    ceiling: "#fdf3f4",
    light: "#fff0f0",
    ambient: 0.55,
    sky: "#f8e8eb",
    frame: "#b8924a",
    swatch: ["#f6dfe3", "#c25a7c"],
  },
  midnight: {
    label: "Midnight",
    wall: "#232238",
    trim: "#2f2d48",
    floor: "#14131f",
    ceiling: "#1b1a2b",
    light: "#ffe2b8",
    ambient: 0.25,
    sky: "#0f0e18",
    frame: "#c9a35a",
    swatch: ["#232238", "#c9a35a"],
  },
};
