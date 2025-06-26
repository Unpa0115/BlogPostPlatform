import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudioWhisper } from '@/lib/audioUtils'

export async function POST(request: NextRequest) {
  try {
    const { filePath, openaiApiKey } = await request.json()
    if (!filePath || !openaiApiKey) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }
    const transcript = await transcribeAudioWhisper(filePath, openaiApiKey)
    return NextResponse.json({ success: true, transcript })
  } catch (error) {
    console.error('Transcribe error:', error)
    return NextResponse.json({ error: 'Transcribe failed' }, { status: 500 })
  }
} 