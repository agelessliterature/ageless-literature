/**
 * Upload About Page Assets to Cloudinary
 * Uploads SVG files and references videos for the About page
 */

import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const WORDPRESS_ASSETS_DIR = '/Applications/MAMP/htdocs/AgelessLiterature-Wordpress/wp-content/themes/bookworm/assets/img';
const CLOUDINARY_FOLDER = 'src/about-page';

async function uploadSVG(filePath, fileName) {
  try {
    const publicId = `${CLOUDINARY_FOLDER}/${path.basename(fileName, '.svg')}`;
    
    console.log(`Uploading ${fileName}...`);
    
    const result = await cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      resource_type: 'raw', // SVGs should be uploaded as raw
      overwrite: true,
      format: 'svg',
    });
    
    console.log(`✓ Uploaded: ${result.secure_url}`);
    return result;
  } catch (error) {
    console.error(`✗ Error uploading ${fileName}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('=== Uploading About Page SVG Assets to Cloudinary ===\n');
  
  // SVG files to upload (1-9.svg)
  const svgFiles = ['1.svg', '2.svg', '3.svg', '4.svg', '5.svg', '6.svg', '7.svg', '8.svg', '9.svg'];
  
  const results = [];
  
  for (const svgFile of svgFiles) {
    const filePath = path.join(WORDPRESS_ASSETS_DIR, svgFile);
    
    if (fs.existsSync(filePath)) {
      const result = await uploadSVG(filePath, svgFile);
      results.push({ file: svgFile, result });
    } else {
      console.log(`⚠ File not found: ${filePath}`);
    }
  }
  
  console.log('\n=== Upload Summary ===');
  console.log(`Total files: ${svgFiles.length}`);
  console.log(`Uploaded: ${results.filter(r => r.result).length}`);
  console.log(`Failed: ${results.filter(r => !r.result).length}`);
  
  console.log('\n=== Video URLs (already hosted on WordPress) ===');
  console.log('Video 3: https://videos.files.wordpress.com/cfiz6ZIj/ageless-literature-about-us-5.mp4');
  console.log('Video 4: https://videos.files.wordpress.com/kXmbNHXW/ageless-literature-about-us-1-2.mp4');
  console.log('Video 6: https://videos.files.wordpress.com/0pdIUURj/ageless-literature-about-us-4.mp4');
  console.log('Video 8: https://videos.files.wordpress.com/NhLv45UK/ageless-literature-about-us-3.mp4');
  console.log('Video 9: https://videos.files.wordpress.com/neQyxkK9/ageless-literature-about-us-2-2.mp4');
}

main().catch(console.error);

// Also upload PNG versions for large files
async function uploadPNG(filePath, pageNum) {
  try {
    const publicId = `${CLOUDINARY_FOLDER}/${pageNum}`;
    
    console.log(`Uploading ${pageNum}.png...`);
    
    const result = await cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      resource_type: 'image',
      overwrite: true,
    });
    
    console.log(`✓ Uploaded PNG: ${result.secure_url}`);
    return result;
  } catch (error) {
    console.error(`✗ Error uploading ${pageNum}.png:`, error.message);
    return null;
  }
}

// Upload the converted PNGs
async function uploadLargePNGs() {
  console.log('\n=== Uploading Large Files as PNG ===\n');
  
  const pngFiles = [
    { path: '/tmp/about-assets/1.png', pageNum: 1 },
    { path: '/tmp/about-assets/4.png', pageNum: 4 },
    { path: '/tmp/about-assets/5.png', pageNum: 5 },
  ];
  
  for (const file of pngFiles) {
    if (fs.existsSync(file.path)) {
      await uploadPNG(file.path, file.pageNum);
    } else {
      console.log(`⚠ File not found: ${file.path}`);
    }
  }
}

uploadLargePNGs().catch(console.error);
