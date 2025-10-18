// scripts/generate-sitemap.js
// Generates a sitemap.xml from React Router paths in src/App.jsx
// Writes to public/sitemap.xml so it is included in Vite builds

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const srcAppPath = path.join(projectRoot, 'src', 'App.jsx');
const publicDir = path.join(projectRoot, 'public');
const outputPath = path.join(publicDir, 'sitemap.xml');

// Prefer SITE_URL env var; fallback to localhost preview
const BASE_URL = process.env.SITE_URL?.replace(/\/$/, '') || 'http://localhost:4173';

function readRoutesFromApp() {
  const appContent = fs.readFileSync(srcAppPath, 'utf-8');
  const routeRegex = /<Route\s+path=\"([^\"]+)\"/g;
  const paths = new Set();
  let match;
  while ((match = routeRegex.exec(appContent)) !== null) {
    const p = match[1];
    if (!p) continue;
    // Skip internal-only or test routes if desired
    paths.add(p);
  }
  return Array.from(paths);
}

function priorityForPath(p) {
  if (p === '/') return 1.0;
  // Heuristics: key pages
  const high = ['/FederationPage','/LeaguePage','/AmateurSportsClubPage','/photos-logo-publication'];
  if (high.includes(p)) return 0.8;
  const medium = ['/AthletePage','/MemberListPage','/member-list','/club-member-list'];
  if (medium.includes(p)) return 0.7;
  // Lower priority for add/manage or testing pages
  if (/Add|button-test|The[A-Za-z]+/.test(p)) return 0.6;
  return 0.5;
}

function buildSitemapXML(paths) {
  const lastmod = new Date().toISOString().split('T')[0];
  const urlsetOpen = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  const urlsetClose = '</urlset>\n';

  const urls = paths.map((p) => {
    const loc = p === '/' ? BASE_URL + '/' : BASE_URL + p;
    const priority = priorityForPath(p).toFixed(1);
    return (
      '  <url>\n' +
      `    <loc>${loc}</loc>\n` +
      `    <lastmod>${lastmod}</lastmod>\n` +
      '    <changefreq>weekly</changefreq>\n' +
      `    <priority>${priority}</priority>\n` +
      '  </url>\n'
    );
  }).join('');

  return urlsetOpen + urls + urlsetClose;
}

function ensurePublicDir() {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
}

function main() {
  try {
    const paths = readRoutesFromApp();
    // Ensure root always present
    if (!paths.includes('/')) paths.unshift('/');
    // Sort for stable output
    paths.sort();
    const xml = buildSitemapXML(paths);
    ensurePublicDir();
    fs.writeFileSync(outputPath, xml, 'utf-8');
    console.log(`✅ Generated sitemap with ${paths.length} routes at ${outputPath}`);
    console.log(`   Base URL: ${BASE_URL}`);
  } catch (err) {
    console.error('❌ Failed to generate sitemap:', err);
    process.exitCode = 1;
  }
}

main();