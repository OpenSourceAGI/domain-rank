import domains from "../data/domains-1m.js";
import domainsOfficial from "../data/domains-official-1m.js";
import fs from "fs";
import { getDomainWithoutSuffix } from "tldts";
import {duplicates, removals, titles} from "./duplicates.js";

/**
 * Check if a domain should be removed based on removals list
 * @param {string} domain - The domain to check
 * @returns {boolean} True if domain should be removed, false otherwise
 */
function shouldRemoveDomain(domain) {
  for (const removal of removals) {
    if (removal.main === domain) {
      return true;
    }
  }
  return false;
}

/**
 * Find the main domain for a given domain using duplicates list
 * @param {string} domain - The domain to find main domain for
 * @returns {string|null} Main domain if found, null otherwise
 */
function findMainDomain(domain) {
  for (const duplicate of duplicates) {
    if (duplicate.alt && duplicate.alt.includes(domain)) {
      return duplicate.main;
    }
  }
  return null;
}

/**
 * Check if a domain has a title override
 * @param {string} domain - The domain to check
 * @returns {string|null} Title override if found, null otherwise
 */
function getTitleOverride(domain) {
  return titles[domain] || null;
}

/**
 * Get domain information including source title from various sources
 * @param {object} options { startIndex = 0, endIndex = 1000 }
 *
 * @example domainInfo({startIndex: 0, endIndex: 1000})
 */
export async function domainInfo(options = {}) {
  const { startIndex = 0, endIndex = 1000 } = options;

  const domainsArray = domains.split(",");
  const actualEndIndex = Math.min(endIndex, domainsArray.length);

  if (startIndex === 0) 
    fs.unlinkSync("./data/domain-info.json");

  // Check if file exists and remove it
  if (!fs.existsSync("./data/domain-info.json")) {
    fs.writeFileSync("./data/domain-info.json", "{}", "utf8");
  }

  var domainResults = JSON.parse(
    fs.readFileSync("./data/domain-info.json", "utf8")
  );

  console.log(
    `Processing domains from index ${startIndex} to ${actualEndIndex - 1}`
  );

  // Track actual rank (excluding skipped domains)
  let actualRank = Object.keys(domainResults).length ;

  for (
    let domainIndex = startIndex;
    domainIndex < actualEndIndex;
    domainIndex++
  ) {
    const domain = domainsArray[domainIndex];

    // Skip domains that should be removed based on removals list
    if (shouldRemoveDomain(domain)) {
      console.log(
        `Skipping ${domainIndex + 1}: ${domain} (marked for removal)`
      );
      continue;
    }

    // Check if this is an alternative domain that should be grouped under main
    const mainDomain = findMainDomain(domain);
    if (mainDomain) {
      console.log(
        `Skipping ${domainIndex + 1}: ${domain} (alternative domain for ${mainDomain})`
      );
      continue;
    }

    // Increment rank only for domains that are actually processed
    actualRank++;
    console.log(`Processing ${actualRank}: ${domain}`);

    // Check for title override first
    let source = getTitleOverride(domain);
    
    if (!source) {
      // Get source from domain name if no title override
      source = getDomainWithoutSuffix(domain);
      if (source) {
        const DOMAIN_ENDINGS_RE = /\.(com|net|org|io|gov|edu|co\.uk)$/i;
        if (DOMAIN_ENDINGS_RE.test(source)) {
          source = source.replace(DOMAIN_ENDINGS_RE, "");
        }
        
        // Split domain like theguardian or washpost into multiple words by inferring
        // word boundaries and capitalizing each word
        source = source
          // Insert space before uppercase letters that follow lowercase letters
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          // Insert space before numbers that follow letters
          .replace(/([a-zA-Z])(\d)/g, '$1 $2')
          // Insert space before letters that follow numbers
          .replace(/(\d)([a-zA-Z])/g, '$1 $2')
          // Handle common word patterns and abbreviations
          .replace(/([a-z])([A-Z][a-z])/g, '$1 $2')
          // Split on common word boundaries like 'post', 'news', 'times', etc.
          .replace(/(post|the|insider|news|times|daily|weekly|herald|tribune|journal|gazette|press|star|sun|mail|today|now|live|tv|radio|web|net|tech|blog|online|digital|media|corp|inc|ltd|llc)([a-z])/gi, '$1 $2')
          .replace(/([a-z])(post|news|the|insider|times|daily|weekly|herald|tribune|journal|gazette|press|star|sun|mail|today|now|live|tv|radio|web|net|tech|blog|online|digital|media|corp|inc|ltd|llc)/gi, '$1 $2')
          // Clean up multiple spaces
          .replace(/\s+/g, ' ')
          .replace(".com", "")
          .replace(/home/ig,'')
          .trim();
      
        // Define common stop words that should not be all caps
        const stopWords = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with']);
        
        // Process each word individually
        source = source.split(' ').map(word => {
          const lowerWord = word.toLowerCase();
          
          // If word is 3 chars or less and not a stop word, make it all uppercase
          if (word.length <= 3 && !stopWords.has(lowerWord)) {
            return word.toUpperCase();
          }
          // Otherwise just capitalize first letter
          else {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          }
        }).join(' ');
        
        // For overall small source names like CNN, make them all uppercase
        if (source.replace(/\s/g, '').length < 5) {
          source = source.toUpperCase();
        }
      }
    }

    // Try to get better source title from the website (only if no title override)
    if (!getTitleOverride(domain)) {
      const webSourceTitle = await getSourceTitle(domain);
      if (webSourceTitle) {
        // Clean up the web title - remove common suffixes and clean it
        const cleanedTitle = cleanSourceTitle(webSourceTitle)
        .replace(/homepage/ig,'')
        .replace(/home/ig,'')
        .replace(".com", "");
        if (cleanedTitle && cleanedTitle.length > 0) {
          // Check if title has 3 or more words - if so, use domain capitalization instead
          const wordCount = cleanedTitle
            .split(/\s+/)
            .filter((word) => word.length > 0).length;
          if (wordCount < 3) {
            source = cleanedTitle;
          }
          // If 3 or more words, keep the domain capitalization (source variable)
        }
      }
    }

    // Store in results object with actual rank
    domainResults[domain] = [actualRank, source || domain];

    // Append to JSON file
    fs.writeFileSync(
      "./data/domain-info.json",
      JSON.stringify(domainResults),
      "utf8"
    );
  }
}

