import { NextRequest, NextResponse } from 'next/server'
import { storage } from '@/lib/storage'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get('fileName')
    const userId = searchParams.get('userId')
    
    console.log('🔍 Upload lookup API called')
    console.log('File name:', fileName)
    console.log('User ID:', userId)
    
    if (!fileName) {
      return NextResponse.json(
        { error: 'fileName parameter is required' },
        { status: 400 }
      )
    }
    
    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      )
    }
    
    // データベースからファイル名でUUIDを検索
    try {
      const uploads = await storage.getAllUploads()
      console.log(`📊 Total uploads in database: ${uploads.length}`)
      
      // ファイル名に基づいてUUIDを検索
      const matchingUpload = uploads.find(upload => {
        // ファイルパスからファイル名を抽出
        const uploadFileName = upload.file_path.split('/').pop()
        return uploadFileName === fileName && upload.user_id === userId
      })
      
      if (matchingUpload) {
        console.log(`✅ Found upload for file ${fileName}:`, matchingUpload.id)
        return NextResponse.json({
          success: true,
          upload: {
            id: matchingUpload.id,
            title: matchingUpload.title,
            fileName: fileName,
            fileSize: matchingUpload.file_size,
            mimeType: matchingUpload.mime_type,
            createdAt: matchingUpload.created_at
          }
        })
      } else {
        console.log(`❌ No upload found for file: ${fileName}`)
        return NextResponse.json(
          { error: `No upload found for file: ${fileName}` },
          { status: 404 }
        )
      }
      
    } catch (dbError) {
      console.error('❌ Database error:', dbError)
      return NextResponse.json(
        { error: 'Database error occurred' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('❌ Upload lookup error:', error)
    return NextResponse.json(
      { error: 'Failed to lookup upload' },
      { status: 500 }
    )
  }
} 