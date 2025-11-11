/**
 * Post-build script
 * Generate build info and verify installer
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist');
const buildInfoFile = path.join(distDir, 'BUILD_INFO.txt');

console.log('📦 Post-build processing...\n');

// Find installer file
const files = fs.readdirSync(distDir);
const installer = files.find(f => f.endsWith('.exe') && f.includes('Setup'));
const portable = files.find(f => f.endsWith('.exe') && f.includes('Portable'));

if (!installer && !portable) {
  console.error('❌ No installer found!');
  process.exit(1);
}

// Calculate checksums
function calculateChecksum(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Generate build info
let buildInfo = `Magic English - Build Information
Generated: ${new Date().toISOString()}
========================================

`;

if (installer) {
  const installerPath = path.join(distDir, installer);
  const stats = fs.statSync(installerPath);
  const checksum = calculateChecksum(installerPath);
  
  buildInfo += `INSTALLER:
  Filename: ${installer}
  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB
  SHA256: ${checksum}

`;
  
  console.log(`✅ Installer: ${installer}`);
  console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   SHA256: ${checksum}\n`);
}

if (portable) {
  const portablePath = path.join(distDir, portable);
  const stats = fs.statSync(portablePath);
  const checksum = calculateChecksum(portablePath);
  
  buildInfo += `PORTABLE:
  Filename: ${portable}
  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB
  SHA256: ${checksum}

`;
  
  console.log(`✅ Portable: ${portable}`);
  console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   SHA256: ${checksum}\n`);
}

buildInfo += `========================================
For distribution, upload both files to:
- GitHub Releases
- Website download page
- Update server

Include SHA256 checksums for verification.
`;

fs.writeFileSync(buildInfoFile, buildInfo);
console.log('✅ Build info saved to BUILD_INFO.txt');
console.log(`📁 Output directory: ${distDir}\n`);

