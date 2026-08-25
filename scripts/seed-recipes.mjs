import process from 'node:process';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import recipes from '../packages/shared/src/recipes.json' assert { type: 'json' };

const args = new Set(process.argv.slice(2));
const emulator = args.has('--emulator');
const production = args.has('--production');

if (!emulator && !production) {
  throw new Error('Choose --emulator or --production.');
}
if (production && !args.has('--confirm-production')) {
  throw new Error('Production seeding requires --confirm-production.');
}
if (emulator) {
  process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
  process.env.GCLOUD_PROJECT ||= 'chefcreators-local';
}

const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
initializeApp({
  credential: credentialPath ? cert(JSON.parse(await import('node:fs').then((fs) => fs.readFileSync(credentialPath, 'utf8')))) : applicationDefault(),
  projectId: process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID
});

const db = getFirestore();
let batch = db.batch();
let count = 0;
for (const recipe of recipes) {
  const ref = db.collection('recipes').doc(recipe.id);
  batch.set(ref, {
    ...recipe,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp()
  }, { merge: true });
  count += 1;
  if (count % 400 === 0) {
    await batch.commit();
    batch = db.batch();
  }
}
await batch.commit();
console.log(`Seeded ${count} recipes to ${emulator ? 'emulator' : 'production'}.`);
