// ===========================================
// MUSIC STORAGE
// ===========================================

import type{ SavedMusicState } from "./MusicTypes";

const STORAGE_KEY = "backgroundMusicState";

export function loadMusicState(): SavedMusicState {

  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {

    return {
      track: 0,
      position: 0,
    };

  }

  try {

    return JSON.parse(saved);

  } catch {

    return {
      track: 0,
      position: 0,
    };

  }

}

export function saveMusicState(
  state: SavedMusicState
) {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );

}

export function clearMusicState() {

  localStorage.removeItem(STORAGE_KEY);

}