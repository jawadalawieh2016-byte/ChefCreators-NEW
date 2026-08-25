const apiUrl = process.argv[2]?.trim().replace(/\/$/, '');
const adminPin = process.argv[3]?.trim() || 'kafta';

if (!apiUrl || !/^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(apiUrl)) {
  console.error('Usage: npm run smoke:api -- https://your-api-service.onrender.com [admin-pin]');
  process.exit(1);
}

async function request(path, options = {}) {
  const res = await fetch(apiUrl + path, options);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed with ${res.status}: ${text}`);
  }
  return data;
}

const testId = `smoke-${Date.now()}`;
const testToken = `token-${Date.now()}`;

try {
  await request('/health');

  await request('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: testId,
      userToken: testToken,
      name: 'Smoke Test User',
      age: 12,
      ageGroup: 'teen'
    })
  });

  const current = await request(`/api/users/${encodeURIComponent(testId)}`, {
    headers: { 'x-user-token': testToken }
  });
  if (current.user?.name !== 'Smoke Test User' || current.user?.age !== 12) {
    throw new Error('Created user did not round-trip correctly.');
  }

  const all = await request('/api/users', {
    headers: { 'x-admin-pin': adminPin }
  });
  if (!all.users?.[testId]) {
    throw new Error('Admin user list did not include the test user.');
  }

  console.log('Render API smoke test passed.');
} finally {
  await request(`/api/users/${encodeURIComponent(testId)}`, {
    method: 'DELETE',
    headers: { 'x-admin-pin': adminPin }
  }).catch(() => {});
}
