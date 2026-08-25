import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [
  'ChefCreators_Latest_Updated_YouTube (1).html',
  'ChefCreators_ADMIN_FIXED (2).html'
];

const failures = [];

for (const file of files) {
  const full = path.join(root, file);
  const text = fs.readFileSync(full, 'utf8');
  const match = text.match(/const API_BASE_URL = '([^']+)';/);
  if (!match) {
    failures.push(`${file}: missing API_BASE_URL`);
    continue;
  }
  const url = match[1];
  if (url.includes('YOUR-RENDER-BACKEND')) failures.push(`${file}: API_BASE_URL still has placeholder`);
  if (!/^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(url)) failures.push(`${file}: API_BASE_URL is not a Render HTTPS URL`);
}

if (failures.length) {
  console.error('Render API URL verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Render API URL verification passed.');
