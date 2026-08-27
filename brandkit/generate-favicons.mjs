import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputSvg = path.join(__dirname, 'mthryve-logo.svg');
const outputDir = path.join(__dirname, '..', 'public');

const sizes = [16, 32, 48, 64, 128, 192, 512];

async function generateFavicons() {
  try {
    const svgBuffer = fs.readFileSync(inputSvg);
    
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `favicon-${size}.png`);
      await sharp(svgBuffer)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outputPath);
      console.log(`Generated favicon-${size}.png`);
    }

    // Generate ICO with multiple sizes
    const icoPath = path.join(outputDir, 'favicon.ico');
    await sharp(svgBuffer)
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(icoPath);
    console.log('Generated favicon.ico');

    // Generate Apple touch icon
    const applePath = path.join(outputDir, 'apple-touch-icon.png');
    await sharp(svgBuffer)
      .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(applePath);
    console.log('Generated apple-touch-icon.png');

    console.log('All favicons generated successfully!');
  } catch (error) {
    console.error('Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();