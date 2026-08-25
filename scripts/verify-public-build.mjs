import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targets = [
  path.join(root, 'apps/web/dist'),
  path.join(root, 'android/app/src/main/assets/public'),
  path.join(root, 'ios/App/App/public')
];

const blocked = [
  'admin.html',
  'ADMIN_PIN',
  'ChefCreators Admin',
  'Open Admin Panel',
  'adminControlsSection',
  'adminMode',
  'Grant free Pro',
  'Ban user',
  'Unban user',
  'set-admin-claim',
  'serviceAccount',
  'private-admin',
  'admin-local',
  'kafta',
  'sk_live_',
  'STRIPE_SECRET_KEY=sk_',
  'private_key',
  'BEGIN PRIVATE KEY'
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

let failures = [];
for (const target of targets) {
  for (const file of walk(target)) {
    const rel = path.relative(root, file);
    const name = path.basename(file);
    if (blocked.some((needle) => name.includes(needle))) {
      failures.push(`${rel}: blocked filename`);
      continue;
    }
    const content = fs.readFileSync(file);
    if (content.includes(0)) continue;
    const text = content.toString('utf8');
    for (const needle of blocked) {
      if (text.includes(needle)) failures.push(`${rel}: contains ${needle}`);
    }
    const suspiciousGoogleKey = text.match(/AIza[0-9A-Za-z_-]{35}/g) || [];
    for (const key of suspiciousGoogleKey) {
      if (!/firebaseConfig|VITE_FIREBASE_API_KEY|apiKey/.test(text.slice(Math.max(0, text.indexOf(key) - 80), text.indexOf(key) + 80))) {
        failures.push(`${rel}: suspicious Google key ${key.slice(0, 8)}...`);
      }
    }
  }
}

if (failures.length) {
  console.error('Public build verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Public build verification passed: no admin artifacts or obvious secrets found.');
