/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialize Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }
  return aiClient;
}

// In-memory data store for local tracking (read/deleted states)
const deletedMessageIds: Record<string, Set<string | number>> = {};
const readMessageIds: Record<string, Set<string | number>> = {};

// Session and token caching for Guerrilla Mail
const guerrillaTokens: Record<string, { token: string; expiresAt: number }> = {};

async function getGuerrillaToken(login: string): Promise<string> {
  const cached = guerrillaTokens[login];
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const response = await fetch(`https://api.guerrillamail.com/ajax.php?f=set_email_user&email_user=${encodeURIComponent(login)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch token from Guerrilla Mail');
  }

  const data: any = await response.json();
  const token = data.sid_token;
  if (!token) {
    throw new Error('No sid_token returned from Guerrilla Mail');
  }

  guerrillaTokens[login] = {
    token,
    expiresAt: Date.now() + 45 * 60 * 1000
  };

  return token;
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Domain list
app.get('/api/domains', (req, res) => {
  res.json({
    success: true,
    domains: [
      'guerrillamail.com',
      'guerrillamail.info',
      'grr.la',
      'guerrillamail.biz',
      'guerrillamail.de',
      'guerrillamail.net',
      'guerrillamail.org',
      'guerrillamailblock.com',
      'pokemail.net',
      'sharklasers.com',
      'spam4.me'
    ]
  });
});

// Generate Mailbox
app.post('/api/generate', async (req, res) => {
  const { customName, customDomain } = req.body;

  try {
    let login = '';
    let domain = '';

    if (customName && customName.trim().length > 0) {
      login = customName.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
      if (login.length === 0) {
        login = Math.random().toString(36).substring(2, 10);
      }
    } else {
      login = Math.random().toString(36).substring(2, 11);
    }

    const domains = [
      'guerrillamail.com',
      'guerrillamail.info',
      'grr.la',
      'guerrillamail.biz',
      'guerrillamail.de',
      'guerrillamail.net',
      'guerrillamail.org',
      'guerrillamailblock.com',
      'pokemail.net',
      'sharklasers.com',
      'spam4.me'
    ];
    domain = customDomain && domains.includes(customDomain) ? customDomain : domains[0];
    const email = `${login}@${domain}`;

    // Register/initialize account on Guerrilla Mail to ensure it is active and retrieve token
    try {
      await getGuerrillaToken(login);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Không thể đăng ký hòm thư trên Guerrilla Mail: ' + err.message });
    }

    // Setup lists for real mailbox tracking
    deletedMessageIds[email] = new Set<string | number>();
    readMessageIds[email] = new Set<string | number>();

    return res.json({
      success: true,
      data: { email, login, domain, mode: 'real' }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Messages
app.get('/api/messages', async (req, res) => {
  const { email, login, domain } = req.query as { email: string; login: string; domain: string };

  if (!email || !login || !domain) {
    return res.status(400).json({ success: false, error: 'Missing required parameters' });
  }

  try {
    const deleted = deletedMessageIds[email] || new Set<string | number>();
    const read = readMessageIds[email] || new Set<string | number>();

    // Real API Mode with Guerrilla Mail
    const token = await getGuerrillaToken(login);
    const response = await fetch(`https://api.guerrillamail.com/ajax.php?f=get_email_list&offset=0&sid_token=${token}`);
    if (!response.ok) {
      throw new Error('Failed to fetch from Guerrilla Mail');
    }

    const data: any = await response.json();
    const list: any[] = data.list || [];
    const filtered = list
      .filter(msg => !deleted.has(msg.mail_id))
      .map(msg => {
        const fromStr = msg.mail_from;
        const senderName = msg.mail_from.split('@')[0] || msg.mail_from;
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random&color=fff&size=80`;

        return {
          id: msg.mail_id,
          from: fromStr,
          subject: msg.mail_subject,
          date: msg.mail_timestamp > 0 ? new Date(msg.mail_timestamp * 1000).toISOString() : new Date().toISOString(),
          isRead: msg.mail_read === 1 || read.has(msg.mail_id),
          senderName,
          avatarUrl
        };
      });

    return res.json({ success: true, data: filtered });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch messages' });
  }
});

// Get Message Detail
app.get('/api/message/:id', async (req, res) => {
  const { id } = req.params;
  const { email, login, domain } = req.query as { email: string; login: string; domain: string };

  if (!email || !login || !domain) {
    return res.status(400).json({ success: false, error: 'Missing required parameters' });
  }

  const isNumeric = /^\d+$/.test(id);
  const messageId = isNumeric ? parseInt(id, 10) : id;

  try {
    // Mark as read
    if (!readMessageIds[email]) {
      readMessageIds[email] = new Set<string | number>();
    }
    readMessageIds[email].add(messageId);

    const token = await getGuerrillaToken(login);
    const response = await fetch(`https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=${id}&sid_token=${token}`);
    if (!response.ok) {
      throw new Error('Failed to fetch message detail from Guerrilla Mail');
    }

    const msg: any = await response.json();
    
    const fromStr = msg.mail_from;
    const senderName = msg.mail_from.split('@')[0] || msg.mail_from;
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random&color=fff&size=80`;

    const detail = {
      id: msg.mail_id,
      from: fromStr,
      subject: msg.mail_subject,
      date: msg.mail_timestamp > 0 ? new Date(msg.mail_timestamp * 1000).toISOString() : new Date().toISOString(),
      isRead: true,
      senderName,
      avatarUrl,
      body: msg.mail_excerpt,
      textBody: msg.mail_excerpt,
      htmlBody: msg.mail_body || msg.mail_excerpt,
      attachments: []
    };

    return res.json({ success: true, data: detail });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch email detail' });
  }
});

// Delete Message
app.delete('/api/message/:id', async (req, res) => {
  const { id } = req.params;
  const { email } = req.query as { email: string };

  if (!email) {
    return res.status(400).json({ success: false, error: 'Missing email parameter' });
  }

  const isNumeric = /^\d+$/.test(id);
  const messageId = isNumeric ? parseInt(id, 10) : id;

  if (!deletedMessageIds[email]) {
    deletedMessageIds[email] = new Set<string | number>();
  }
  deletedMessageIds[email].add(messageId);

  // If it's a real email, delete it from Guerrilla Mail as well
  if (!email.endsWith('@gmail.com')) {
    try {
      const parts = email.split('@');
      if (parts.length === 2) {
        const login = parts[0];
        const token = await getGuerrillaToken(login);
        await fetch(`https://api.guerrillamail.com/ajax.php?f=del_email&email_ids[]=${id}&sid_token=${token}`);
      }
    } catch (e) {
      // ignore
    }
  }

  res.json({ success: true, message: 'Message deleted successfully' });
});



// Configure Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
