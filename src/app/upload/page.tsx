"use client"

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, FileAudio, FileVideo, Clock } from 'lucide-react'
import { DistributionManager } from '@/components/distribution-manager'
import { FileSelector } from '@/components/file-selector'

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
  const [selectedUploadedFiles, setSelectedUploadedFiles] = useState<string[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [category, setCategory] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [pastUploads, setPastUploads] = useState<UploadItem[]>([])
  const [showPastUploads, setShowPastUploads] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{id: string, filePath: string, mimeType: string} | null>(null)
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

  const handleUploadedFileSelect = (files: string[]) => {
    setSelectedUploadedFiles(files)
    console.log('Selected uploaded files:', files)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleUpload = async () => {
    if (!selectedFile && selectedUploadedFiles.length === 0) {
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
      let filePath = ''
      let mimeType = ''
      let uploadId = ''

      if (selectedFile) {
        // 新規ファイルアップロード
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('title', title)
        formData.append('description', description)
        formData.append('category', category)
        formData.append('tags', tags)

        const response = await fetch('/api/uploads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const result = await response.json()
        filePath = result.filePath
        mimeType = selectedFile.type
        uploadId = result.id
      } else {
        // 既存ファイルを使用
        filePath = selectedUploadedFiles[0]
        mimeType = 'audio/mpeg' // デフォルト
        uploadId = `existing-${Date.now()}`
      }

      setUploadedFile({
        id: uploadId,
        filePath,
        mimeType
      })

      toast({
        title: "アップロード完了",
        description: "ファイルのアップロードが完了しました。",
      })

      // フォームをリセット
      setSelectedFile(null)
      setSelectedUploadedFiles([])
      setTitle('')
      setDescription('')
      setTags('')
      setCategory('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "アップロードエラー",
        description: "ファイルのアップロードに失敗しました。",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">ファイルアップロード</h1>
            <p className="text-gray-600 mt-2">音声・動画ファイルをアップロードして配信プラットフォームに投稿できます</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowPastUploads(!showPastUploads)}
          >
            {showPastUploads ? '新規アップロード' : '過去のアップロード'}
          </Button>
        </div>

        {showPastUploads ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>過去のアップロード</CardTitle>
                <CardDescription>過去にアップロードしたファイルから選択してください</CardDescription>
              </CardHeader>
              <CardContent>
                <FileSelector
                  onFileSelect={handleUploadedFileSelect}
                  selectedFiles={selectedUploadedFiles}
                  multiple={false}
                  title="既存ファイル選択"
                  description="アップロード済みファイルから選択してください"
                />
              </CardContent>
            </Card>

            {/* メタデータ入力 */}
            <Card>
              <CardHeader>
                <CardTitle>メタデータ</CardTitle>
                <CardDescription>ファイルの情報を入力してください</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">タイトル *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="エピソードのタイトル"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">説明</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="エピソードの説明"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">カテゴリ</Label>
                    <Input
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="カテゴリ"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">タグ</Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="タグ（カンマ区切り）"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleUpload} 
                  disabled={isUploading || selectedUploadedFiles.length === 0}
                  className="w-full"
                >
                  {isUploading ? '処理中...' : '既存ファイルを使用'}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>新規アップロード</CardTitle>
              <CardDescription>新しいファイルをアップロードしてください</CardDescription>
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
                <div className="space-y-2">
                  <Label htmlFor="title">タイトル *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="エピソードのタイトル"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">説明</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="エピソードの説明"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">カテゴリ</Label>
                    <Input
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="カテゴリ"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">タグ</Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="タグ（カンマ区切り）"
                    />
                  </div>
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
        )}

        {/* 配信管理エリア（アップロード成功後に表示） */}
        {uploadedFile && (
          <div className="mt-6">
            <DistributionManager
              uploadId={uploadedFile.id}
              title={title || 'Untitled'}
              description={description || ''}
              filePath={uploadedFile.filePath}
              mimeType={uploadedFile.mimeType}
            />
          </div>
        )}
      </div>
    </div>
  )
} 