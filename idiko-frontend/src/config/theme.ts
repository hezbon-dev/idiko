// =========================
// WEBSITE BACKGROUND CONFIG
// =========================

export type BackgroundType =
  | "image"
  | "video";

export const BACKGROUND_TYPE: BackgroundType =
  "image";

// =========================
// IMAGE BACKGROUND
// =========================

export const WEBSITE_BACKGROUND =
  "/backgrounds/kenya-watermark.jpg";

// =========================
// VIDEO BACKGROUND
// =========================

export const WEBSITE_BACKGROUND_VIDEO =
  "/backgrounds/website background.mp4";

// =========================
// BACKGROUND MUSIC
// =========================

export const ENABLE_BACKGROUND_MUSIC = false;

// Playlist order

export const WEBSITE_PLAYLIST = [

"/audio/Nibebe - Nyota Ndogo ft Nonini.mp3",
"/audio/na wewe tu.mp3",
"/audio/Just A Band - Probably For Lovers.mp3",
"/audio/Just A Band - Huff  Puff.mp3",
"/audio/Just A Band - Hey! (from the Boxing Day Special).mp3",
"/audio/Be Your Fool - The Villagers Band.mp3",


];

// =========================
// PLAYBACK MODE
// =========================

// "sequential" = play songs in order
// "shuffle" = random song every time

export type PlaylistMode =
  | "sequential"
  | "shuffle";

export const PLAYLIST_MODE: PlaylistMode =
  "shuffle";