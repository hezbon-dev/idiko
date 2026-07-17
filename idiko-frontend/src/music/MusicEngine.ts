// ===========================================
// MUSIC ENGINE
// ===========================================

import MusicPlayer from "./MusicPlayer";
import type { SavedMusicState } from "./MusicTypes";
import { loadMusicState, saveMusicState } from "./MusicStorage";
import type {PlaybackMode,MusicPlayerOptions,} from "./MusicTypes";

export default class MusicEngine {

  private playerA: MusicPlayer;
  private playerB: MusicPlayer;
  private activePlayer: "A" | "B" = "A";

// ===========================
// CROSSFADE SETTINGS
// ===========================

private readonly CROSSFADE_SECONDS = 15;


  private playlist: string[];
  private playbackMode: PlaybackMode;
  private currentTrack: number;
  private musicStarted = false;
  private state: SavedMusicState;

  constructor(
    options: MusicPlayerOptions
  ) {

    this.playerA = new MusicPlayer();

    this.playerB = new MusicPlayer();

    this.playlist = options.playlist;

    this.playbackMode =
      options.playbackMode;

    this.state =
      loadMusicState();

    this.currentTrack =
      this.state.track;

  }

// ===========================
// HAS MUSIC STARTED
// ===========================

hasStarted() {

  return this.musicStarted;

}

// ===========================
// START MUSIC
// ===========================

async start() {

  if (this.musicStarted) {

    return;

  }

  this.musicStarted = true;

  this.loadCurrentSong();

  this.preloadNextTrack();

  this.play();

}

  // ===========================
  // CURRENT TRACK
  // ===========================

  getCurrentTrack() {

    return this.currentTrack;

  }

  // ===========================
  // LOAD CURRENT SONG
  // ===========================

loadCurrentSong() {

  const player =
    this.getCurrentPlayer();

  player.load(
    this.playlist[
      this.currentTrack
    ]
  );

player.setOnLoadedMetadata(() => {

  this.restorePlaybackPosition();

});

}

  // ===========================
  // PLAY
  // ===========================

  play() {

    this.getCurrentPlayer().play();

    this.startSavingPlayback();

    this.startTransitionWatcher();

  }

  // ===========================
  // PAUSE
  // ===========================

  pause() {

    this.savePlayback();

     this.getCurrentPlayer().pause();

  }


// ===========================
// IS PLAYING
// ===========================

isPlaying() {

  return !this.getCurrentPlayer().isPaused();

}

  // ===========================
  // SAVE PLAYBACK
  // ===========================

savePlayback() {

  this.state.track =
    this.currentTrack;

  this.state.position =
   this.getCurrentPlayer().getCurrentTime();

  saveMusicState(
    this.state
  );

}

// ===========================
// SAVE PLAYBACK POSITION
// ===========================

savePlaybackPosition() {

  this.state.position =
   this.getCurrentPlayer().getCurrentTime();

  saveMusicState(
    this.state
  );

}

// ===========================
// RESTORE PLAYBACK POSITION
// ===========================

restorePlaybackPosition() {

this.getCurrentPlayer().setCurrentTime(
  this.state.position
);

}

// ===========================
// RESET PLAYBACK POSITION
// ===========================

resetPlaybackPosition() {

  this.state.position =
    0;

  saveMusicState(
    this.state
  );

}

  // ===========================
  // NEXT TRACK
  // ===========================

  nextTrack() {

    if (
      this.playbackMode ===
      "shuffle"
    ) {

      let next =
        this.currentTrack;

      while (
        next === this.currentTrack &&
        this.playlist.length > 1
      ) {

        next = Math.floor(

          Math.random() *

          this.playlist.length

        );

      }

      this.currentTrack = next;

    }

    else {

      this.currentTrack =

        (this.currentTrack + 1) %

        this.playlist.length;

    }

this.state.track =
  this.currentTrack;

this.state.position =
  0;

saveMusicState(
  this.state
);

  }

// ===========================
// PRELOAD NEXT TRACK
// ===========================

private preloadNextTrack() {

  const idlePlayer =
    this.getIdlePlayer();

  let nextTrack =
    this.currentTrack;

  if (this.playbackMode === "shuffle") {

    while (
      nextTrack === this.currentTrack &&
      this.playlist.length > 1
    ) {

      nextTrack = Math.floor(
        Math.random() *
        this.playlist.length
      );

    }

  }

  else {

    nextTrack =
      (this.currentTrack + 1) %
      this.playlist.length;

  }

  idlePlayer.load(
    this.playlist[nextTrack]
  );

  idlePlayer.setVolume(0);

}

// ===========================
// SWAP PLAYERS
// ===========================

private swapPlayers() {

  this.activePlayer =
    this.activePlayer === "A"
      ? "B"
      : "A";

}

// ===========================
// START NEXT PLAYER
// ===========================

private startNextPlayer() {

  const nextPlayer =
    this.getIdlePlayer();

  // No fade yet.
  // Play at full volume.

  nextPlayer.setVolume(1);

  nextPlayer.play();

}

// ===========================
// STOP PREVIOUS PLAYER
// ===========================

private stopPreviousPlayer() {

  this.getCurrentPlayer().stop();

}

// ===========================
// AUTO SAVE PLAYBACK
// ===========================

private playbackInterval?: number;

private transitionInterval?: number;

private startSavingPlayback() {

  if (this.playbackInterval) {

    clearInterval(this.playbackInterval);

  }

  this.playbackInterval = window.setInterval(() => {

    this.savePlaybackPosition();

  }, 1000);

}

// ===========================
// TRANSITION WATCHER
// ===========================

private startTransitionWatcher() {

  if (this.transitionInterval) {

    clearInterval(this.transitionInterval);

  }

  this.transitionInterval = window.setInterval(() => {

    const player = this.getCurrentPlayer();

    const remaining =

      player.getDuration() -

      player.getCurrentTime();

    // For now...

if (remaining <= this.CROSSFADE_SECONDS) {

    clearInterval(this.transitionInterval);

    this.beginCrossfade();

}

  }, 250);

}

// ===========================
// CURRENT PLAYER
// ===========================

private getCurrentPlayer(): MusicPlayer {

  return this.activePlayer === "A"
    ? this.playerA
    : this.playerB;

}

// ===========================
// BEGIN CROSSFADE
// ===========================

private beginCrossfade() {

  this.startNextPlayer();

  window.setTimeout(() => {

    this.stopPreviousPlayer();

    this.swapPlayers();

    this.nextTrack();

    this.preloadNextTrack();

    this.startTransitionWatcher();

  }, this.CROSSFADE_SECONDS * 1000);

}

// ===========================
// IDLE PLAYER
// ===========================

private getIdlePlayer(): MusicPlayer {

  return this.activePlayer === "A"
    ? this.playerB
    : this.playerA;

}

  // ===========================
  // PLAYER
  // ===========================

  getPlayer() {

    return this.getCurrentPlayer();
  }

}