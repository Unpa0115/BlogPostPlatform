'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Platforms page error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">エラーが発生しました</CardTitle>
          <CardDescription>
            プラットフォーム設定ページでエラーが発生しました。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            <p>エラー詳細: {error.message}</p>
            {error.digest && (
              <p className="mt-2 text-xs font-mono bg-gray-100 p-2 rounded">
                エラーID: {error.digest}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={reset} className="flex-1">
              再試行
            </Button>
            <Button 
              onClick={() => window.location.href = '/'} 
              variant="outline" 
              className="flex-1"
            >
              ホームに戻る
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 