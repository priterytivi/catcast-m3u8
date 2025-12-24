import express from "express";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * STEP 1: lấy m3u8 gốc
 */
async function getCatcastM3U8(id) {
  const api = `https://api.catcast.tv/api/channels/${id}/streams`;
  const r = await axios.get(api, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Referer": "https://catcast.tv/"
    }
  });

  const streams = r.data?.streams || [];
  const hls = streams.find(s => s.url && s.url.includes(".m3u8"));
  if (!hls) return null;

  return hls.url;
}

/**
 * STEP 2: proxy m3u8
 */
app.get("/catcast/live.m3u8", async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).send("Missing id");

  try {
    const m3u8Url = await getCatcastM3U8(id);
    if (!m3u8Url) return res.status(404).send("Stream offline");

    const r = await axios.get(m3u8Url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://catcast.tv/"
      }
    });

    // rewrite segment URL
    const base = m3u8Url.substring(0, m3u8Url.lastIndexOf("/") + 1);
    const body = r.data.replace(
      /(.*\.ts|.*\.m4s|.*\.key)/g,
      (m) => `/catcast/segment?url=${encodeURIComponent(base + m)}`
    );

    res.set({
      "Content-Type": "application/x-mpegURL",
      "Access-Control-Allow-Origin": "*"
    });

    res.send(body);

  } catch (e) {
    res.status(500).send("Failed to proxy m3u8");
  }
});

/**
 * STEP 3: proxy segment (.ts)
 */
app.get("/catcast/segment", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.sendStatus(400);

  try {
    const r = await axios.get(url, {
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://catcast.tv/"
      }
    });

    res.set({
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "video/mp2t"
    });

    r.data.pipe(res);

  } catch {
    res.sendStatus(403);
  }
});

app.listen(PORT, () => {
  console.log("HLS proxy running on", PORT);
});
