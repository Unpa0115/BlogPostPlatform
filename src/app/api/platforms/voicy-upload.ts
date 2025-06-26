import { uploadToVoicy } from '@/lib/voicyClient'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await uploadToVoicy(body)
    if (result.success) {
      return NextResponse.json({ success: true, message: result.message })
    } else {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }
  } catch (error) {
    console.error('Voicy upload error:', error)
    return NextResponse.json({ error: 'Voicy upload failed' }, { status: 500 })
  }
} 