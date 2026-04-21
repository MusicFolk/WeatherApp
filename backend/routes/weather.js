const express = require("express");
const axios = require("axios");

const router = express.Router();

function buildWeatherQuery(city, country) {
  return country ? `${city},${country}` : city;
}

function handleWeatherApiError(error, res) {
  if (error.response) {
    const status = error.response.status;
    const apiMessage =
      error.response.data?.error?.message || "Weather API error";
    return res.status(status === 400 ? 404 : 502).json({ error: apiMessage });
  }

  return res.status(502).json({ error: "Failed to fetch weather data" });
}

router.get("/weather", async (req, res) => {
  const { city, country } = req.query;

  if (!city) {
    return res
      .status(400)
      .json({ error: "Query parameter 'city' is required" });
  }

  if (!process.env.WEATHER_API_KEY) {
    return res.status(500).json({ error: "Weather API key is not configured" });
  }

  const q = buildWeatherQuery(city, country);

  try {
    const response = await axios.get(
      "https://api.weatherapi.com/v1/current.json",
      {
        params: {
          key: process.env.WEATHER_API_KEY,
          q,
        },
        timeout: 10000,
      },
    );

    const data = response.data;

    return res.json({
      location: {
        name: data.location.name,
        region: data.location.region,
        country: data.location.country,
        localtime: data.location.localtime,
      },
      weather: {
        temperatureC: data.current.temp_c,
        temperatureF: data.current.temp_f,
        condition: data.current.condition.text,
        icon: data.current.condition.icon,
        humidity: data.current.humidity,
        windKph: data.current.wind_kph,
      },
    });
  } catch (error) {
    return handleWeatherApiError(error, res);
  }
});

router.get("/weather/forecast", async (req, res) => {
  const { city, country, days } = req.query;

  if (!city) {
    return res
      .status(400)
      .json({ error: "Query parameter 'city' is required" });
  }

  if (!process.env.WEATHER_API_KEY) {
    return res.status(500).json({ error: "Weather API key is not configured" });
  }

  //this shit is hardcoded rn
  const daysParam = Number(days);
  if (!Number.isInteger(daysParam) || daysParam < 1 || daysParam > 10) {
    return res.status(400).json({
      error: "Query parameter 'days' must be an integer between 1 and 10",
    });
  }

  const q = buildWeatherQuery(city, country);

  try {
    const response = await axios.get(
      "https://api.weatherapi.com/v1/forecast.json",
      {
        params: {
          key: process.env.WEATHER_API_KEY,
          q,
          days: daysParam + 1,
        },
        timeout: 10000,
      },
    );

    const forecastDays = (response.data.forecast?.forecastday || []).slice(
      1,
      daysParam + 1,
    );

    return res.json({
      city: response.data.location?.name || city,
      days: forecastDays.map((day) => ({
        date: day.date,
        maxTempC: day.day.maxtemp_c,
        minTempC: day.day.mintemp_c,
        condition: day.day.condition.text,
        icon: day.day.condition.icon,
        chanceOfRain: day.day.daily_chance_of_rain,
      })),
    });
  } catch (error) {
    return handleWeatherApiError(error, res);
  }
});

module.exports = router;
