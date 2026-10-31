#!/usr/bin/env node
// relayted API helper for the Claude plugin. Node >= 18, no dependencies.
//
//   node relayted.mjs pricing
//   node relayted.mjs services <shots|labs|websitepro>
//   node relayted.mjs balance
//   node relayted.mjs quote <service> <json | @file | ->
//   node relayted.mjs run   <service> <json | @file | -> [--out DIR] [--max-eur N] [--yes] [--timeout SEC]
//   node relayted.mjs topup <eur>
//   node relayted.mjs topup-status <id>
//
// Key: env RELAYTED_API_KEY (never printed). Base URL: env RELAYTED_API_URL (default https://api.relayted.de).
// Cost brake: `run` quotes first and refuses (exit 3) when the price is above --max-eur
// (env RELAYTED_MAX_EUR, default 0.25) unless --yes is given. Output is always one JSON object on stdout.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = (process.env.RELAYTED_API_URL || 'https://api.relayted.de').replace(/\/+$/, '');
const KEY = process.env.RELAYTED_API_KEY || '';
const SERVICES = new Set(['shots', 'websitepro', 'labs']);

const out = (obj, code = 0) => { process.stdout.write(JSON.stringify(obj, null, 2) + '\n'); process.exit(code); };
const fail = (code, message, extra = {}, exit = 1) => out({ ok: false, error: { code, message, ...extra } }, exit);

const args = process.argv.slice(2);
const flags = { out: 'relayted-output', maxEur: Number(process.env.RELAYTED_MAX_EUR) || 0.25, yes: false, timeout: 300 };
const pos = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--yes') flags.yes = true;
  else if (a === '--out') flags.out = args[++i];
  else if (a === '--max-eur') flags.maxEur = Number(args[++i]);
  else if (a === '--timeout') flags.timeout = Number(args[++i]);
  else pos.push(a);
}
const [cmd, ...rest] = pos;

async function api(method, route, body, { auth = true, raw = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (auth) {
    if (!KEY) fail('no_key', 'RELAYTED_API_KEY is not set. Create a key at ' + BASE + '/account and put it in the environment variable RELAYTED_API_KEY.');
    headers.Authorization = 'Bearer ' + KEY;
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(BASE + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (e) {
    fail('network', 'Could not reach ' + BASE + ': ' + (e.cause?.code || e.message));
  }
  if (raw) return res;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data.error || {};
    fail(e.code || 'http_' + res.status, e.message || 'HTTP ' + res.status, { status: res.status, ...Object.fromEntries(Object.entries(e).filter(([k]) => !['code', 'message'].includes(k))) });
  }
  return data;
}

async function readBody(arg) {
  if (!arg) fail('usage', 'Missing request body (JSON, @file or - for stdin).');
  let text = arg;
  if (arg === '-') text = await new Promise((ok) => { let s = ''; process.stdin.on('data', (d) => (s += d)); process.stdin.on('end', () => ok(s)); });
  else if (arg.startsWith('@')) text = await readFile(arg.slice(1), 'utf8');
  try { return JSON.parse(text.replace(/^﻿/, '')); } catch { fail('bad_json', 'The request body is not valid JSON.'); }
}

function needService(s) {
  if (!SERVICES.has(s)) fail('usage', 'Service must be one of: ' + [...SERVICES].join(', '));
  return s;
}

const safeName = (s) => String(s).replace(/[^\w.@-]/g, '_').slice(0, 150) || 'result';

async function run(service, body) {
  const q = await api('POST', `/v1/${service}/quote`, body);
  const brief = { cost: q.cost, eur: q.eur, items: q.items?.length ?? 0, balance: q.balance };
  if (!q.sufficient) fail('insufficient_funds', 'The balance is too low for this job. Top up first (topup <eur>).', { needed: q.cost, balance: q.balance, eur: q.eur }, 4);
  if (q.eur > flags.maxEur && !flags.yes) {
    out({ ok: false, needsConfirmation: true, reason: `Price ${q.eur.toFixed(4)} EUR is above the limit of ${flags.maxEur} EUR. Ask the user, then repeat with --yes.`, quote: { ...brief, target: q.target } }, 3);
  }

  let { job } = await api('POST', `/v1/${service}/jobs?wait=20`, body);
  const deadline = Date.now() + flags.timeout * 1000;
  while (job.status !== 'completed' && job.status !== 'failed' && Date.now() < deadline) {
    ({ job } = await api('GET', `/v1/jobs/${encodeURIComponent(job.id)}?wait=20`));
  }

  const dir = path.resolve(flags.out);
  await mkdir(dir, { recursive: true });
  const files = [];
  const problems = [];
  for (const r of job.results || []) {
    if (r.status !== 'done' || !r.url) { if (r.status === 'failed') problems.push({ key: r.key, error: r.error, refunded: r.refunded }); continue; }
    // Only ever send the key to our own API host.
    const u = new URL(r.url);
    if (u.origin !== new URL(BASE).origin) { problems.push({ key: r.key, error: 'result URL points to another host, skipped' }); continue; }
    const res = await api('GET', u.pathname + u.search, undefined, { raw: true });
    if (!res.ok) { problems.push({ key: r.key, error: 'download failed (HTTP ' + res.status + ')' }); continue; }
    const file = path.join(dir, safeName(r.filename || r.key));
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
    files.push({ key: r.key, file, bytes: r.bytes });
  }

  const finished = job.status === 'completed' || job.status === 'failed';
  const bal = await api('GET', '/v1/balance');
  out({
    ok: job.status === 'completed' && problems.length === 0,
    job: { id: job.id, service: job.service, target: job.target, status: job.status, finished, charged: job.charged, refunded: job.refunded },
    balance: { payloads: bal.balance, eur: bal.eur },
    files, problems,
    ...(finished ? {} : { note: 'Still running after the timeout. Check later with the job id; results are kept 24 h (labs 30 days).' }),
  });
}

switch (cmd) {
  case 'pricing': out(await api('GET', '/v1/pricing', undefined, { auth: false }));
  case 'services': out(await api('GET', `/v1/services/${needService(rest[0])}`, undefined, { auth: false }));
  case 'balance': out(await api('GET', '/v1/balance'));
  case 'quote': out(await api('POST', `/v1/${needService(rest[0])}/quote`, await readBody(rest[1])));
  case 'run': await run(needService(rest[0]), await readBody(rest[1])); break;
  case 'topup': {
    const eur = Number(rest[0]);
    if (!(eur > 0)) fail('usage', 'topup <eur>, e.g. topup 5');
    out(await api('POST', '/v1/topups', { eur }));
  }
  case 'topup-status': out(await api('GET', `/v1/topups/${encodeURIComponent(rest[0] || '')}`));
  default:
    fail('usage', 'Commands: pricing, services <svc>, balance, quote <svc> <json>, run <svc> <json> [--out DIR] [--max-eur N] [--yes], topup <eur>, topup-status <id>');
}
