import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";

const INBOXES_API_PRIMARY = "https://inboxes.com/api/v2";
const INBOXES_API_SECONDARY = "https://api.inboxes.com/v2";
const MAILTM_API = "https://api.mail.tm";

// Cached domains to provide even if APIs fail
let cachedInboxesDomains: any[] = [];
let cachedMailtmDomains: any[] = [];

async function fetchWithRetry(url: string, options: RequestInit = {}) {
  let retries = 2;
  let baseDelay = 1000;

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0'
  ];

  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // Increased timeout to 20s

    try {
      const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
      console.log(`[Proxy] Fetching ${url} (Attempt ${i + 1}) with UA: ${ua.substring(0, 30)}...`);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': ua,
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://inboxes.com/',
          'Origin': 'https://inboxes.com',
          ...options.headers,
        }
      });
      clearTimeout(timeoutId);
      
      if (response.ok) return response;

      if (response.status === 404) return response;

      const retryableStatuses = [429, 403, 500, 502, 503, 504];
      if (!retryableStatuses.includes(response.status)) {
        return response;
      }

      let delay = baseDelay * Math.pow(2, i);
      if (i === retries) return response;

      console.warn(`Retryable error (${response.status}) for ${url}, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      clearTimeout(timeoutId);
      if (i === retries) throw error;
      let delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return null as unknown as Response;
}

async function fetchFromInboxes(path: string, options: RequestInit = {}) {
  try {
    const res = await fetchWithRetry(`${INBOXES_API_PRIMARY}${path}`, options);
    if (res.ok) return res;
    throw new Error(`Primary failed with ${res.status}`);
  } catch (error) {
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
    let allDomains: any[] = [];
    
    // Try Inboxes.com
    try {
      const response = await fetchFromInboxes("/domain");
      if (response && response.ok) {
        const data = await response.json();
        if (data.domains) {
          const formatted = data.domains.map((d: any) => ({ ...d, provider: 'inboxes' }));
          cachedInboxesDomains = formatted;
          allDomains = [...allDomains, ...formatted];
        }
      }
    } catch (error) {
      console.error("Failed to fetch Inboxes domains", error);
      if (cachedInboxesDomains.length > 0) {
        allDomains = [...allDomains, ...cachedInboxesDomains];
      } else {
        // Hardcoded fallback domains for Inboxes
        const fallbacks = ["getnada.com", "dropjar.com", "inboxbear.com", "robot-mail.com", "tafmail.com", "tupmail.com", "vomoto.com"]
          .map(d => ({ qdn: d, provider: 'inboxes' }));
        allDomains = [...allDomains, ...fallbacks];
      }
    }

    // Try Mail.tm
    try {
      const response = await fetchWithRetry(`${MAILTM_API}/domains`);
      if (response && response.ok) {
        const data = await response.json();
        const domains = data['hydra:member'] || [];
        const formatted = domains.map((d: any) => ({ qdn: d.domain, provider: 'mailtm' }));
        cachedMailtmDomains = formatted;
        allDomains = [...allDomains, ...formatted];
      }
    } catch (error) {
      console.error("Failed to fetch Mail.tm domains", error);
      if (cachedMailtmDomains.length > 0) {
        allDomains = [...allDomains, ...cachedMailtmDomains];
      }
    }

    // Remove duplicates
    const unique = Array.from(new Map(allDomains.map(item => [item.qdn, item])).values());
    res.json({ domains: unique });
  });

  // Proxy for inbox
  app.get("/api/tempmail/inbox/:email", async (req, res) => {
    const email = req.params.email;
    const domain = email.split('@')[1];
    
    if (!domain) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    
    console.log(`Fetching inbox for: ${email} (Domain: ${domain})`);

    let mailtmResults: any[] = [];
    let mailtmError = "";

    // Check if it's a Mail.tm domain
    const isMailtm = cachedMailtmDomains.some(d => d.qdn === domain) || domain === 'web-library.net';
    
    if (isMailtm) {
      try {
        const password = "TempPass123!@#";
        
        // 1. Try to get token
        let tokenRes = await fetchWithRetry(`${MAILTM_API}/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: email, password })
        });

        // 2. If token failed (account might not exist), create it
        if (!tokenRes.ok) {
          const createRes = await fetchWithRetry(`${MAILTM_API}/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: email, password })
          });
          
          if (createRes.ok || createRes.status === 400) {
            tokenRes = await fetchWithRetry(`${MAILTM_API}/token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ address: email, password })
            });
          }
        }

        if (tokenRes.ok) {
          const { token } = await tokenRes.json();
          const msgsRes = await fetchWithRetry(`${MAILTM_API}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (msgsRes.ok) {
            const data = await msgsRes.json();
            mailtmResults = (data['hydra:member'] || []).map((m: any) => ({
              uid: m.id,
              f: m.from.address,
              s: m.subject,
              cr: m.createdAt,
              provider: 'mailtm'
            }));
            return res.json({ msgs: mailtmResults });
          } else {
            mailtmError = `Messages fetch failed: ${msgsRes.status}`;
          }
        } else {
          mailtmError = `Auth failed: ${tokenRes.status}`;
        }
      } catch (error) {
        console.error("Mail.tm inbox failed", error);
        mailtmError = error instanceof Error ? error.message : String(error);
      }
      
      return res.status(500).json({
        error: "Failed to fetch Mail.tm inbox",
        details: mailtmError
      });
    }

    // Default to Inboxes.com
    try {
      const response = await fetchFromInboxes(`/inbox/${encodeURIComponent(email)}`);
      if (response && response.ok) {
        const data = await response.json();
        return res.json(data);
      }
      
      const errorText = response ? await response.text() : "No response";
      console.error(`Inboxes.com failed: ${response?.status} - ${errorText}`);
      
      // If we are here, it means both failed or Inboxes failed for a non-Mailtm domain
      res.status(500).json({ 
        error: "Failed to fetch inbox from all providers",
        details: {
          isMailtm,
          mailtmError,
          inboxesStatus: response?.status
        }
      });
    } catch (error) {
      console.error("Inboxes fetch error:", error);
      res.status(500).json({ 
        error: "Critical failure in proxy server",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Proxy for message details
  app.get("/api/tempmail/message/:id", async (req, res) => {
    const id = req.params.id;
    const email = req.query.email as string;
    
    // 1. Try Inboxes.com
    try {
      const response = await fetchFromInboxes(`/message/${id}`);
      if (response && response.ok) {
        const data = await response.json();
        return res.json(data);
      }
    } catch (error) {}

    // 2. Try Mail.tm if we have email to re-auth
    if (email) {
      try {
        const password = "TempPass123!@#";
        let tokenRes = await fetchWithRetry(`${MAILTM_API}/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: email, password })
        });

        if (tokenRes.ok) {
          const { token } = await tokenRes.json();
          const msgRes = await fetchWithRetry(`${MAILTM_API}/messages/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (msgRes.ok) {
            const m = await msgRes.json();
            return res.json({
              uid: m.id,
              f: m.from.address,
              s: m.subject,
              cr: m.createdAt,
              html: m.html ? m.html[0] : "",
              text: m.text,
              provider: 'mailtm'
            });
          }
        }
      } catch (error) {
        console.error("Mail.tm message details failed", error);
      }
    }
    
    res.status(404).json({ error: "Message not found" });
  });

  // Proxy for deleting message
  app.delete("/api/tempmail/message/:id", async (req, res) => {
    try {
      const response = await fetchFromInboxes(`/message/${req.params.id}`, {
        method: 'DELETE'
      });
      res.json({ success: response?.ok || false });
    } catch (error) {
      res.json({ success: false });
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
