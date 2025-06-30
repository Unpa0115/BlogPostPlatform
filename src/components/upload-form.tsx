"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Rss, AudioLines, FileAudio } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { FileSelector } from './file-selector'
import { Badge } from "@/components/ui/badge"

interface UploadFormProps {
  onUploadComplete?: (fileId: string) => void
}

export function UploadForm({ onUploadComplete }: UploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedUploadedFilePath, setSelectedUploadedFilePath] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [metadata, setMetadata] = useState({
    title: "",
    description: "",
    tags: "",
    category: ""
  })
  const { toast } = useToast()
  const [rssUrl, setRssUrl] = useState<string>("")
  const [rssEpisodes, setRssEpisodes] = useState<any[]>([])
  const [rssLoading, setRssLoading] = useState(false)
  const [rssError, setRssError] = useState<string | null>(null)
  const [selectedRssEpisode, setSelectedRssEpisode] = useState<any | null>(null)

  // RSS URLの初期化（localStorageから）
  useEffect(() => {
    const saved = localStorage.getItem("input_rss_url")
    if (saved) setRssUrl(saved)
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // ファイル形式チェック
      const allowedTypes = [
        'video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/wmv',
        'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/mpeg',
        'audio/mp4', 'audio/x-m4a', 'audio/x-mpeg-3', 'audio/mpeg3'
      ]

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "エラー",
          description: "サポートされていないファイル形式です。",
          variant: "destructive"
        })
        return
      }

      // ファイルサイズチェック（2GB制限）
      if (file.size > 2 * 1024 * 1024 * 1024) {
        toast({
          title: "エラー",
          description: "ファイルサイズが大きすぎます（2GB以下にしてください）。",
          variant: "destructive"
        })
        return
      }

      setSelectedFile(file)
      setUploadProgress(0)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('metadata', JSON.stringify(metadata))

      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()
      
      toast({
        title: "アップロード完了",
        description: "ファイルのアップロードが完了しました。",
      })

      setUploadProgress(100)
      onUploadComplete?.(result.data.id)
      
      // フォームをリセット
      setSelectedFile(null)
      setMetadata({ title: "", description: "", tags: "", category: "" })
      setUploadProgress(0)

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

  const handleRssEpisodeSelect = (episode: any) => {
    // TODO: RSSエピソード選択機能の実装
    toast({
      title: "RSS機能",
      description: "RSSエピソード選択機能は開発中です。",
    })
  }

  // アップロード済みファイルの配信処理
  const handleUploadedFileDistribute = async () => {
    if (!selectedUploadedFilePath) return
    try {
      // ここで配信APIを呼び出す（例: /api/jobs POST など）
      // 必要に応じてメタデータやプラットフォーム情報も渡す
      toast({ title: '配信リクエスト送信', description: '配信処理を開始しました。' })
      // TODO: 実際の配信API呼び出し実装
    } catch (e) {
      toast({ title: '配信エラー', description: '配信に失敗しました。', variant: 'destructive' })
    }
  }

  // RSSエピソード取得
  const fetchRssEpisodes = async (url: string) => {
    setRssLoading(true)
    setRssError(null)
    try {
      const res = await fetch(`/api/rss/info?url=${encodeURIComponent(url)}`)
      if (!res.ok) throw new Error("RSS取得失敗")
      const data = await res.json()
      setRssEpisodes(data.episodes || [])
    } catch (e: any) {
      setRssError(e.message || "RSS取得エラー")
      setRssEpisodes([])
    } finally {
      setRssLoading(false)
    }
  }

  // RSS URL保存
  const handleSaveRssUrl = () => {
    localStorage.setItem("input_rss_url", rssUrl)
    fetchRssEpisodes(rssUrl)
    toast({ title: "RSS URLを保存", description: "エピソードを取得しました。" })
  }

  // RSSエピソード配信
  const handleRssDistribute = async () => {
    if (!selectedRssEpisode) return
    try {
      // TODO: 実際の配信API呼び出し実装
      toast({ title: '配信リクエスト送信', description: 'RSSエピソードの配信処理を開始しました。' })
    } catch (e) {
      toast({ title: '配信エラー', description: '配信に失敗しました。', variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>新規アップロード</CardTitle>
        <CardDescription>
          ファイルをアップロードするか、RSSフィードからエピソードを選択してください
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              新規アップロード
            </TabsTrigger>
            <TabsTrigger value="uploaded" className="flex items-center gap-2">
              <AudioLines className="h-4 w-4" />
              アップロード済みファイル
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">音声・動画ファイル</Label>
              <Input
                id="file"
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileAudio className="h-4 w-4" />
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">タイトル</Label>
                  <Input
                    id="title"
                    value={metadata.title}
                    onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="エピソードのタイトル"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">説明</Label>
                  <Textarea
                    id="description"
                    value={metadata.description}
                    onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="エピソードの説明"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tags">タグ</Label>
                    <Input
                      id="tags"
                      value={metadata.tags}
                      onChange={(e) => setMetadata(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="カンマ区切りでタグを入力"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">カテゴリ</Label>
                    <Input
                      id="category"
                      value={metadata.category}
                      onChange={(e) => setMetadata(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="カテゴリ"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleUpload} 
                  disabled={isUploading}
                  className="w-full"
                >
                  {isUploading ? "アップロード中..." : "アップロード"}
                </Button>
              </div>
            )}

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">
                    アップロード中...
                  </span>
                  <span className="text-gray-500">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="uploaded" className="mt-4">
            <FileSelector
              onFileSelect={(files) => setSelectedUploadedFilePath(files[0] || null)}
              multiple={false}
              title="アップロード済みファイル一覧"
              description="過去にアップロードしたファイルから選択して配信できます"
            />
            {selectedUploadedFilePath && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <Button onClick={handleUploadedFileDistribute} className="w-48">配信する</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 