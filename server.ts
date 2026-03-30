import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Fetch nearby MeeSeva centers using Google Places API
  app.get("/api/places", async (req, res) => {
    const { lat, lng } = req.query;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GOOGLE_MAPS_API_KEY is not configured on the server." });
    }

    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude are required." });
    }

    try {
      // Google Places Nearby Search API
      // https://developers.google.com/maps/documentation/places/web-service/search-nearby
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json`,
        {
          params: {
            location: `${lat},${lng}`,
            radius: 5000,
            keyword: "MeeSeva center",
            key: apiKey,
          },
        }
      );

      if (response.status === 429) {
        return res.status(429).json({ error: "Too many requests. Please try again later." });
      }

      if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
        console.error("Google Maps API Error:", response.data);
        return res.status(500).json({ error: response.data.error_message || "Unable to fetch MeeSeva centers. Try again later." });
      }

      const results = (response.data.results || []).map((place: any) => ({
        id: place.place_id,
        name: place.name,
        address: place.vicinity,
        rating: place.rating || "N/A",
        coordinates: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        },
      }));

      res.json(results);
    } catch (error: any) {
      console.error("Error fetching places:", error.response?.data || error.message);
      
      if (error.response?.status === 429) {
        return res.status(429).json({ error: "Too many requests. Please try again later." });
      }

      res.status(500).json({ error: "Unable to fetch MeeSeva centers. Try again later." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
