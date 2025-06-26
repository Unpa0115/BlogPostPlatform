import { google, youtube_v3 } from 'googleapis'

export interface YoutubeUploadOptions {
  accessToken: string
  refreshToken: string
  clientId: string
  clientSecret: string
  title: string
  description?: string
  tags?: string[]
  categoryId?: string
  privacyStatus?: 'private' | 'public' | 'unlisted'
  filePath: string
  mimeType?: string
}

export async function uploadToYoutube(options: YoutubeUploadOptions): Promise<youtube_v3.Schema$Video> {
  const oauth2Client = new google.auth.OAuth2(
    options.clientId,
    options.clientSecret
  )
  oauth2Client.setCredentials({
    access_token: options.accessToken,
    refresh_token: options.refreshToken
  })

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client })

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: options.title,
        description: options.description,
        tags: options.tags,
        categoryId: options.categoryId || '22',
      },
      status: {
        privacyStatus: options.privacyStatus || 'unlisted',
      },
    },
    media: {
      body: require('fs').createReadStream(options.filePath),
      mimeType: options.mimeType,
    },
  })
  return res.data
}

export async function getYoutubeVideoInfo(videoId: string, accessToken: string) {
  const youtube = google.youtube({ version: 'v3', auth: accessToken })
  const res = await youtube.videos.list({
    part: ['snippet', 'status', 'contentDetails'],
    id: [videoId],
  })
  return res.data.items?.[0]
} 