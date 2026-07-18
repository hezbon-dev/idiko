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

  "/audio/Tems Playlist  Healing.mp3",
 "/audio/ALTON ELLIS - 25th Silver Jubilee [1984 - Sky Note - Full Album].mp3",
 
  
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
  "sequential";