import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";

const INBOXES_API_PRIMARY = "https://inboxes.com/api/v2";
const INBOXES_API_SECONDARY = "https://api.inboxes.com/v2";

async function fetchWithRetry(url: string, options: RequestInit = {}) {
  let retries = 2; // Reduced retries per endpoint to fail faster and try secondary
  let baseDelay = 2000; // Increased base delay

  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          ...options.headers,
        }
      });
      clearTimeout(timeoutId);
      
      if (response.ok) return response;

      const retryableStatuses = [429, 403, 500, 502, 503, 504];
      if (!retryableStatuses.includes(response.status)) {
        console.error(`Non-retryable error fetching ${url}: ${response.status}`);
        return response;
      }

      const clonedResponse = response.clone();
      const bodyText = await clonedResponse.text();
      let delay = baseDelay * Math.pow(2, i);

      try {
        const json = JSON.parse(bodyText);
        if (json.message && json.message.includes("retry in")) {
          const match = json.message.match(/retry in (\d+) (minute|second)/);
          if (match) {
            const value = parseInt(match[1]);
            const unit = match[2];
            delay = Math.max(delay, value * (unit === "minute" ? 60000 : 1000));
          }
        }
      } catch (e) {}
      
      if (i === retries) return response;

      console.warn(`Rate limited or server error (${response.status}) for ${url}, retrying in ${delay}ms... (Attempt ${i+1}/${retries+1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      clearTimeout(timeoutId);
      if (i === retries) {
        console.error(`Final fetch failure for ${url}:`, error);
        throw error;
      }
      let delay = baseDelay * Math.pow(2, i);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Network error fetching ${url}, retrying in ${delay}ms... (Attempt ${i+1}/${retries+1}): ${errorMessage}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return null as unknown as Response;
}

async function fetchFromAny(path: string, options: RequestInit = {}) {
  try {
    return await fetchWithRetry(`${INBOXES_API_PRIMARY}${path}`, options);
  } catch (error) {
    console.warn(`Primary Inboxes API failed, trying secondary: ${INBOXES_API_SECONDARY}${path}`);
    return await fetchWithRetry(`${INBOXES_API_SECONDARY}${path}`, options);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Proxy for domains
  app.get("/api/tempmail/domains", async (req, res) => {
    console.log("GET /api/tempmail/domains request received");
    try {
      const response = await fetchFromAny("/domain");

      if (!response || !response.ok) {
        const errorResponse = response ? response.clone() : null;
        const errorBody = errorResponse ? await errorResponse.text() : "No response body";
        console.error("Inboxes API domains response not ok:", response ? response.status : "No response", errorBody);
        throw new Error("Failed to fetch from inboxes");
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch domains" });
    }
  });

  // Proxy for inbox
  app.get("/api/tempmail/inbox/:email", async (req, res) => {
    try {
      console.log("Fetching inbox for:", req.params.email);
      const path = `/inbox/${encodeURIComponent(req.params.email)}`;
      
      const response = await fetchFromAny(path);

      if (!response || !response.ok) {
        const errorResponse = response ? response.clone() : null;
        const errorBody = errorResponse ? await errorResponse.text() : "No response body";
        console.error("Inboxes API response not ok:", response ? response.status : "No response", errorBody);
        throw new Error("Failed to fetch from inboxes");
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch inbox" });
    }
  });

  // Proxy for message details
  app.get("/api/tempmail/message/:id", async (req, res) => {
    try {
      const path = `/message/${req.params.id}`;
      
      const response = await fetchFromAny(path);

      if (!response || !response.ok) {
        const errorResponse = response ? response.clone() : null;
        const errorBody = errorResponse ? await errorResponse.text() : "No response body";
        console.error("Inboxes API message details response not ok:", response ? response.status : "No response", errorBody);
        throw new Error("Failed to fetch from inboxes");
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch message details" });
    }
  });

  // Proxy for deleting message
  app.delete("/api/tempmail/message/:id", async (req, res) => {
    try {
      const response = await fetchFromAny(`/message/${req.params.id}`, {
        method: 'DELETE'
      });
      res.json({ success: response?.ok || false });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete message" });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
