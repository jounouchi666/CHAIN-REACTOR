import {test,expect} from '@playwright/test';
test('local entry serves the real app and denies private paths',async({request})=>{
  const response=await request.get('/');expect(response.status()).toBe(200);expect(await response.text()).toContain('./dist/app.js');
  expect(response.headers()['content-security-policy']).toContain("connect-src 'self'");
  for(const path of ['/.git/config','/node_modules/matter-js/package.json','/%2e%2e%5cpackage.json'])expect((await request.get(path)).status()).toBe(404);
  expect((await request.post('/')).status()).toBe(405);
});
