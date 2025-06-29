import fs from 'fs'
import path from 'path'
import { Feed } from 'feed'

export interface RssAudioItem {
  title: string
  description: string
  url: string
  date: Date
  duration?: number
  author?: string
}

export interface RssFeedOptions {
  title: string
  description: string
  siteUrl: string
  feedUrl: string
  author: string
  items: RssAudioItem[]
  outputPath: string
}

export function generateSpotifyRssFeed(options: RssFeedOptions): string {
  const feed = new Feed({
    title: options.title,
    description: options.description,
    id: options.siteUrl,
    link: options.siteUrl,
    feedLinks: { rss: options.feedUrl },
    author: { name: options.author },
    copyright: `Copyright ${new Date().getFullYear()} ${options.author}`,
  })
  
  for (const item of options.items) {
    // URLの検証
    let enclosureUrl = item.url
    try {
      // 相対パスの場合は完全なURLに変換
      if (!item.url.startsWith('http://') && !item.url.startsWith('https://')) {
        enclosureUrl = new URL(item.url, options.siteUrl).href
      } else {
        new URL(item.url) // URLの妥当性チェック
      }
    } catch (error) {
      console.warn(`Invalid URL for item "${item.title}": ${item.url}`)
      continue // このアイテムをスキップ
    }

    feed.addItem({
      title: item.title,
      id: item.url,
      link: item.url,
      description: item.description,
      date: item.date,
      author: item.author ? [{ name: item.author }] : undefined,
      enclosure: { 
        url: enclosureUrl, 
        type: 'audio/mpeg', 
        length: item.duration 
      },
    })
  }
  
  const xml = feed.rss2()
  
  // ディレクトリが存在しない場合は作成
  const outputDir = path.dirname(options.outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  fs.writeFileSync(options.outputPath, xml)
  return xml
} 