/**
 * Clean up source title by removing common suffixes and cleaning the text
 * @param {string} title - The raw title to clean
 * @returns {string|null} Cleaned title or null if empty after cleaning
 */
function cleanSourceTitle(title) {
  if (!title) return null;

  let cleaned = title.trim();

  // Clean and normalize the title
  const TITLE_SPLITTERS_RE = /( [|\-\/:»] )|( - )|(\|)/;
  const DOMAIN_ENDINGS_RE = /\.(com|net|org|io|gov|edu|co\.uk)$/i;

  // Handle split titles
  if (TITLE_SPLITTERS_RE.test(cleaned)) {
    const splitTitle = cleaned.split(TITLE_SPLITTERS_RE);

    // Handle breadcrumbed titles
    if (splitTitle.length >= 2) {
      const longestPart = splitTitle.reduce(
        (acc, part) => (part?.length > acc?.length ? part : acc),
        ""
      );
      if (longestPart.length > 10) {
        cleaned = longestPart;
      }
    }
  }

  // Remove common website suffixes
  const suffixes = [
    " - Home",
    " | Home",
    " - Official Site",
    " | Official Site",
    " - Official Website",
    " | Official Website",
    " - Official",
    " | Official",
    " - Welcome",
    " | Welcome",
    " - Homepage",
    " | Homepage",
  ];

  for (const suffix of suffixes) {
    if (cleaned.endsWith(suffix)) {
      cleaned = cleaned.slice(0, -suffix.length);
    }
  }

  // Truncate title if it's too long
  if (cleaned.length > 150) {
    cleaned = cleaned.substring(0, 150);
  }

  // Strip any remaining HTML tags and normalize spaces
  cleaned = cleaned
    ?.replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Get source title for a domain
 * @param {string} domain - The domain to get source title for
 * @returns {string|null} Source title or null if not found
 */
async function getSourceTitle(domain) {
  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    // Try to get from domain homepage
    const response = await fetch(`https://${domain}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const html = await response.text();

    // Try Open Graph title
    const ogTitleMatch = html.match(
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i
    );
    if (ogTitleMatch) {
      return ogTitleMatch[1].trim();
    }

    // Try to extract title from various meta tags
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      return titleMatch[1].trim();
    }

    return null;
  } catch (error) {
    console.log(`Could not get source title for ${domain}: ${error.message}`);
    return null;
  }
}

domainInfo({ startIndex: 800, endIndex: 2000 });
