// Exporta, só para leitura, o histórico de uma categoria de canais do Discord
// num período, para usar como fonte da seção "### Fora do Jira" da triagem.
// Usa a API REST do Discord com o token de um bot. Não envia mensagens e não
// altera nada no servidor. Roda com Bun ou Node 18+, sem dependências.
//
// Uso:
//   bun scripts/discord-export.mjs --category "Agências" --start 2026-07-01 --end 2026-09-30
// Opções: --out <pasta> (padrão: discord-export) · --guild <nome ou ID do servidor>
// Token: DISCORD_BOT_TOKEN no ambiente ou em ~/.claude/channels/discord/.env

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const CATEGORY = arg('category');
const START = arg('start');
const END = arg('end');
const OUT = arg('out', 'discord-export');
const GUILD = arg('guild');
if (!CATEGORY || !START || !END) {
  console.error('Uso: --category <nome> --start AAAA-MM-DD --end AAAA-MM-DD [--out pasta] [--guild servidor]');
  process.exit(1);
}

function readToken() {
  if (process.env.DISCORD_BOT_TOKEN) return process.env.DISCORD_BOT_TOKEN.trim();
  const file = join(homedir(), '.claude/channels/discord/.env');
  if (existsSync(file)) return readFileSync(file, 'utf8').match(/^DISCORD_BOT_TOKEN=(.+)$/m)?.[1]?.trim();
}
const TOKEN = readToken();
if (!TOKEN) {
  console.error('DISCORD_BOT_TOKEN não encontrado (ambiente ou ~/.claude/channels/discord/.env).');
  process.exit(1);
}

async function api(path) {
  for (;;) {
    const res = await fetch(`https://discord.com/api/v10${path}`, { headers: { Authorization: `Bot ${TOKEN}` } });
    if (res.status === 429) {
      const { retry_after = 1 } = await res.json();
      await new Promise((r) => setTimeout(r, retry_after * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${(await res.json().catch(() => ({}))).message ?? res.statusText}`);
    return res.json();
  }
}

const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const startMs = Date.parse(`${START}T00:00:00-03:00`);
const endMs = Date.parse(`${END}T23:59:59-03:00`);
const snowflake = (ms) => ((BigInt(ms) - 1420070400000n) << 22n).toString();

async function messagesInRange(channelId) {
  const out = [];
  let after = snowflake(startMs - 1);
  for (;;) {
    const batch = await api(`/channels/${channelId}/messages?limit=100&after=${after}`);
    if (!batch.length) return out;
    batch.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));
    for (const m of batch) {
      if (Date.parse(m.timestamp) > endMs) return out;
      out.push({
        id: m.id,
        ts: m.timestamp,
        author: m.author?.global_name || m.author?.username,
        author_id: m.author?.id,
        content: m.content,
        reply_to: m.message_reference?.message_id ?? null,
        attachments: (m.attachments || []).map((a) => a.filename),
      });
    }
    if (batch.length < 100) return out;
    after = batch[batch.length - 1].id;
  }
}

async function threadsOf(guildId, channelId, warn) {
  const threads = new Map();
  const active = await api(`/guilds/${guildId}/threads/active`).catch(() => ({ threads: [] }));
  for (const t of active.threads) if (t.parent_id === channelId) threads.set(t.id, t.name);
  const archived = await api(`/channels/${channelId}/threads/archived/public?limit=100`).catch((e) => {
    warn.push(`threads arquivadas: ${e.message}`);
    return { threads: [] };
  });
  for (const t of archived.threads) threads.set(t.id, t.name);
  return threads;
}

function transcript(messages) {
  return messages
    .map((m) => {
      const att = m.attachments.length ? ` [+${m.attachments.length} anexo]` : '';
      const where = m.thread ? ` (thread: ${m.thread})` : '';
      return `${m.ts.slice(0, 16)} ${m.author}${where}: ${(m.content || '').replaceAll('\n', ' ⏎ ')}${att}`;
    })
    .join('\n');
}

const app = await api('/applications/@me');
if (!(app.flags & ((1 << 18) | (1 << 19)))) {
  console.warn('Aviso: o Message Content Intent está desligado. As mensagens virão sem texto (veja docs/discord.md).');
}

mkdirSync(OUT, { recursive: true });
const guilds = (await api('/users/@me/guilds')).filter((g) => !GUILD || g.id === GUILD || g.name === GUILD);
for (const guild of guilds) {
  const channels = await api(`/guilds/${guild.id}/channels`);
  const categories = channels.filter((c) => c.type === 4 && normalize(c.name).includes(normalize(CATEGORY)));
  for (const category of categories) {
    console.log(`[${guild.name}] ${category.name}`);
    for (const ch of channels.filter((c) => c.parent_id === category.id && [0, 5].includes(c.type))) {
      const warn = [];
      let messages = [];
      try {
        messages = await messagesInRange(ch.id);
        for (const [id, name] of await threadsOf(guild.id, ch.id, warn)) {
          const inThread = await messagesInRange(id).catch((e) => (warn.push(`thread ${name}: ${e.message}`), []));
          messages.push(...inThread.map((m) => ({ ...m, thread: name })));
        }
      } catch (e) {
        warn.push(e.message);
      }
      messages.sort((a, b) => a.ts.localeCompare(b.ts));
      writeFileSync(join(OUT, `${ch.name}.json`), JSON.stringify({ guild: guild.name, category: category.name, channel: ch.name, messages }, null, 2));
      writeFileSync(join(OUT, `${ch.name}.txt`), transcript(messages));
      const empty = messages.filter((m) => !m.content && !m.attachments.length).length;
      console.log(`  #${ch.name}: ${messages.length} mensagens${empty ? `, ${empty} sem texto` : ''}${warn.length ? ` (${warn.join('; ')})` : ''}`);
    }
  }
}
console.log(`\nArquivos em ${OUT}/`);
