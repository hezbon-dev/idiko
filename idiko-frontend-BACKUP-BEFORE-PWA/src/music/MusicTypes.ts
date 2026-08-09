// ===========================================
// MUSIC ENGINE TYPES
// ===========================================

export type PlaybackMode =
  | "sequential"
  | "shuffle";

export interface MusicState {

  currentTrack: number;

  currentTime: number;

  isPlaying: boolean;

}

export interface MusicPlayerOptions {

  playlist: string[];

  playbackMode: PlaybackMode;

}

export interface SavedMusicState {

  track: number;

  position: number;

}