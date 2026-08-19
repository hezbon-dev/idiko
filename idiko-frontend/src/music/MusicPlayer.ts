// ===========================================
// MUSIC PLAYER
// ===========================================

export default class MusicPlayer {

  private audio: HTMLAudioElement;

  constructor() {

    this.audio = new Audio();

    this.audio.preload = "auto";

  }

// ===========================
// LOAD A SONG
// ===========================

  load(src: string) {

    this.audio.src = src;

    this.audio.load();

  }

// ===========================
// PLAY
// ===========================

  async play() {

    try {

      await this.audio.play();

    } catch (err) {

      console.warn(
        "MusicPlayer play() failed:",
        err
      );

    }

  }

// ===========================
// PAUSE
// ===========================

  pause() {

    this.audio.pause();

  }

// ===========================
// STOP
// ===========================

stop() {

  this.audio.pause();

  this.audio.currentTime = 0;

}

// ===========================
// SET VOLUME
// ===========================

  setVolume(volume: number) {

    this.audio.volume = Math.min(
      Math.max(volume, 0),
      1
    );

  }


// ===========================
// CURRENT TIME
// ===========================

  getCurrentTime() {

    return this.audio.currentTime;

  }

  setCurrentTime(time: number) {

    this.audio.currentTime = time;

  }

// ===========================
// DURATION
// ===========================

  getDuration() {

    return this.audio.duration;

  }

// ===========================
// CURRENT VOLUME
// ===========================

getVolume() {

  return this.audio.volume;

}

// ===========================
// IS PAUSED
// ===========================

isPaused() {

  return this.audio.paused;

}

// ===========================
// HAS ENDED
// ===========================

isEnded() {

  return this.audio.ended;

}

// ===========================
// ON ENDED
// ===========================

setOnEnded(
  callback: () => void
) {

  this.audio.onended = callback;

}

// ===========================
// ON LOADED METADATA
// ===========================

setOnLoadedMetadata(
  callback: () => void
) {

  this.audio.onloadedmetadata =
    callback;

}

// ===========================
// AUDIO ELEMENT
// ===========================

  getAudio() {

    return this.audio;

  }

}