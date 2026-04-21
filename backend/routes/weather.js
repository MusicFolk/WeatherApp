const express = require("express");
const axios = require("axios");

const router = express.Router();

router.get("/weather", async (req, res) => {
  const { city, country } = req.query;

  if (!city) {
    return res.status(400).json({ error: "Query parameter 'city' is required" });
  }

  if (!process.env.WEATHER_API_KEY) {
    return res.status(500).json({ error: "Weather API key is not configured" });
  }

  const q = country ? `${city},${country}` : city;

  try {
    const response = await axios.get("https://api.weatherapi.com/v1/current.json", {
      params: {
        key: process.env.WEATHER_API_KEY,
        q,
      },
      timeout: 10000,
    });

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
    if (error.response) {
      const status = error.response.status;
      const apiMessage = error.response.data?.error?.message || "Weather API error";
      return res.status(status === 400 ? 404 : 502).json({ error: apiMessage });
    }

    return res.status(502).json({ error: "Failed to fetch weather data" });
  }
});

module.exports = router;