/**
 * Create installer banner and sidebar images
 * NSIS Installer UI branding assets
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildResourcesDir = path.join(__dirname, '../build-resources');
const sourceLogo = path.join(__dirname, '../static/icon.png');

// Create directory
if (!fs.existsSync(buildResourcesDir)) {
  fs.mkdirSync(buildResourcesDir, { recursive: true });
}

console.log('🎨 Creating installer branding assets...\n');

/**
 * Create installer banner (top of installer window)
 * Size: 164x314 pixels
 */
async function createInstallerHeader() {
  console.log('📐 Creating installer header (164x314)...');
  
  const width = 164;
  const height = 314;
  
  // Create gradient background
  const svg = `
    <svg width="${width}" height="${height}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)"/>
    </svg>
  `;
  
  // Overlay logo
  const logo = await sharp(sourceLogo)
    .resize(80, 80, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  
  await sharp(Buffer.from(svg))
    .composite([{
      input: logo,
      top: Math.floor((height - 80) / 2),
      left: Math.floor((width - 80) / 2)
    }])
    .png()
    .toFile(path.join(buildResourcesDir, 'installerHeader.png'));
  
  console.log('  ✓ installerHeader.png created\n');
}

/**
 * Create installer sidebar (left side of installer)
 * Size: 150x314 pixels (classic NSIS)
 */
async function createInstallerSidebar() {
  console.log('📐 Creating installer sidebar (150x314)...');
  
  const width = 150;
  const height = 314;
  
  // Create gradient background
  const svg = `
    <svg width="${width}" height="${height}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#764ba2;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#667eea;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#grad)"/>
      <text x="75" y="270" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">Magic</text>
      <text x="75" y="290" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">English</text>
    </svg>
  `;
  
  // Overlay logo at top
  const logo = await sharp(sourceLogo)
    .resize(100, 100, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  
  await sharp(Buffer.from(svg))
    .composite([{
      input: logo,
      top: 40,
      left: 25
    }])
    .png()
    .toFile(path.join(buildResourcesDir, 'installerSidebar.png'));
  
  console.log('  ✓ installerSidebar.png created\n');
}

/**
 * Create uninstaller icon
 */
async function createUninstallerIcon() {
  console.log('📐 Creating uninstaller icon...');
  
  await sharp(sourceLogo)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(buildResourcesDir, 'uninstallerIcon.png'));
  
  console.log('  ✓ uninstallerIcon.png created\n');
}

/**
 * Create app icon in build-resources
 */
async function copyAppIcon() {
  console.log('📐 Copying app icon to build-resources...');
  
  fs.copyFileSync(
    sourceLogo,
    path.join(buildResourcesDir, 'icon.png')
  );
  
  console.log('  ✓ icon.png copied\n');
}

// Execute all
(async () => {
  try {
    await createInstallerHeader();
    await createInstallerSidebar();
    await createUninstallerIcon();
    await copyAppIcon();
    console.log('✅ All installer assets created successfully!');
    console.log(`📁 Location: ${buildResourcesDir}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();

