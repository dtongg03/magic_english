// Script to convert logo.svg to logo.png
// Run: node scripts/convert-logo.js
// Requires: npm install sharp

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputSvg = join(__dirname, '../static/logo.svg');
const outputPng = join(__dirname, '../static/logo.png');

async function convertSvgToPng() {
  try {
    await sharp(inputSvg)
      .resize(512, 512) // High resolution for better quality
      .png()
      .toFile(outputPng);
    
    console.log('✅ Successfully converted logo.svg to logo.png');
    console.log(`📁 Output: ${outputPng}`);
  } catch (error) {
    console.error('❌ Error converting SVG to PNG:', error.message);
    console.log('\n💡 Alternative: Use online converter or design tool to export logo.svg as 512x512 PNG');
  }
}

convertSvgToPng();
