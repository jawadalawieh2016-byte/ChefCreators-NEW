import fs from 'node:fs';
import path from 'node:path';

const apiUrl = process.argv[2]?.trim().replace(/\/$/, '');

if (!apiUrl || !/^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(apiUrl)) {
  console.error('Usage: npm run set:api-url -- https://your-api-service.onrender.com');
  process.exit(1);
}

const root = process.cwd();
const files = [
  'ChefCreators_Latest_Updated_YouTube (1).html',
  'ChefCreators_ADMIN_FIXED (2).html'
];

const apiLine = `const API_BASE_URL = '${apiUrl}';`;
const pattern = /const API_BASE_URL = 'https:\/\/[^']+';/;

for (const file of files) {
  const full = path.join(root, file);
  const before = fs.readFileSync(full, 'utf8');
  if (!pattern.test(before)) {
    console.error(`Could not find API_BASE_URL in ${file}`);
    process.exit(1);
  }
  fs.writeFileSync(full, before.replace(pattern, apiLine));
}

console.log(`Updated API_BASE_URL in ${files.length} files.`);
