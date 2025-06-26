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
  })
  for (const item of options.items) {
    feed.addItem({
      title: item.title,
      id: item.url,
      link: item.url,
      description: item.description,
      date: item.date,
      author: item.author ? [{ name: item.author }] : undefined,
      enclosure: { url: item.url, type: 'audio/mpeg', length: item.duration?.toString() },
    })
  }
  const xml = feed.rss2()
  fs.writeFileSync(options.outputPath, xml)
  return xml
} 