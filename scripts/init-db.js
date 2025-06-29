const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function initializeDatabase() {
  const db = await open({
    filename: './blogpostplatform.db',
    driver: sqlite3.Database
  });

  // uploadsテーブルの作成
  await db.exec(`
    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      file_path TEXT NOT NULL,
      processed_file_path TEXT,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      status TEXT DEFAULT 'uploading',
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // インデックス作成
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_uploads_status ON uploads(status)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at)`);

  console.log('✅ Database tables created successfully');
  
  // 既存のaudio_filesからuploadsにデータを移行
  try {
    const audioFiles = await db.all('SELECT * FROM audio_files WHERE status = "completed"');
    console.log(`Found ${audioFiles.length} audio files to migrate`);
    
    for (const audioFile of audioFiles) {
      await db.run(`
        INSERT OR IGNORE INTO uploads (
          id, user_id, title, description, file_path, file_size, mime_type, status, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        audioFile.id,
        audioFile.user_id,
        audioFile.file_name,
        'Migrated from audio_files',
        audioFile.file_url,
        audioFile.file_size,
        'audio/mpeg', // デフォルトのMIMEタイプ
        'completed',
        audioFile.metadata || '{}',
        audioFile.created_at,
        audioFile.updated_at
      ]);
    }
    
    console.log(`✅ Migrated ${audioFiles.length} audio files to uploads table`);
  } catch (error) {
    console.log('No audio_files table found or migration failed:', error.message);
  }

  await db.close();
}

initializeDatabase().catch(console.error); 