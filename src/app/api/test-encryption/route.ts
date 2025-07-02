import { NextResponse } from 'next/server'
import { PlatformCredentials } from '@/lib/encryption'

export async function GET() {
  try {
    console.log('=== ENCRYPTION TEST START ===')
    
    // テストデータ
    const testYouTubeCredentials = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token'
    }
    
    const testVoicyCredentials = {
      email: 'test@example.com',
      password: 'test-password'
    }
    
    const testSpotifyCredentials = {
      rssFeedUrl: 'https://example.com/feed.xml'
    }
    
    const testOpenAICredentials = {
      apiKey: 'sk-test-openai-key'
    }
    
    // 暗号化テスト
    console.log('Testing YouTube encryption...')
    const encryptedYouTube = PlatformCredentials.encryptYouTube(testYouTubeCredentials)
    const decryptedYouTube = PlatformCredentials.decryptYouTube(encryptedYouTube)
    
    console.log('Testing Voicy encryption...')
    const encryptedVoicy = PlatformCredentials.encryptVoicy(testVoicyCredentials)
    const decryptedVoicy = PlatformCredentials.decryptVoicy(encryptedVoicy)
    
    console.log('Testing Spotify encryption...')
    const encryptedSpotify = PlatformCredentials.encryptSpotify(testSpotifyCredentials)
    const decryptedSpotify = PlatformCredentials.decryptSpotify(encryptedSpotify)
    
    console.log('Testing OpenAI encryption...')
    const encryptedOpenAI = PlatformCredentials.encryptOpenAI(testOpenAICredentials)
    const decryptedOpenAI = PlatformCredentials.decryptOpenAI(encryptedOpenAI)
    
    // 結果の検証
    const tests = [
      {
        name: 'YouTube',
        success: JSON.stringify(decryptedYouTube) === JSON.stringify(testYouTubeCredentials),
        encrypted: encryptedYouTube.substring(0, 20) + '...',
        decrypted: decryptedYouTube
      },
      {
        name: 'Voicy',
        success: JSON.stringify(decryptedVoicy) === JSON.stringify(testVoicyCredentials),
        encrypted: encryptedVoicy.substring(0, 20) + '...',
        decrypted: decryptedVoicy
      },
      {
        name: 'Spotify',
        success: JSON.stringify(decryptedSpotify) === JSON.stringify(testSpotifyCredentials),
        encrypted: encryptedSpotify.substring(0, 20) + '...',
        decrypted: decryptedSpotify
      },
      {
        name: 'OpenAI',
        success: JSON.stringify(decryptedOpenAI) === JSON.stringify(testOpenAICredentials),
        encrypted: encryptedOpenAI.substring(0, 20) + '...',
        decrypted: decryptedOpenAI
      }
    ]
    
    const allTestsPassed = tests.every(test => test.success)
    
    console.log('=== ENCRYPTION TEST COMPLETE ===')
    console.log('All tests passed:', allTestsPassed)
    
    return NextResponse.json({
      success: allTestsPassed,
      message: allTestsPassed ? 'All encryption tests passed' : 'Some encryption tests failed',
      tests: tests,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasMasterKey: !!process.env.ENCRYPTION_MASTER_KEY,
        masterKeyLength: process.env.ENCRYPTION_MASTER_KEY ? process.env.ENCRYPTION_MASTER_KEY.length : 0
      }
    })
  } catch (error) {
    console.error('=== ENCRYPTION TEST ERROR ===')
    console.error('Encryption test error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Encryption test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasMasterKey: !!process.env.ENCRYPTION_MASTER_KEY,
        masterKeyLength: process.env.ENCRYPTION_MASTER_KEY ? process.env.ENCRYPTION_MASTER_KEY.length : 0
      }
    }, { status: 500 })
  }
} 