import { uploadToYoutube } from '@/lib/youtubeClient'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // 必要なパラメータを取得
    const {
      accessToken,
      refreshToken,
      clientId,
      clientSecret,
      title,
      description,
      tags,
      categoryId,
      privacyStatus,
      filePath,
      mimeType
    } = body

    if (!accessToken || !refreshToken || !clientId || !clientSecret || !title || !filePath) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), { status: 400 })
    }

    const video = await uploadToYoutube({
      accessToken,
      refreshToken,
      clientId,
      clientSecret,
      title,
      description,
      tags,
      categoryId,
      privacyStatus,
      filePath,
      mimeType
    })

    return new Response(JSON.stringify({ success: true, video }), { status: 200 })
  } catch (error) {
    console.error('YouTube upload error:', error)
    return new Response(JSON.stringify({ error: 'YouTube upload failed' }), { status: 500 })
  }
} 