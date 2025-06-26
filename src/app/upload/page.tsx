"use client"

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload, FileAudio, FileVideo, Clock } from 'lucide-react'

interface UploadItem {
  id: string
  title: string
  description: string
  category: string
  tags: string
  file_name: string
  file_size: number
  created_at: string
  status: string
}

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [category, setCategory] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [pastUploads, setPastUploads] = useState<UploadItem[]>([])
  const [showPastUploads, setShowPastUploads] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user, token } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (user && token) {
      fetchPastUploads()
    }
  }, [user, token])

  const fetchPastUploads = async () => {
    try {
      const response = await fetch('/api/uploads?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPastUploads(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch past uploads:', error)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    console.log('File selected:', file)
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    console.log('File dropped:', file)
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const handleFileAreaClick = () => {
    console.log('File area clicked')
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "エラー",
        description: "ファイルを選択してください。",
        variant: "destructive"
      })
      return
    }

    if (!title.trim()) {
      toast({
        title: "エラー",
        description: "タイトルを入力してください。",
        variant: "destructive"
      })
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('title', title)
      formData.append('description', description)
      formData.append('tags', tags)
      formData.append('category', category)

      const response = await fetch('/api/uploads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        toast({
          title: "アップロード完了",
          description: "ファイルが正常にアップロードされました。",
        })
        // フォームをリセット
        setSelectedFile(null)
        setTitle('')
        setDescription('')
        setTags('')
        setCategory('')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        // 過去のアップロード一覧を更新
        fetchPastUploads()
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "アップロードに失敗しました。",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const selectPastUpload = (upload: UploadItem) => {
    setTitle(upload.title)
    setDescription(upload.description)
    setTags(upload.tags)
    setCategory(upload.category)
    setShowPastUploads(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP')
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">新規アップロード</h2>
        <p className="text-gray-600 mt-2">動画・音声ファイルをアップロードして配信プラットフォームに投稿できます</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メインアップロードエリア */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                ファイルアップロード
              </CardTitle>
              <CardDescription>
                動画・音声ファイルを選択してアップロードしてください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ファイル選択エリア */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-gray-500 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={handleFileAreaClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleFileAreaClick()
                  }
                }}
              >
                {selectedFile ? (
                  <div className="text-center">
                    <div className="flex items-center gap-2 mb-2">
                      {selectedFile.type.startsWith('video/') ? (
                        <FileVideo className="h-8 w-8 text-blue-500" />
                      ) : (
                        <FileAudio className="h-8 w-8 text-green-500" />
                      )}
                      <span className="font-medium text-gray-900">{selectedFile.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatFileSize(selectedFile.size)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedFile(null)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                      className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                    >
                      ファイルを削除
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-gray-400 mb-4" />
                    <span className="text-lg font-medium">ここに動画・音声ファイルをドラッグ＆ドロップ</span>
                    <span className="text-sm mt-2">またはクリックしてファイルを選択</span>
                    <span className="text-xs mt-1 text-gray-400">対応形式: MP4, MOV, MP3, WAV, M4A</span>
                  </>
                )}
                {/* 隠しファイル入力 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,audio/*,.mp4,.mov,.mp3,.wav,.m4a"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* メタデータ入力 */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">タイトル</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="動画・音声のタイトル"
                  />
                </div>
                <div>
                  <Label htmlFor="description">説明文</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="動画・音声の説明文"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="tags">タグ</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="タグ（カンマ区切り）"
                  />
                </div>
                <div>
                  <Label htmlFor="category">カテゴリ</Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">カテゴリを選択してください</option>
                    <option value="podcast">Podcast</option>
                    <option value="music">Music</option>
                    <option value="talk">Talk</option>
                    <option value="interview">Interview</option>
                    <option value="news">News</option>
                  </select>
                </div>
                <Button 
                  onClick={handleUpload} 
                  disabled={isUploading || !selectedFile}
                  className="w-full"
                >
                  {isUploading ? 'アップロード中...' : 'アップロード'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 過去のアップロード選択エリア */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                過去のアップロード
              </CardTitle>
              <CardDescription>
                過去にアップロードしたファイルの設定を再利用できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pastUploads.length > 0 ? (
                <div className="space-y-3">
                  {pastUploads.slice(0, 5).map((upload) => (
                    <div
                      key={upload.id}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => selectPastUpload(upload)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {upload.file_name.includes('.mp4') || upload.file_name.includes('.mov') ? (
                          <FileVideo className="h-4 w-4 text-blue-500" />
                        ) : (
                          <FileAudio className="h-4 w-4 text-green-500" />
                        )}
                        <span className="font-medium text-sm truncate">{upload.title}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(upload.created_at)} • {formatFileSize(upload.file_size)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">過去のアップロードがありません</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 