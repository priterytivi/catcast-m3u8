import express from "express";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/catcast/live.m3u8", async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).send("Missing id");

  try {
    // giả lập trình duyệt
    const api = `https://api.catcast.tv/api/channels/${id}/streams`;
    const r = await axios.get(api, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://catcast.tv/"
      }
    });

    const streams = r.data?.streams || [];
    const hls = streams.find(s => s.url && s.url.includes(".m3u8"));

    if (!hls) return res.status(404).send("Stream offline");

    // 🚀 QUAN TRỌNG: redirect HLS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.redirect(hls.url);

  } catch (e) {
    res.status(500).send("Error get m3u8");
  }
});

app.listen(PORT, () => {
  console.log("Running on", PORT);
});
