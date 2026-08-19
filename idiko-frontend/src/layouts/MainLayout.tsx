// src/layouts/MainLayout.tsx

import { Outlet } from "react-router-dom";
import BackgroundMusic from "../components/BackgroundMusic";
import {BACKGROUND_TYPE,WEBSITE_BACKGROUND,WEBSITE_BACKGROUND_VIDEO,} from "../config/theme";

export default function MainLayout() {

// =========================
// LAYOUT
// =========================

  const layoutStyle: React.CSSProperties = {

    minHeight: "100vh",

    backgroundColor: "black",

    color: "white",

    display: "flex",

    justifyContent: "center",

    alignItems: "center",

    position: "relative",

    overflow: "hidden",

  };

  return (

    <div style={layoutStyle}>

      {/* =========================
           IMAGE BACKGROUND
      ========================== */}

      {BACKGROUND_TYPE === "image" && (

        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `
              linear-gradient(
                rgba(0,0,0,0.55),
                rgba(0,0,0,0.55)
              ),
              url('${WEBSITE_BACKGROUND}')
            `,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "cover",
            zIndex: 0,
          }}
        />

      )}

      {/* =========================
           VIDEO BACKGROUND
      ========================== */}

      {BACKGROUND_TYPE === "video" && (

        <>

          <video
            autoPlay
            muted
            loop
            playsInline
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 0,
            }}
          >

            <source
              src={WEBSITE_BACKGROUND_VIDEO}
              type="video/mp4"
            />

          </video>

          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "rgba(0,0,0,0.55)",
              zIndex: 1,
            }}
          />

        </>

      )}

      {/* =========================
           BACKGROUND MUSIC
      ========================== */}

    
       <BackgroundMusic />

      {/* =========================
           WEBSITE CONTENT
      ========================== */}

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
        }}
      >

        <Outlet />

      </div>

    </div>

  );

}