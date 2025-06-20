const Database = require('better-sqlite3');
const db = new Database('./rss_reader.db');

console.log('=== RSS Reader Database Contents ===\n');

// Show feeds
console.log('FEEDS:');
const feeds = db.prepare('SELECT * FROM feeds').all();
console.table(feeds);

// Show articles
console.log('\nARTICLES:');
const articles = db.prepare('SELECT id, feed_id, title, link, is_read, pub_date FROM articles ORDER BY pub_date DESC LIMIT 10').all();
console.table(articles);

// Show counts
console.log('\nSTATISTICS:');
const feedCount = db.prepare('SELECT COUNT(*) as count FROM feeds').get();
const articleCount = db.prepare('SELECT COUNT(*) as count FROM articles').get();
const unreadCount = db.prepare('SELECT COUNT(*) as count FROM articles WHERE is_read = 0').get();

console.log(`Total Feeds: ${feedCount.count}`);
console.log(`Total Articles: ${articleCount.count}`);
console.log(`Unread Articles: ${unreadCount.count}`);

db.close();