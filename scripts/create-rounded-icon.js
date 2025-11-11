// Script to create rounded corner PNG icon from logo.png
// Run: node scripts/create-rounded-icon.js
// Requires: npm install sharp

import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputPng = join(__dirname, '../static/logo.png');
const outputIcon = join(__dirname, '../static/icon.png');

async function createRoundedIcon() {
  try {
    const size = 512;
    const cornerRadius = 100; // Rounded corners (adjust as needed)
    
    // Create rounded corner mask
    const roundedCorners = Buffer.from(
      `<svg width="${size}" height="${size}">
        <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/>
      </svg>`
    );

    await sharp(inputPng)
      .resize(size, size, { fit: 'cover' })
      .composite([{
        input: roundedCorners,
        blend: 'dest-in'
      }])
      .png()
      .toFile(outputIcon);
    
    console.log('✅ Successfully created rounded icon.png');
    console.log(`📁 Output: ${outputIcon}`);
    console.log('🔄 Update main.js to use icon.png instead of logo.png');
  } catch (error) {
    console.error('❌ Error creating rounded icon:', error.message);
    console.log('\n💡 Make sure logo.png exists first!');
  }
}

createRoundedIcon();
