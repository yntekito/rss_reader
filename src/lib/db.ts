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
}

export interface Article {
  id: number;
  feed_id: number;
  title: string;
  description?: string;
  content?: string;
  link: string;
  pub_date?: string;
  is_read: boolean;
  created_at: string;
}

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
    link TEXT UNIQUE NOT NULL,
    pub_date DATETIME,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feed_id) REFERENCES feeds (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
  CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON articles(pub_date);
  CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles(is_read);
`);

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
  insert: db.prepare('INSERT INTO articles (feed_id, title, description, content, link, pub_date) VALUES (?, ?, ?, ?, ?, ?)'),
  markAsRead: db.prepare('UPDATE articles SET is_read = TRUE WHERE id = ?'),
  markAsUnread: db.prepare('UPDATE articles SET is_read = FALSE WHERE id = ?'),
  deleteByFeedId: db.prepare('DELETE FROM articles WHERE feed_id = ?'),
  findByLink: db.prepare('SELECT * FROM articles WHERE link = ?'),
};

export default db;