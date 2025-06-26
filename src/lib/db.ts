import Database from 'better-sqlite3';
import { join } from 'path';

const db = new Database(join(process.cwd(), 'rss_reader.db'));

export interface Feed {
  id: number;
  url: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  unreadCount?: number;
}

export interface Article {
  id: number;
  feed_id: number;
  title: string;
  description?: string;
  content?: string;
  full_content?: string;
  link: string;
  pub_date?: string;
  is_read: boolean;
  content_downloaded: boolean;
  content_downloaded_at?: string;
  featured_image?: string;
  created_at: string;
}

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feed_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    full_content TEXT,
    link TEXT UNIQUE NOT NULL,
    pub_date DATETIME,
    is_read BOOLEAN DEFAULT FALSE,
    content_downloaded BOOLEAN DEFAULT FALSE,
    content_downloaded_at DATETIME,
    featured_image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feed_id) REFERENCES feeds (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS article_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    original_url TEXT NOT NULL,
    local_path TEXT NOT NULL,
    alt_text TEXT,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
  CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON articles(pub_date);
  CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles(is_read);
`);

// Run migrations to add new columns to existing database
try {
  // Check if the new columns exist, if not add them
  const tableInfo = db.prepare("PRAGMA table_info(articles)").all() as Array<{name: string}>;
  const columnNames = tableInfo.map(col => col.name);
  
  if (!columnNames.includes('full_content')) {
    db.exec('ALTER TABLE articles ADD COLUMN full_content TEXT');
  }
  if (!columnNames.includes('content_downloaded')) {
    db.exec('ALTER TABLE articles ADD COLUMN content_downloaded BOOLEAN DEFAULT FALSE');
  }
  if (!columnNames.includes('content_downloaded_at')) {
    db.exec('ALTER TABLE articles ADD COLUMN content_downloaded_at DATETIME');
  }
  if (!columnNames.includes('featured_image')) {
    db.exec('ALTER TABLE articles ADD COLUMN featured_image TEXT');
  }
} catch (error) {
  console.log('Migration completed or columns already exist');
}

export const feedQueries = {
  getAll: db.prepare('SELECT * FROM feeds ORDER BY title'),
  getById: db.prepare('SELECT * FROM feeds WHERE id = ?'),
  insert: db.prepare('INSERT INTO feeds (url, title, description) VALUES (?, ?, ?)'),
  update: db.prepare('UPDATE feeds SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),
  delete: db.prepare('DELETE FROM feeds WHERE id = ?'),
};

export const articleQueries = {
  getAll: db.prepare('SELECT * FROM articles ORDER BY pub_date DESC'),
  getByFeedId: db.prepare('SELECT * FROM articles WHERE feed_id = ? ORDER BY pub_date DESC'),
  getUnread: db.prepare('SELECT * FROM articles WHERE is_read = FALSE ORDER BY pub_date DESC'),
  getUnreadByFeedId: db.prepare('SELECT * FROM articles WHERE feed_id = ? AND is_read = FALSE ORDER BY pub_date DESC'),
  getUnreadCountByFeedId: db.prepare('SELECT COUNT(*) as count FROM articles WHERE feed_id = ? AND is_read = FALSE'),
  getUndownloaded: db.prepare('SELECT * FROM articles WHERE content_downloaded = FALSE AND is_read = FALSE ORDER BY pub_date DESC'),
  insert: db.prepare('INSERT INTO articles (feed_id, title, description, content, link, pub_date) VALUES (?, ?, ?, ?, ?, ?)'),
  updateFullContent: db.prepare('UPDATE articles SET full_content = ?, featured_image = ?, content_downloaded = TRUE, content_downloaded_at = CURRENT_TIMESTAMP WHERE id = ?'),
  markAsRead: db.prepare('UPDATE articles SET is_read = TRUE WHERE id = ?'),
  markAsUnread: db.prepare('UPDATE articles SET is_read = FALSE WHERE id = ?'),
  deleteByFeedId: db.prepare('DELETE FROM articles WHERE feed_id = ?'),
  deleteOldContent: db.prepare("UPDATE articles SET full_content = NULL, content_downloaded = FALSE, content_downloaded_at = NULL WHERE content_downloaded_at < datetime('now', '-7 days')"),
  resetDownloadFlags: db.prepare('UPDATE articles SET content_downloaded = FALSE, content_downloaded_at = NULL, full_content = NULL, featured_image = NULL'),
  findByLink: db.prepare('SELECT * FROM articles WHERE link = ?'),
};

export const imageQueries = {
  insert: db.prepare('INSERT INTO article_images (article_id, original_url, local_path, alt_text, width, height, file_size) VALUES (?, ?, ?, ?, ?, ?, ?)'),
  getByArticleId: db.prepare('SELECT * FROM article_images WHERE article_id = ? ORDER BY id'),
  deleteByArticleId: db.prepare('DELETE FROM article_images WHERE article_id = ?'),
  getOld: db.prepare("SELECT local_path FROM article_images WHERE created_at < datetime('now', '-7 days')"),
  deleteOld: db.prepare("DELETE FROM article_images WHERE created_at < datetime('now', '-7 days')"),
};

export default db;