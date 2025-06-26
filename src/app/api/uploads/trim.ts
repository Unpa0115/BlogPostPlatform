import { NextRequest, NextResponse } from 'next/server'
import { trimAudio } from '@/lib/audioUtils'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const { filePath, start, duration, outputFileName } = await request.json()
    if (!filePath || typeof start !== 'number' || typeof duration !== 'number' || !outputFileName) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }
    const outputPath = path.join(path.dirname(filePath), outputFileName)
    await trimAudio(filePath, outputPath, start, duration)
    return NextResponse.json({ success: true, outputPath })
  } catch (error) {
    console.error('Trim error:', error)
    return NextResponse.json({ error: 'Trim failed' }, { status: 500 })
  }
} 