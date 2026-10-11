// Shared helpers for the American Consumer pipeline (scripts/consumidor/*): paths, JSON files, fetch with a time limit and
// retries, secret redaction, and the SEC's fair-access fetcher.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const p = (rel) => join(ROOT, rel);
export const TOOLS = 'tools/consumidor/';
export const RAW = 'tools/consumidor/raw/';
export const SITE = 'site/consumidor/';

export const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
export const BOT_UA = 'fnam-debt-monitor-bot/1.0';
// The SEC asks automated clients for a descriptive User-Agent with a contact; the repository variable carries it.
export const SEC_UA = process.env.EDGAR_USER_AGENT || 'fnam.mx american-consumer (contact via repository)';

export function readJson(rel, fallback = null) {
  try { return JSON.parse(readFileSync(p(rel), 'utf8')); } catch { return fallback; }
}
export function writeJson(rel, obj) {
  mkdirSync(dirname(p(rel)), { recursive: true });
  writeFileSync(p(rel), JSON.stringify(obj, null, 1) + '\n', 'utf8');
}
export function writeText(rel, text) {
  mkdirSync(dirname(p(rel)), { recursive: true });
  writeFileSync(p(rel), text, 'utf8');
}
export function readText(rel, fallback = null) {
  try { return readFileSync(p(rel), 'utf8'); } catch { return fallback; }
}
export const exists = (rel) => existsSync(p(rel));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// API keys never reach a committed file: every value registered here is removed from whatever is written.
const SECRETS = new Set();
export function secret(name) {
  const v = process.env[name] || '';
  if (v) SECRETS.add(v);
  return v;
}
export function redact(s) {
  let out = String(s);
  for (const v of SECRETS) if (v.length >= 6) out = out.split(v).join('***');
  return out;
}

// fetch with a hard time limit; retries on network errors, 429 and 5xx (a 403/404 is an answer, not retried).
export async function get(url, { ua = BROWSER_UA, headers = {}, method = 'GET', body = null, timeoutMs = 60_000, tries = 3, accept = '*/*' } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method, body, headers: { 'User-Agent': ua, Accept: accept, 'Accept-Language': 'en-US,en;q=0.9', ...headers }, signal: ctrl.signal, redirect: 'follow' });
      if (res.ok) return res;
      last = new Error(`HTTP ${res.status} ${redact(url)}`);
      last.status = res.status;
      if (res.status !== 429 && res.status < 500) break;
    } catch (e) {
      last = new Error(`${e && e.name === 'AbortError' ? `timed out after ${timeoutMs / 1000}s` : (e && e.message) || e} ${redact(url)}`);
    } finally { clearTimeout(timer); }
    await sleep(1500 * (i + 1));
  }
  throw last;
}
export async function getJson(url, opts) { return (await get(url, { accept: 'application/json', ...opts })).json(); }
export async function getText(url, opts) { return (await get(url, opts)).text(); }
export async function getBuffer(url, opts) { return Buffer.from(await (await get(url, opts)).arrayBuffer()); }

// SEC fair access: far below 10 requests a second.
export async function secGet(url, kind = 'text') {
  const res = await get(url, { ua: SEC_UA, accept: kind === 'json' ? 'application/json' : 'text/html,*/*' });
  await sleep(220);
  return kind === 'json' ? res.json() : res.text();
}

export function decodeEntities(s) {
  return s
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘').replace(/&rdquo;/g, '”').replace(/&ldquo;/g, '“')
    .replace(/&amp;/g, '&');
}
// HTML to plain text that keeps a table readable: one row per line, cells separated by " | ".
export function htmlToText(html) {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|ix:header)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d|table|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  s = decodeEntities(s).replace(/[​­]/g, '').replace(/[ \t ]+/g, ' ');
  return s.split('\n')
    .map((l) => l.replace(/(\s*\|\s*)+$/g, '').replace(/^(\s*\|\s*)+/g, '').replace(/\s*\|(\s*\|)+\s*/g, ' | ').trim())
    .filter(Boolean).join('\n');
}

export const nowIso = () => new Date().toISOString();
export const num = (v) => { if (v == null || v === '') return null; const n = Number(String(v).replace(/,/g, '')); return Number.isFinite(n) ? n : null; };
