// Discord のダイヤルロック用に、招待 URL を 4 桁の番号で暗号化して src/data/discordLock.json に保存する。
// 使い方：npm run lock（番号と URL を聞かれるので入力する。番号も URL もファイルには残らない）
import { webcrypto as crypto } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const ITERATIONS = 300000; // src/dialLock.js と同じ値にする

// 入力は 1 つの readline でまとめて読む。番号を聞くときだけ、打った文字を * で表示する
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY, prompt: '' });
let hidden = false;
const write = rl._writeToOutput.bind(rl);
rl._writeToOutput = s => write(hidden && !/[\r\n]/.test(s) ? '*'.repeat(s.length) : s);
const lines = rl[Symbol.asyncIterator](); // 先に届いた行も取りこぼさない
async function ask(question, { secret = false } = {}) {
  process.stdout.write(question);
  hidden = secret;
  const { value = '' } = await lines.next();
  hidden = false;
  if (!process.stdin.isTTY) process.stdout.write('\n');
  return value.trim();
}
const askHidden = question => ask(question, { secret: true });

const code = await askHidden('4桁の番号: ');
if (!/^\d{4}$/.test(code)) { console.error('番号は 4 桁の数字で入力してください'); process.exit(1); }
const again = await askHidden('もう一度: ');
if (again !== code) { console.error('番号が一致しません'); process.exit(1); }
const url = await ask('Discord の招待 URL: ');
rl.close();
if (!/^https:\/\/(discord\.gg|discord\.com\/invite)\/[\w-]+$/.test(url)) {
  console.error('https://discord.gg/… か https://discord.com/invite/… の形で入力してください');
  process.exit(1);
}

const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
  base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(url)));

const b64 = u => Buffer.from(u).toString('base64');
const out = fileURLToPath(new URL('../src/data/discordLock.json', import.meta.url));
writeFileSync(out, JSON.stringify({ salt: b64(salt), iv: b64(iv), ct: b64(ct) }, null, 2) + '\n');
console.log('保存しました: src/data/discordLock.json');
