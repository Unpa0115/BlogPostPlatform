import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'

interface Platform {
  id: string
  platform_type: 'voicy' | 'youtube' | 'spotify' | 'openai'
  platform_name: string
  is_active: boolean
  created_at: string
  updated_at: string
  credentials?: {
    clientId?: string
    clientSecret?: string
    email?: string
    password?: string
    rssFeedUrl?: string
    apiKey?: string
    accessToken?: string
    refreshToken?: string
  }
}

export function usePlatforms() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const { user, token } = useAuth()

  const fetchPlatforms = async () => {
    // localhost環境では認証チェックをスキップ
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      window.location.hostname.startsWith('192.168.')
    )

    if (!isLocalhost && (!user || !token)) return

    try {
      const headers: Record<string, string> = {}
      
      // localhost環境以外では認証ヘッダーを追加
      if (!isLocalhost && token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/platforms', {
        headers
      })
      
      if (response.ok) {
        const data = await response.json()
        setPlatforms(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch platforms:', error)
    } finally {
      setLoading(false)
    }
  }

  const isPlatformConfigured = (platformType: 'voicy' | 'youtube' | 'spotify' | 'openai') => {
    console.log('=== Platform Configuration Check ===')
    console.log('Checking platform:', platformType)
    console.log('Available platforms:', platforms)
    
    const isConfigured = platforms.some(platform => 
      platform.platform_type === platformType && 
      platform.is_active && 
      platform.credentials
    )
    
    console.log('Is configured:', isConfigured)
    return isConfigured
  }

  const getPlatformCredentials = (platformType: 'voicy' | 'youtube' | 'spotify' | 'openai') => {
    const platform = platforms.find(p => p.platform_type === platformType)
    return platform?.credentials || null
  }

  const updatePlatformCredentials = async (
    platformType: 'voicy' | 'youtube' | 'spotify' | 'openai',
    credentials: any
  ) => {
    // localhost環境では認証チェックをスキップ
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      window.location.hostname.startsWith('192.168.')
    )

    if (!isLocalhost && (!user || !token)) return false

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      // localhost環境以外では認証ヘッダーを追加
      if (!isLocalhost && token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/platforms', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          platform_type: platformType,
          credentials
        })
      })
      
      if (response.ok) {
        // プラットフォームリストを再取得
        await fetchPlatforms()
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to update platform credentials:', error)
      return false
    }
  }

  const getOpenAIKey = () => {
    const credentials = getPlatformCredentials('openai')
    return credentials?.apiKey || null
  }

  useEffect(() => {
    // localhost環境では認証チェックをスキップ
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      window.location.hostname.startsWith('192.168.')
    )

    if (isLocalhost || (user && token)) {
      fetchPlatforms()
    }
  }, [user, token])

  return {
    platforms,
    loading,
    isPlatformConfigured,
    getPlatformCredentials,
    updatePlatformCredentials,
    getOpenAIKey,
    refetch: fetchPlatforms
  }
} 