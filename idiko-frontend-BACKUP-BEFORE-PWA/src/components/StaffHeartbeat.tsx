import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { StorageService } from "../Services/StorageService";

export default function StaffHeartbeat() {

  const { user, isAuthenticated } = useAuth();

  useEffect(() => {

    if (
      !isAuthenticated ||
      user !== "staff"
    ) {
      return;
    }

    let interval: ReturnType<typeof setInterval>;

    const startHeartbeat = async () => {

      const staff =
        await StorageService.get("currentStaff");

      const sessionId =
        await StorageService.get("sessionId");

      const token =
        await StorageService.get("staffToken");

      if (
        !staff ||
        !sessionId ||
        !token
      ) {
        return;
      }

      const sendHeartbeat =
        async () => {

          try {

            await fetch(
              "https://idiko.onrender.com/staff/heartbeat",
              {
                method: "POST",

                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },

                body: JSON.stringify({
                  sessionId,
                  staffId: staff.id,
                  stationName:
                    staff.stationName || "",
                }),
              }
            );

          } catch (err) {

            console.error(
              "Heartbeat error",
              err
            );

          }

        };

      await sendHeartbeat();

      interval =
        setInterval(
          sendHeartbeat,
          10000
        );

    };

    startHeartbeat();

    return () => {

      if (interval) {

        clearInterval(interval);

      }

    };

  }, [
    isAuthenticated,
    user,
  ]);

  return null;

}