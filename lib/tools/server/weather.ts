import { asSchema, tool } from "ai";
import { z } from "zod";

export type WeatherData = {
  city: string;
  condition: string;
  tempC: number;
  humidity: number;
};

/** Maps Open-Meteo WMO weather codes to a short display condition. */
function wmoToCondition(code: number): string {
  if (code === 0 || code === 1) return "Clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "Rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Snow";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

export const weatherTool = tool({
  description: "Get current weather for a city",
  inputSchema: asSchema(
    z.object({
      city: z.string().describe("The city name to look up weather for"),
    }),
  ),
  async execute({ city }) {
    try {
      // Open-Meteo needs coordinates, so resolve the city name first.
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
      );
      if (!geoRes.ok) throw new Error(`geocoding failed (${geoRes.status})`);
      const geo = (await geoRes.json()) as {
        results?: Array<{
          name: string;
          country?: string;
          latitude: number;
          longitude: number;
        }>;
      };
      const place = geo.results?.[0];
      if (!place) throw new Error(`city "${city}" not found`);

      const wxRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`,
      );
      if (!wxRes.ok) throw new Error(`forecast failed (${wxRes.status})`);
      const wx = (await wxRes.json()) as {
        current?: {
          temperature_2m: number;
          relative_humidity_2m: number;
          weather_code: number;
        };
      };
      if (!wx.current) throw new Error("no current weather in response");

      return {
        city: place.country ? `${place.name}, ${place.country}` : place.name,
        condition: wmoToCondition(wx.current.weather_code),
        tempC: Math.round(wx.current.temperature_2m),
        humidity: wx.current.relative_humidity_2m,
      };
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : "weather lookup failed",
      );
    }
  },
});
