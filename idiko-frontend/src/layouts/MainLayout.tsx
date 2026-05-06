// src/layouts/MainLayout.tsx
import { Outlet } from "react-router-dom";

export default function MainLayout() {
  const layoutStyle: React.CSSProperties = {
    minHeight: "100vh",
    backgroundColor: "black",
    color: "white",

    /* 🇰🇪 GLOBAL WATERMARK BACKGROUND */
    backgroundImage:
      "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('/kenya-watermark.jpg')",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundSize: "cover",

    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  return (
    <div style={layoutStyle}>
      <Outlet />
    </div>
  );
}
