const sqlite3 = require('sqlite3').verbose()
const path = require('path')

async function cleanupDuplicateNotifications() {
  const dbPath = path.join(__dirname, '../blogpostplatform.db')
  const db = new sqlite3.Database(dbPath)

  return new Promise((resolve, reject) => {
    console.log('=== CLEANUP DUPLICATE NOTIFICATIONS START ===')
    
    // 重複したYouTube認証通知を削除
    db.run(`
      DELETE FROM auth_notifications 
      WHERE platform_type = 'youtube' 
      AND notification_type = 'REAUTH_REQUIRED'
      AND id NOT IN (
        SELECT MIN(id) 
        FROM auth_notifications 
        WHERE platform_type = 'youtube' 
        AND notification_type = 'REAUTH_REQUIRED'
        GROUP BY user_id
      )
    `, function(err) {
      if (err) {
        console.error('Error deleting duplicate notifications:', err)
        reject(err)
        return
      }
      
      console.log(`Deleted ${this.changes} duplicate YouTube reauth notifications`)
      
      // 重複したYouTube警告通知を削除
      db.run(`
        DELETE FROM auth_notifications 
        WHERE platform_type = 'youtube' 
        AND notification_type = 'REAUTH_WARNING'
        AND id NOT IN (
          SELECT MIN(id) 
          FROM auth_notifications 
          WHERE platform_type = 'youtube' 
          AND notification_type = 'REAUTH_WARNING'
          GROUP BY user_id
        )
      `, function(err) {
        if (err) {
          console.error('Error deleting duplicate warning notifications:', err)
          reject(err)
          return
        }
        
        console.log(`Deleted ${this.changes} duplicate YouTube warning notifications`)
        
        // 残りの通知数を確認
        db.get(`
          SELECT COUNT(*) as total_notifications,
                 SUM(CASE WHEN platform_type = 'youtube' AND notification_type = 'REAUTH_REQUIRED' THEN 1 ELSE 0 END) as reauth_notifications,
                 SUM(CASE WHEN platform_type = 'youtube' AND notification_type = 'REAUTH_WARNING' THEN 1 ELSE 0 END) as warning_notifications
          FROM auth_notifications
        `, function(err, row) {
          if (err) {
            console.error('Error getting notification count:', err)
            reject(err)
            return
          }
          
          console.log('Notification summary:')
          console.log(`- Total notifications: ${row.total_notifications}`)
          console.log(`- YouTube reauth notifications: ${row.reauth_notifications}`)
          console.log(`- YouTube warning notifications: ${row.warning_notifications}`)
          
          console.log('=== CLEANUP DUPLICATE NOTIFICATIONS SUCCESS ===')
          db.close()
          resolve()
        })
      })
    })
  })
}

// スクリプトが直接実行された場合
if (require.main === module) {
  cleanupDuplicateNotifications()
    .then(() => {
      console.log('Cleanup completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Cleanup failed:', error)
      process.exit(1)
    })
}

module.exports = { cleanupDuplicateNotifications } 