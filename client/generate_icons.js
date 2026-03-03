import sharp from 'sharp';
import fs from 'fs';

const svgBuffer = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="40" height="40" rx="10" fill="url(#g)"/>
  <path d="M20 8C15.58 8 12 11.58 12 16c0 6.63 8 17 8 17s8-10.37 8-17c0-4.42-3.58-8-8-8z" fill="white" fill-opacity=".95"/>
  <rect x="16.5" y="11" width="2" height="8" rx="1" fill="url(#g)"/>
  <path d="M18.5 11h1.5a2.5 2.5 0 0 1 0 5h-1.5V11z" fill="url(#g)"/>
</svg>`);

async function generate() {
    await sharp(svgBuffer).resize(192, 192).png().toFile('./public/pwa-192x192.png');
    await sharp(svgBuffer).resize(512, 512).png().toFile('./public/pwa-512x512.png');
    console.log('PNG Icons Generated');
}

generate();
