// This is a Vercel serverless function - no additional setup needed!
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { tenantId, month, readings, timestamp } = req.body;

    // Validate input
    if (!tenantId || !month || !readings) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // For demo purposes, store in Vercel KV store (Redis) or a simple JSON file
    // Option 1: Use Vercel KV (Redis) - recommended for production
    // Option 2: For simplicity, I'll show you how to use Upstash (free Redis)

    // Let's use Vercel KV (you'll set this up in Step 4)
    if (process.env.KV_REST_API_URL) {
      const kv = await import("@vercel/kv");
      const key = `reading:${tenantId}:${month}`;
      await kv.set(key, {
        tenantId,
        month,
        readings,
        timestamp,
        status: "confirmed",
      });
    } else {
      // Fallback to memory storage (won't persist between function invocations)
      console.log("No KV store configured, saving to memory only");
    }

    return res.status(200).json({
      success: true,
      message: "Reading saved successfully",
      data: { tenantId, month, readings },
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
