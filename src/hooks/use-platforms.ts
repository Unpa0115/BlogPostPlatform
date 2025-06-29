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
    if (!user || !token) return

    try {
      const response = await fetch('/api/platforms', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
    return platforms.some(platform => 
      platform.platform_type === platformType && 
      platform.is_active && 
      platform.credentials
    )
  }

  const getPlatformCredentials = (platformType: 'voicy' | 'youtube' | 'spotify' | 'openai') => {
    const platform = platforms.find(p => p.platform_type === platformType)
    return platform?.credentials || null
  }

  const updatePlatformCredentials = async (
    platformType: 'voicy' | 'youtube' | 'spotify' | 'openai',
    credentials: any
  ) => {
    if (!user || !token) return false

    try {
      const response = await fetch('/api/platforms', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
    if (user && token) {
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