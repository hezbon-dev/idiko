import { useEffect, useRef } from "react";
import MusicEngine from "../music/MusicEngine";
import {ENABLE_BACKGROUND_MUSIC,WEBSITE_PLAYLIST,PLAYLIST_MODE,} from "../config/theme";

export default function BackgroundMusic() {

  const engineRef = useRef<MusicEngine | null>(null);

  useEffect(() => {

    if (!ENABLE_BACKGROUND_MUSIC) return;

    engineRef.current = new MusicEngine({

      playlist: WEBSITE_PLAYLIST,

      playbackMode: PLAYLIST_MODE,

    });

    const startMusic = () => {

      engineRef.current?.start();

    };

    window.addEventListener(
      "click",
      startMusic,
      { once: true }
    );

    return () => {

      window.removeEventListener(
        "click",
        startMusic
      );

      engineRef.current?.pause();

    };

  }, []);

  return null;

}