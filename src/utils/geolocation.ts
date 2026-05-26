export interface GeolocationInfo {
  ip: string;
  location: string;
  userAgent: string;
}

export async function getGeolocationInfo(): Promise<GeolocationInfo> {
  let ip = "127.0.0.1";
  let location = "Local Sandbox";
  const userAgent = navigator.userAgent;

  try {
    // Try to get public IP
    const ipRes = await fetch("https://api.ipify.org?format=json");
    if (ipRes.ok) {
      const ipData = await ipRes.json();
      ip = ipData.ip;

      // Try to get geolocation from IP
      const locRes = await fetch(`https://ipapi.co/${ip}/json/`);
      if (locRes.ok) {
        const locData = await locRes.json();
        if (locData.city && locData.country_name) {
          location = `${locData.city}, ${locData.region || ""}, ${locData.country_name}`;
        } else if (locData.country_name) {
          location = locData.country_name;
        }
      }
    }
  } catch (err) {
    console.error("Error fetching IP geolocation, falling back to navigator", err);
    
    // Fallback: Try browser geolocation if API fails
    if ("geolocation" in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
        });
        location = `Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)}`;
      } catch (geoErr) {
        console.error("Browser geolocation failed or was denied", geoErr);
      }
    }
  }

  return { ip, location, userAgent };
}
