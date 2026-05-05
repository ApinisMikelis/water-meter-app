export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { tenantId, month } = req.query;

    // In production, you'd fetch from your database
    // For now, return sample data or fetch from KV store

    if (process.env.KV_REST_API_URL) {
      const kv = await import("@vercel/kv");

      if (tenantId && month) {
        const reading = await kv.get(`reading:${tenantId}:${month}`);
        return res.status(200).json(reading || null);
      } else {
        // Get all readings (you'd need to maintain a list of keys)
        const keys = await kv.keys("reading:*");
        const readings = await Promise.all(keys.map((key) => kv.get(key)));
        return res.status(200).json(readings);
      }
    }

    return res.status(200).json([]);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
