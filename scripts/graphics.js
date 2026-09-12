'use strict';

// Renders the README graphics with Electron:  npm run graphics
//   docs/assets/banner-de.png, banner-en.png   header banners
//   build/icon.png, docs/assets/icon.png       app icon (electron-builder picks up build/icon.png)
//   docs/assets/screenshot-*-de|en.png         real screenshots of the running app
// The app runs from a throwaway data folder filled with docs/graphics/demo-*.json;
// the code in the screenshots is really executed (Pyodide), not faked.
const { app, BrowserWindow, nativeTheme } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GRAPHICS = path.join(ROOT, 'docs', 'graphics');
const ASSETS = path.join(ROOT, 'docs', 'assets');
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'codewerk-graphics-'));
const DATA_FILE = path.join(DATA_DIR, 'codewerk-data.json');

function writeDemo(lang) {
  fs.copyFileSync(path.join(GRAPHICS, `demo-${lang}.json`), DATA_FILE);
}

app.setPath('userData', DATA_DIR);
// Started as `electron scripts/graphics.js`, Electron would report its own version number.
const pkg = require('../package.json');
app.getVersion = () => pkg.version;
writeDemo('de');
require('../src/main/main.js'); // registers protocol and IPC, creates the app window
const store = require('../src/main/store');

let appWindow = null;
app.on('browser-window-created', (_event, win) => {
  if (!appWindow) appWindow = win;
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function save(image, ...targets) {
  const png = image.toPNG();
  const { width, height } = image.getSize();
  for (const target of targets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, png);
    console.log(`✓ ${path.relative(ROOT, target)} (${width}×${height})`);
  }
}

async function renderPage(file, query, width, height, ...targets) {
  const win = new BrowserWindow({
    width,
    height,
    useContentSize: true,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { offscreen: true },
  });
  await win.loadFile(path.join(GRAPHICS, file), { query });
  await win.webContents.executeJavaScript('document.fonts.ready.then(() => true)');
  await sleep(400);
  save(await win.webContents.capturePage(), ...targets);
  win.destroy();
}

const js = (code) => appWindow.webContents.executeJavaScript(code);

async function waitFor(expression, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await js(`Boolean(${expression})`)) return;
    await sleep(150);
  }
  throw new Error(`Zeitüberschreitung beim Warten auf: ${expression}`);
}

async function shot(name, lang, rect) {
  appWindow.webContents.invalidate();
  await sleep(500);
  save(await appWindow.webContents.capturePage(rect), path.join(ASSETS, `screenshot-${name}-${lang}.png`));
}

async function captureApp(lang) {
  await waitFor("document.querySelectorAll('.course-tile').length === 5");
  await sleep(600);
  await shot('home', lang, { x: 0, y: 0, width: 1440, height: 470 }); // below the tiles is empty

  await js("document.querySelectorAll('.course-tile')[0].click()");
  await waitFor("!document.querySelector('#course').hidden && document.querySelectorAll('#messages .msg').length > 3");
  await js("document.querySelector('#stdin').value = '12.5'; document.querySelector('#run-btn').click();");
  await waitFor('/\\d+ ms/.test(document.querySelector("#run-status").textContent)', 90000);
  await js("document.activeElement.blur(); document.querySelector('#messages').scrollTop = 1e9;");
  await shot('course', lang);

  await js("document.querySelector('#toggle-profile').click()");
  await sleep(400);
  await shot('profile', lang);

  await js("document.querySelector('#toggle-profile').click(); document.querySelector('#open-settings').click();");
  await sleep(300);
  await js('document.activeElement.blur()'); // no focus ring on the first select
  await sleep(300);
  await shot('settings', lang);
  await js("document.querySelector('#settings-dialog').close()");
}

app.whenReady()
  .then(async () => {
    await sleep(300);
    if (!appWindow) throw new Error('Das App-Fenster wurde nicht erstellt.');
    nativeTheme.themeSource = 'dark'; // same look as the banner, independent of the Windows theme
    appWindow.setContentSize(1440, 900);
    appWindow.webContents.setBackgroundThrottling(false);
    if (appWindow.webContents.isLoading()) {
      await new Promise((resolve) => appWindow.webContents.once('did-finish-load', resolve));
    }

    await renderPage('banner.html', { lang: 'de' }, 1600, 560, path.join(ASSETS, 'banner-de.png'));
    await renderPage('banner.html', { lang: 'en' }, 1600, 560, path.join(ASSETS, 'banner-en.png'));
    await renderPage('icon.html', {}, 512, 512, path.join(ROOT, 'build', 'icon.png'), path.join(ASSETS, 'icon.png'));

    await captureApp('de');
    writeDemo('en');
    store.load();
    appWindow.webContents.reload();
    await new Promise((resolve) => appWindow.webContents.once('did-finish-load', resolve));
    await captureApp('en');
    app.exit(0);
  })
  .catch((err) => {
    console.error(err);
    app.exit(1);
  });
