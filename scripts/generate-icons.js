/**
 * Generate Windows ICO file from PNG
 * Generates multi-resolution .ico file for Windows installer
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 32, 48, 64, 128, 256];
const sourcePng = path.join(__dirname, '../static/icon.png');
const buildResourcesDir = path.join(__dirname, '../build-resources');
const outputIco = path.join(buildResourcesDir, 'icon.ico');

// Create build-resources directory if it doesn't exist
if (!fs.existsSync(buildResourcesDir)) {
  fs.mkdirSync(buildResourcesDir, { recursive: true });
}

console.log('🎨 Generating Windows ICO file...');
console.log(`📁 Source: ${sourcePng}`);
console.log(`📁 Output: ${outputIco}`);

async function generateIco() {
  try {
    // Generate all size variants
    const buffers = await Promise.all(
      sizes.map(async (size) => {
        console.log(`  ✓ Generating ${size}x${size}px...`);
        return await sharp(sourcePng)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toBuffer();
      })
    );

    // Create ICO file structure
    const icoHeader = Buffer.alloc(6);
    icoHeader.writeUInt16LE(0, 0); // Reserved
    icoHeader.writeUInt16LE(1, 2); // Type (1 = ICO)
    icoHeader.writeUInt16LE(sizes.length, 4); // Number of images

    const iconDirEntries = [];
    let imageOffset = 6 + (16 * sizes.length);

    for (let i = 0; i < sizes.length; i++) {
      const entry = Buffer.alloc(16);
      const size = sizes[i];
      const buffer = buffers[i];

      entry.writeUInt8(size === 256 ? 0 : size, 0); // Width (0 means 256)
      entry.writeUInt8(size === 256 ? 0 : size, 1); // Height
      entry.writeUInt8(0, 2); // Color palette
      entry.writeUInt8(0, 3); // Reserved
      entry.writeUInt16LE(1, 4); // Color planes
      entry.writeUInt16LE(32, 6); // Bits per pixel
      entry.writeUInt32LE(buffer.length, 8); // Image size
      entry.writeUInt32LE(imageOffset, 12); // Image offset

      iconDirEntries.push(entry);
      imageOffset += buffer.length;
    }

    // Combine all parts
    const icoFile = Buffer.concat([
      icoHeader,
      ...iconDirEntries,
      ...buffers
    ]);

    fs.writeFileSync(outputIco, icoFile);
    console.log('✅ ICO file generated successfully!');
    console.log(`📦 File size: ${(icoFile.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('❌ Error generating ICO:', error);
    process.exit(1);
  }
}

generateIco();

