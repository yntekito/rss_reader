import { JSDOM } from 'jsdom';
import { join } from 'path';
import { mkdir, writeFile, access, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { articleQueries, imageQueries } from './db';

export interface DownloadedContent {
  fullContent: string;
  featuredImage?: string;
  images: DownloadedImage[];
}

export interface DownloadedImage {
  originalUrl: string;
  localPath: string;
  altText?: string;
  width?: number;
  height?: number;
  fileSize: number;
}

const STORAGE_DIR = join(process.cwd(), 'storage');
const IMAGES_DIR = join(STORAGE_DIR, 'images');

// Ensure storage directories exist
async function ensureDirectories() {
  try {
    await access(STORAGE_DIR);
  } catch {
    await mkdir(STORAGE_DIR, { recursive: true });
  }
  
  try {
    await access(IMAGES_DIR);
  } catch {
    await mkdir(IMAGES_DIR, { recursive: true });
  }
}

async function downloadImage(url: string, articleId: number): Promise<DownloadedImage | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader Bot)',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      throw new Error('Not an image');
    }
    
    const buffer = await response.arrayBuffer();
    const fileSize = buffer.byteLength;
    
    // Generate unique filename
    const urlObj = new URL(url);
    const extension = urlObj.pathname.split('.').pop() || 'jpg';
    const filename = `${articleId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
    const localPath = join(IMAGES_DIR, filename);
    const relativePath = `storage/images/${filename}`;
    
    await writeFile(localPath, Buffer.from(buffer));
    
    return {
      originalUrl: url,
      localPath: relativePath,
      fileSize,
    };
  } catch (error) {
    console.error('Error downloading image:', url, error);
    return null;
  }
}

export async function downloadArticleContent(articleId: number, articleUrl: string): Promise<DownloadedContent | null> {
  try {
    await ensureDirectories();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSS Reader Bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Extract content using the same selectors as before
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.content',
      'main',
      '.post-body',
      '.story-body',
      '.article-body',
      '.news-content',
      '.content-body',
      // CNET specific selectors
      '.body',
      '.article',
      '.article-wrap',
      '.c-pageArticle',
      '.c-shortcodeListicle',
      '.js-body',
      '#article-body',
      '.articleBody',
    ];
    
    let contentElement = null;
    let usedSelector = null;
    for (const selector of contentSelectors) {
      contentElement = document.querySelector(selector);
      if (contentElement) {
        usedSelector = selector;
        break;
      }
    }
    
    console.log('Content selector used:', usedSelector);
    
    if (!contentElement) {
      console.log('No content selector matched, trying alternative approach...');
      
      // Debug: Check what elements exist on the page
      const commonSelectors = ['main', '#main', '.main', '#content', '.content', '#article', '.article', '#post', '.post'];
      commonSelectors.forEach(sel => {
        const elem = document.querySelector(sel);
        if (elem) {
          console.log(`Found element with selector ${sel}, length: ${elem.innerHTML.length}`);
        }
      });
      
      // For CNET, try to get the entire body and filter out unwanted elements
      const bodyElement = document.querySelector('body');
      if (bodyElement) {
        // Clone the body
        contentElement = bodyElement.cloneNode(true) as Element;
        
        // Remove unwanted sections more aggressively
        const unwantedElements = contentElement.querySelectorAll(`
          header, nav, footer, aside, .header, .nav, .footer, .sidebar,
          .ad, .ads, .advertisement, .social, .share, .related,
          .comments, .comment, .newsletter, .subscription,
          script, style, noscript, iframe
        `);
        unwantedElements.forEach(el => el.remove());
        
        console.log('Using body element with cleanup, length:', contentElement.innerHTML.length);
      } else {
        // Fallback to paragraphs
        const paragraphs = document.querySelectorAll('p');
        if (paragraphs.length > 2) {
          contentElement = document.createElement('div');
          paragraphs.forEach(p => {
            if (p.textContent && p.textContent.trim().length > 50) {
              contentElement!.appendChild(p.cloneNode(true));
            }
          });
        }
      }
    }
    
    if (!contentElement) {
      console.log('No content element found for article:', articleId);
      return null;
    }
    
    console.log('Content element found, HTML length:', contentElement.innerHTML.length);
    console.log('Content preview:', contentElement.innerHTML.substring(0, 1000));
    
    // Check for all img elements in the entire document
    const allImages = document.querySelectorAll('img');
    console.log('Total img elements in document:', allImages.length);
    
    // Check for data-src attributes (lazy loading)
    const lazyImages = document.querySelectorAll('img[data-src], [data-lazy-src], [data-original]');
    console.log('Lazy loading images found:', lazyImages.length);
    
    // Remove unwanted elements
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer', 'aside',
      '.advertisement', '.ads', '.social-share', '.related-posts',
      '.comments', '.comment', '.sidebar', '.widget',
      '.social-media', '.newsletter', '.subscription',
      '[class*="ad-"]', '[id*="ad-"]', '[class*="social"]',
      '[class*="share"]', '[class*="related"]', '[class*="recommend"]'
    ];
    
    unwantedSelectors.forEach(selector => {
      const elements = contentElement!.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
    
    // Process lazy loading images first
    const lazyImagesInContent = contentElement.querySelectorAll('img[data-src], img[data-lazy-src], img[data-original]');
    lazyImagesInContent.forEach(img => {
      const dataSrc = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original');
      if (dataSrc) {
        img.setAttribute('src', dataSrc);
        console.log('Converted lazy loading image:', dataSrc);
      }
    });
    
    // Find and download images
    const images = contentElement.querySelectorAll('img');
    const downloadedImages: DownloadedImage[] = [];
    let featuredImage: string | undefined;
    
    console.log('Found', images.length, 'images in article content after lazy loading processing');
    
    for (const img of Array.from(images)) {
      let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original');
      if (!src || src.startsWith('data:')) {
        console.log('Skipping image with no src or data URL:', src);
        continue;
      }
      
      // Convert relative URLs to absolute
      const absoluteUrl = new URL(src, articleUrl).href;
      console.log('Downloading image:', absoluteUrl);
      
      const downloadedImage = await downloadImage(absoluteUrl, articleId);
      if (downloadedImage) {
        downloadedImages.push(downloadedImage);
        console.log('Image downloaded successfully:', downloadedImage.localPath);
        
        // Update img src to point to API route
        img.src = `/api/${downloadedImage.localPath}`;
        
        // Set the first image as featured image
        if (!featuredImage) {
          featuredImage = downloadedImage.localPath;
          console.log('Set featured image:', featuredImage);
        }
        
        // Store image metadata
        try {
          imageQueries.insert.run(
            articleId,
            downloadedImage.originalUrl,
            downloadedImage.localPath,
            img.alt || null,
            null, // width
            null, // height
            downloadedImage.fileSize
          );
          console.log('Image metadata stored for:', downloadedImage.localPath);
        } catch (error) {
          console.error('Error storing image metadata:', error);
        }
      } else {
        console.log('Failed to download image:', absoluteUrl);
      }
    }
    
    // Clean up remaining scripts and styles
    let fullContent = contentElement.innerHTML;
    fullContent = fullContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    fullContent = fullContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    return {
      fullContent,
      featuredImage,
      images: downloadedImages,
    };
    
  } catch (error) {
    console.error('Error downloading article content:', error);
    return null;
  }
}

export async function processUndownloadedArticles(): Promise<void> {
  try {
    const undownloadedArticles = articleQueries.getUndownloaded.all() as { 
      id: number; 
      title: string; 
      link: string; 
    }[];
    
    console.log('Found undownloaded articles:', undownloadedArticles.length);
    
    for (const article of undownloadedArticles) {
      if (article.link) {
        console.log('Downloading content for article:', article.id, article.title);
        console.log('Article URL:', article.link);
        
        const downloadedContent = await downloadArticleContent(article.id, article.link);
        
        if (downloadedContent) {
          articleQueries.updateFullContent.run(
            downloadedContent.fullContent,
            downloadedContent.featuredImage || null,
            article.id
          );
          console.log('Successfully downloaded content for article:', article.id, 'with featured image:', downloadedContent.featuredImage);
          console.log('Downloaded', downloadedContent.images.length, 'images');
        } else {
          // Mark as downloaded even if failed to avoid repeated attempts
          articleQueries.updateFullContent.run(null, null, article.id);
          console.log('Failed to download content for article:', article.id);
        }
        
        // Add delay to avoid overwhelming servers
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error('Error processing undownloaded articles:', error);
  }
}

export async function cleanupOldContent(): Promise<void> {
  try {
    // Get old images before deleting from database
    const oldImages = imageQueries.getOld.all() as { local_path: string }[];
    
    // Clean up old article content
    const result = articleQueries.deleteOldContent.run();
    console.log('Cleaned up old article content:', result.changes);
    
    // Delete actual image files from filesystem
    for (const image of oldImages) {
      try {
        const fullPath = join(process.cwd(), image.local_path);
        if (existsSync(fullPath)) {
          await unlink(fullPath);
          console.log('Deleted image file:', image.local_path);
        }
      } catch (error) {
        console.error('Error deleting image file:', image.local_path, error);
      }
    }
    
    // Clean up old images from database
    const imageResult = imageQueries.deleteOld.run();
    console.log('Cleaned up old images from database:', imageResult.changes);
    
  } catch (error) {
    console.error('Error cleaning up old content:', error);
  }
}