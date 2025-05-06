const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const admin = require('firebase-admin');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

// Firebase Setup
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://realestatehomesadmin-default-rtdb.firebaseio.com'
});
const db = admin.database();

// Configuration
const SEARCH_URL = 'https://matrix.marismatrix.com/Matrix/Public/IDXSearch.aspx';
const IDX_PARAMS = { count: 50, idx: 'c2fe5d4' };
const MAX_CONCURRENT_REQUESTS = 3;
const CONTENT_THRESHOLD = 1024;

// HTTP client for info scraping
const jar = new CookieJar();
const client = wrapper(axios.create({
  jar,
  withCredentials: true,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  }
}));

async function updateListings() {
  try {
    const searchRes = await client.get(SEARCH_URL, { params: IDX_PARAMS });
    const $list = cheerio.load(searchRes.data);

    const containers = $list('div.singleLineDisplay.ajax_display');
    console.log(`Found ${containers.length} listings.`);

    await db.ref('listings/data').remove();

    const properties = [];
    for (let i = 0; i < containers.length; i++) {
      const $el = $list(containers[i]);
      const address = $el.find('td.d805m12 span.field.d805m13').text().trim();
      const price = $el.find('td.d805m9  span.field').text().trim();
      const beds = $el.find('td.d805m15 span.field').text().trim();
      const baths = $el.find('td.d805m16 span.field').text().trim();
      const listingId = $el.find('td.d805m4 span.field').text().trim();

      await db.ref(`listings/data/${i}`).set({
        listingId,
        address,
        price,
        beds,
        baths,
        images: []
      });
      
      properties.push({ index: i, address });
      console.log(`→ [${i + 1}/${containers.length}] Pushed: ${address}`);
    }

    await db.ref('listings/last_updated').set(Date.now());
    return properties;
  } catch (err) {
    console.error('❌ Info scraping failed:', err);
    throw err;
  }
}

async function processImages(properties) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${SEARCH_URL}?${new URLSearchParams(IDX_PARAMS).toString()}`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Get image counts per property
    const propertiesWithCounts = await page.$$eval(
      'a[href^="javascript:ImageViewerLightbox"]',
      anchors => anchors.map((a, index) => ({
        index,
        imageCount: parseInt((a.href.match(/ImageViewerLightbox\((\d+),/) || [,0])[1], 10)
      }))
    );

    // Merge counts into properties
    properties.forEach(p => {
      const match = propertiesWithCounts.find(pwc => pwc.index === p.index);
      p.imageCount = match ? match.imageCount : 0;
    });

    // Extract and process image links
    const html = await page.content();
    const rawLinks = Array.from(
      new Set(
        html.match(/https:\/\/matrixmedia\.marismatrix\.com\/MediaServer\/GetMedia\.ashx\?[^"'\s]+/gi) || []
      )
    ).map(link => link.replace(/&amp;/g, '&')
                     .replace(/%3a/gi, ':')
                     .replace(/%2f/gi, '/'));

    let validatedLinks = [];
    const seenUrls = new Set();

    const validateUrl = async (url) => {
      try {
        // Strict 2&exk parameter check (case-insensitive)
        const hasValidParam = /2&exk/i.test(url);
        if (!hasValidParam || seenUrls.has(url)) {
          console.log(`🚫 Rejected: ${url}`);
          return null;
        }

        const response = await axios.get(url, { 
          timeout: 5000,
          responseType: 'arraybuffer'
        });
        
        const valid = response.data.length > CONTENT_THRESHOLD &&
                      response.headers['content-type']?.startsWith('image/') &&
                      response.status === 200;

        return valid ? url : null;
      } catch (error) {
        return null;
      }
    };

    // Process links with concurrency control
    const semaphore = [];
    for (const link of rawLinks) {
      semaphore.push((async () => {
        const valid = await validateUrl(link);
        if (valid) {
          validatedLinks.push(valid);
        }
      })());

      if (semaphore.length >= MAX_CONCURRENT_REQUESTS) {
        await Promise.all(semaphore);
        semaphore.length = 0;
      }
    }
    await Promise.all(semaphore);

    // Final deduplication and filtering
    validatedLinks = [...new Set(validatedLinks)];

    // Map images to properties
    let currentIndex = 0;
    const usedUrls = new Set();

    for (const property of properties) {
      const requiredImages = property.imageCount;
      const availableImages = validatedLinks
        .slice(currentIndex, currentIndex + requiredImages)
        .filter(img => !usedUrls.has(img));

      availableImages.forEach(img => usedUrls.add(img));
      currentIndex += requiredImages;

      await db.ref(`listings/data/${property.index}`).update({ 
        images: availableImages,
        actualImages: availableImages.length
      });
      
      console.log(`\n📸 ${property.address}`);
      console.log(`   Images: ${availableImages.length}/${property.imageCount}`);
      availableImages.forEach(img => console.log(`   ${img}`));
    }

    console.log('\n✅ All images processed and stored in Firebase!');
  } finally {
    await browser.close();
  }
}

async function main() {
  const properties = await updateListings();
  await processImages(properties);
}

main().catch(error => {
  console.error('❌ Combined process failed:', error);
  process.exit(1);
});