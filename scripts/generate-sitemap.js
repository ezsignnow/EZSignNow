import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base URL for the site
const BASE_URL = 'https://ezsignnow.com';

// Dynamic list of active routes
const routes = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/compare/signnow', changefreq: 'weekly', priority: '0.9' },
  { path: '/blog', changefreq: 'daily', priority: '0.8' },
  { path: '/forms', changefreq: 'daily', priority: '0.9' },
  { path: '/login', changefreq: 'monthly', priority: '0.5' },
  { path: '/signup', changefreq: 'monthly', priority: '0.6' },
  { path: '/try-for-free', changefreq: 'monthly', priority: '0.8' },
  { path: '/try-trial', changefreq: 'monthly', priority: '0.7' }
];

function generateSitemap() {
  console.log('Generating ES-compliant XML sitemap for ezsignnow.com...');
  
  const currentDate = new Date().toISOString().split('T')[0];
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  routes.forEach(route => {
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}${route.path}</loc>\n`;
    xml += `    <lastmod>${currentDate}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += '  </url>\n';
  });
  
  xml += '</urlset>\n';
  
  const outputPath = path.join(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf8');
  
  console.log(`Sitemap successfully written to ${outputPath} containing ${routes.length} paths!`);
}

generateSitemap();
