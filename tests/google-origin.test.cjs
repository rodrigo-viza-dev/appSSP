const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsForTest = {};
const code = ts.transpileModule(fs.readFileSync('src/services/google-origin.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(code, { exports: exportsForTest, URL });
const { canUseGoogleOnWeb } = exportsForTest;
test('Google web admite localhost de desarrollo y HTTPS registrado', () => {
  assert.equal(canUseGoogleOnWeb('http://localhost:5173'), true);
  assert.equal(canUseGoogleOnWeb('https://practicas.example.org'), true);
});
test('la IP Wi-Fi por HTTP conserva SSP y evita iniciar Google', () => {
  for (const origin of ['http://192.168.1.125:5173', 'http://10.0.0.2:5173', 'http://localhost.example.org:5173', 'file:///login.html', 'invalid']) assert.equal(canUseGoogleOnWeb(origin), false);
});
