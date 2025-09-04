import fs from "fs";
import zlib from "zlib";
import readline from "readline";
import { writeFile } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import { Readable } from 'stream';
import unzipper from 'unzipper';




/**
 * Domain Rank shows how trustworthy and influential a domain is based on links pointing to that
 *  domain's pages across all 120+ million domains.
 *
 * @see [CommonCrawl](https://commoncrawl.org/web-graphs)
 * CommonCrawl is a nonprofit for open source public dataset that crawls and downloads the entire
 *  internet 100TB urls and html. CommonCrawl calculates domain rank for 100M domains, using
 *  PageRank algorithm which randomly surfs links and counts travels to each page to find 
 * probability of being at a domain, thus ranking influence among other reputable domains.
 */
export async function importDomainsPageRankCrawler(urlCommonCrawl = '', limit = 1000000) {
  const url = urlCommonCrawl || await getDomainCrawlerUrl();

  try {
    const { Readable } = require('stream');

    // Create output directory if it doesn't exist
    if (!fs.existsSync("./data")) {
      fs.mkdirSync("./data", { recursive: true });
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Delete file if it exists
    try {
      fs.unlinkSync("./data/domains-1m.js");
    } catch (err) {  }

    const writeStream = fs.createWriteStream("./data/domains-1m.js", { flags: "w" });

    let lineNum = 0;
    let headerProcessed = false;

    writeStream.write("export default '");

    // Progress tracking
    const ticker = setInterval(() => {
      console.log(`Processed lines: ${lineNum.toLocaleString()}`);
      if (lineNum >= limit) {
        clearInterval(ticker);
      }
    }, 5000);

    // Convert fetch response body to Node.js readable stream
    const nodeStream = Readable.from(response.body);

    // Create gunzip stream
    const gunzip = zlib.createGunzip();

    // Pipe through gunzip
    const decompressedStream = nodeStream.pipe(gunzip);

    // Create readline interface
    const rl = readline.createInterface({
      input: decompressedStream,
      crlfDelay: Infinity
    });

    let streamClosed = false;

    function closeStream() {
      if (!streamClosed) {
        streamClosed = true;
        // Remove the trailing comma from the last domain entry
        writeStream.write('\b');
        writeStream.write("'");
        writeStream.end();
        clearInterval(ticker);
        console.log(`Output file: ./data/domains-1m.js`);
      }
    }

    rl.on('line', (line) => {
      try {
        if (streamClosed) return;

        // Skip header line
        if (!headerProcessed) {
          if (line.includes("#host_rev")) {
            headerProcessed = true;
            return;
          }
        }

        const parts = line.split("\t");
        if (parts.length < 5) return;

        const domain = parts[4];
        if (!domain || domain === "#host_rev") return;

        // Reverse domain for sorting purposes
        const reversedDomain = domain.split(".").reverse().join(".");

        // Write domain to file
        writeStream.write(`${reversedDomain},`);

        lineNum++;

        // Check if we've reached our limit
        if (lineNum >= limit) {
          rl.close();
          closeStream();
          return;
        }
      } catch (error) {
        console.error("Error processing line:", error);
      }
    });

    rl.on('close', () => {
      if (!streamClosed) {
        closeStream();
      }
    });

    rl.on('error', (error) => {
      console.error("Readline error:", error);
      clearInterval(ticker);
    });

  } catch (error) {
    console.error("Error:", error);
  }
}


/**
 * Scrapes Common Crawl web graphs page to find the domain-ranks.txt.gz URL
 * from the first available date listing.
 * 
 * @returns {Promise<string>} The full URL to the domain-ranks.txt.gz file
 * @throws {Error} When HTTP requests fail, date links are not found, or domain-ranks.txt.gz is not found
 */
export async function getDomainCrawlerUrl() {
  // Fetch main web graphs page
  const mainResponse = await fetch('https://commoncrawl.org/web-graphs', { timeout: 10000 });
  if (!mainResponse.ok) throw new Error(`HTTP ${mainResponse.status}`);
  const mainHtml = await mainResponse.text();

  // Find first date link using regex
  const datePattern = /href="([^"]*\d{4}-\w+[^"]*)"/;
  const dateMatch = mainHtml.match(datePattern);
  if (!dateMatch) throw new Error('No date link found');

  const dateUrl = dateMatch[1].startsWith('http')
    ? dateMatch[1]
    : `https://commoncrawl.org${dateMatch[1]}`;

  // Fetch date page and find domain-ranks.txt.gz
  const dateResponse = await fetch(dateUrl, { timeout: 10000 });
  if (!dateResponse.ok) throw new Error(`HTTP ${dateResponse.status}`);
  const dateHtml = await dateResponse.text();

  const rankPattern = /href="([^"]*domain-ranks\.txt\.gz[^"]*)"/;
  const rankMatch = dateHtml.match(rankPattern);
  if (!rankMatch) throw new Error('domain-ranks.txt.gz not found');

  return rankMatch[1].startsWith('http')
    ? rankMatch[1]
    : `https://commoncrawl.org${rankMatch[1]}`;
}



/**
 * Download and extract the current Tranco top-1M domain ranking.
 *
 * The Tranco project aggregates multiple ranking providers (Cisco Umbrella,
 * Majestic, Farsight, Chrome UX Report, Cloudflare Radar) to generate
 * manipulation-resistant popularity lists. The list is updated daily (UTC).
 *
 * Source: https://tranco-list.eu/
 * Default dataset: https://tranco-list.eu/top-1m.csv.zip
 */

async function importDomainsOfficialList() {
  const url = 'https://tranco-list.eu/top-1m.csv.zip';
  const output = './data/domains-official-1m.js';
  
  console.log('Streaming download and extraction...');
  
  const response = await fetch(url);
  const domains = [];
  let isFirstLine = true;
  
  await pipeline(
      Readable.fromWeb(response.body),
      unzipper.ParseOne(),
      new Transform({
          objectMode: false,
          transform(chunk, encoding, callback) {
              const lines = chunk.toString().split('\n');
              
              for (const line of lines) {
                  if (isFirstLine) {
                      isFirstLine = false;
                      continue; // Skip header
                  }
                  
                  const domain = line.split(',')[1]?.replace(/"/g, '').trim();
                  if (domain) domains.push(domain);
              }
              
              callback();
          }
      })
  );
  
  await writeFile(output, `export default '${domains.join(',')}';`);
  console.log(`Saved ${domains.length} domains to ${output}`);
}



//if run directly
if (import.meta.main) {
  // importDomainsPageRankCrawler();
  importDomainsOfficialList();
}