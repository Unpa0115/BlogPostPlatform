"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileAudio, Play, Download, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useToast } from '@/hooks/use-toast'

interface AudioFile {
  id: string
  file_name: string
  file_url: string
  file_size: number
  duration: number | null
  status: 'uploading' | 'processing' | 'completed' | 'error'
  metadata: Record<string, any>
  created_at: string
}

export function RecentUploads() {
  const [uploads, setUploads] = useState<AudioFile[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUploads = async () => {
      try {
        const response = await fetch('/api/uploads?limit=5', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setUploads(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch uploads:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUploads()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploading':
        return <Badge variant="secondary">アップロード中</Badge>
      case 'processing':
        return <Badge variant="default">処理中</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">完了</Badge>
      case 'error':
        return <Badge variant="destructive">エラー</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // ファイル再取得
  const refreshUploads = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/uploads?limit=5', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setUploads(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch uploads:', error)
    } finally {
      setLoading(false)
    }
  }

  // ダウンロード処理
  const handleDownload = async (fileName: string) => {
    try {
      const res = await fetch(`/api/uploads?file=${encodeURIComponent(fileName)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (!res.ok) throw new Error('ダウンロード失敗')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast({ title: 'ダウンロード完了', description: 'ファイルをダウンロードしました。' })
    } catch (e) {
      toast({ title: 'ダウンロード失敗', description: 'ファイルのダウンロードに失敗しました。', variant: 'destructive' })
    }
  }

  // 削除処理
  const handleDelete = async (fileName: string) => {
    if (!window.confirm('本当にこのファイルを削除しますか？')) return
    setDeletingId(fileName)
    try {
      const res = await fetch(`/api/uploads?file=${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (!res.ok) throw new Error('削除失敗')
      toast({ title: '削除完了', description: 'ファイルを削除しました。' })
      await refreshUploads()
    } catch (e) {
      toast({ title: '削除失敗', description: 'ファイルの削除に失敗しました。', variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  // 再アップロード処理
  const handleReupload = async (fileName: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*,video/*'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      const formData = new FormData()
      formData.append('file', file)
      formData.append('metadata', '{}')
      try {
        const res = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        if (!res.ok) throw new Error('アップロード失敗')
        toast({ title: '再アップロード完了', description: 'ファイルを再アップロードしました。' })
        await refreshUploads()
      } catch (e) {
        toast({ title: 'アップロード失敗', description: 'ファイルの再アップロードに失敗しました。', variant: 'destructive' })
      }
    }
    input.click()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>最近のアップロード</CardTitle>
          <CardDescription>最近アップロードされたファイル一覧</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>最近のアップロード</CardTitle>
        <CardDescription>最近アップロードされたファイル一覧</CardDescription>
      </CardHeader>
      <CardContent>
        {uploads.length === 0 ? (
          <div className="text-center py-8">
            <FileAudio className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">まだアップロードされたファイルがありません</p>
          </div>
        ) : (
          <div className="space-y-4">
            {uploads.map((upload) => (
              <div key={upload.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileAudio className="h-6 w-6 text-gray-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {upload.metadata?.title || upload.file_name}
                    </h4>
                    {getStatusBadge(upload.status)}
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                    <span>{formatFileSize(upload.file_size)}</span>
                    {upload.duration && (
                      <span>{formatDuration(upload.duration)}</span>
                    )}
                    <span>{new Date(upload.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => handleReupload(upload.file_name)}>
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDownload(upload.file_name)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(upload.file_name)} disabled={deletingId === upload.file_name}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 