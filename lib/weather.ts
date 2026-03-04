type Forecast = {
  location: string;
  latitude: number;
  longitude: number;
  timezone: string;
  daily: { date: string; temp_max_c: number | null; temp_min_c: number | null; rain_mm: number | null }[];
};

export async function getForecast(location: string): Promise<Forecast | null> {
  const q = location.trim();
  if (!q) return null;

  // Geocoding
  const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geoUrl.searchParams.set("name", q);
  geoUrl.searchParams.set("count", "1");
  geoUrl.searchParams.set("language", "pt");
  geoUrl.searchParams.set("format", "json");

  const geoRes = await fetch(geoUrl.toString(), { cache: "no-store" });
  if (!geoRes.ok) return null;
  const geoJson: any = await geoRes.json();
  const g = geoJson?.results?.[0];
  if (!g) return null;

  const { latitude, longitude, timezone, name, admin1, country } = g;

  const fcUrl = new URL("https://api.open-meteo.com/v1/forecast");
  fcUrl.searchParams.set("latitude", String(latitude));
  fcUrl.searchParams.set("longitude", String(longitude));
  fcUrl.searchParams.set("timezone", timezone || "America/Sao_Paulo");
  fcUrl.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum");
  fcUrl.searchParams.set("forecast_days", "7");

  const fcRes = await fetch(fcUrl.toString(), { cache: "no-store" });
  if (!fcRes.ok) return null;
  const fcJson: any = await fcRes.json();

  const dates: string[] = fcJson?.daily?.time ?? [];
  const tmax: number[] = fcJson?.daily?.temperature_2m_max ?? [];
  const tmin: number[] = fcJson?.daily?.temperature_2m_min ?? [];
  const rain: number[] = fcJson?.daily?.precipitation_sum ?? [];

  return {
    location: [name, admin1, country].filter(Boolean).join(", "),
    latitude,
    longitude,
    timezone: fcJson?.timezone ?? timezone ?? "America/Sao_Paulo",
    daily: dates.map((d, i) => ({
      date: d,
      temp_max_c: typeof tmax[i] === "number" ? tmax[i] : null,
      temp_min_c: typeof tmin[i] === "number" ? tmin[i] : null,
      rain_mm: typeof rain[i] === "number" ? rain[i] : null,
    })),
  };
}

export function looksLikeWeatherQuestion(text: string) {
  const t = (text || "").toLowerCase();
  return /previs[aã]o|chuva|temperatura|vento|clima|frente fria/.test(t);
}
