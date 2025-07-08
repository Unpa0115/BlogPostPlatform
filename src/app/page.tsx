"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Upload, FileAudio, FileVideo } from "lucide-react"
import { StatsCards } from "@/components/stats-cards"
import { RecentUploads } from "@/components/recent-uploads"
import { DistributionManager } from "@/components/distribution-manager"
import { useToast } from "@/hooks/use-toast"
import { usePlatforms } from "@/hooks/use-platforms"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthNotifications } from '@/components/auth-notifications'
import { RssFeedManager } from '@/components/rss-feed-manager'
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

/**
 * 2024/07/01 UI改修
 * ルート画面上部にタブを追加し、
 * 「新規アップロード」と「RSS Feed管理・配信」画面を切り替えられるようにしました。
 * Shadcn/uiのTabsコンポーネントを利用。
 * 
 * 2025/01/28 localhost専用設定
 * 認証チェックを削除し、localhost専用のダッシュボードとして動作
 */

export default function Dashboard() {
  const { toast } = useToast()
  const { getOpenAIKey } = usePlatforms()

  // アップロード・配信用状態
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedFile, setUploadedFile] = useState<{id: string, filePath: string, mimeType: string, fileSize?: number} | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [metadata, setMetadata] = useState({
    title: "",
    description: "",
    tags: "",
    category: ""
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 前処理用state
  const [isPreprocessing, setIsPreprocessing] = useState(false)
  const [preprocessedFile, setPreprocessedFile] = useState<{id: string, filePath: string, mimeType: string} | null>(null)
  const [preprocessAvailable, setPreprocessAvailable] = useState(false)
  const [keyword, setKeyword] = useState("")
  const [trimSilence, setTrimSilence] = useState(false)
  const keywords = ["イントロ", "本題", "まとめ", "キーワードA", "キーワードB"] // 仮

  // ファイル選択時に自動アップロード
  useEffect(() => {
    if (selectedFile) {
      handleUpload()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile])

  // ファイル選択時に前処理Availableに
  useEffect(() => {
    setPreprocessAvailable(!!selectedFile || !!uploadedFile)
  }, [selectedFile, uploadedFile])

  // ドラッグ＆ドロップ用ハンドラ
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) {
      setSelectedFile(file)
    }
  }
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }
  const handleFileAreaClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // ファイル形式・サイズチェック
      const allowedTypes = [
        'video/mp4', 'video/avi', 'video/mov', 'video/quicktime', 'video/wmv',
        'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac', 'audio/mpeg',
        'audio/mp4', 'audio/x-m4a', 'audio/x-mpeg-3', 'audio/mpeg3'
      ]
      if (!allowedTypes.includes(file.type)) {
        toast({ title: "エラー", description: "サポートされていないファイル形式です。", variant: "destructive" })
        return
      }
      if (file.size > 2 * 1024 * 1024 * 1024) {
        toast({ title: "エラー", description: "ファイルサイズが大きすぎます（2GB以下にしてください）。", variant: "destructive" })
        return
      }
      setSelectedFile(file)
    }
  }

  // ファイルアップロード（選択時に自動実行）
  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('metadata', JSON.stringify(metadata))
      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      })
      if (!response.ok) throw new Error('Upload failed')
      const result = await response.json()
      toast({ title: "アップロード完了", description: "ファイルのアップロードが完了しました。" })
      setUploadedFile({
        id: result.data.file_name,
        filePath: result.data.file_name,
        mimeType: selectedFile.type,
        fileSize: selectedFile.size
      })
      setSelectedFile(null)
      setMetadata({ title: "", description: "", tags: "", category: "" })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      toast({ title: "アップロードエラー", description: "ファイルのアップロードに失敗しました。", variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  // 配信対象ファイルは前処理済みがあればそれを優先
  const distributionFile = preprocessedFile || uploadedFile
  const isDistributionDisabled = !distributionFile

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">BlogPostPlatform - localhost</h1>
          <p className="text-gray-600 mt-2">音声ファイルのアップロードと配信管理を行います（localhost専用）</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 認証通知 */}
          <div className="lg:col-span-1">
            <AuthNotifications userId="localhost-user" />
          </div>

          {/* 統計情報 */}
          <div className="lg:col-span-2">
            <Suspense fallback={<div>統計情報を読み込み中...</div>}>
              <StatsCards />
            </Suspense>
          </div>
        </div>
        {/* 新規アップロードエリア + RSS Feed管理タブ */}
        <div className="mt-8">
          <Tabs defaultValue="upload">
            <TabsList className="mb-4">
              <TabsTrigger value="upload">新規アップロード</TabsTrigger>
              <TabsTrigger value="rss">RSS Feed管理・配信</TabsTrigger>
            </TabsList>
            <TabsContent value="upload">
              <Card>
                <CardHeader>
                  <CardTitle>新規アップロード</CardTitle>
                  <CardDescription>ファイルを選択し、メタデータを入力して投稿してください</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* ドラッグ＆ドロップ ファイル選択エリア */}
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-gray-500 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={handleFileAreaClick}
                    role="button"
                    tabIndex={0}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {isUploading ? (
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p>アップロード中...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-12 w-12 mb-4 text-gray-400" />
                        <p className="text-lg font-medium mb-2">ファイルをドラッグ＆ドロップまたはクリックして選択</p>
                        <p className="text-sm">音声・動画ファイル（MP3, WAV, M4A, MP4, AVI, MOV等）</p>
                        <p className="text-xs text-gray-400 mt-2">最大2GBまで</p>
                      </>
                    )}
                  </div>

                  {/* メタデータ入力フォーム */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">タイトル *</Label>
                      <Input
                        id="title"
                        value={metadata.title}
                        onChange={(e) => setMetadata({...metadata, title: e.target.value})}
                        placeholder="投稿タイトルを入力"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">カテゴリ</Label>
                      <Input
                        id="category"
                        value={metadata.category}
                        onChange={(e) => setMetadata({...metadata, category: e.target.value})}
                        placeholder="カテゴリを入力"
                        className="mt-1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="description">説明</Label>
                      <Textarea
                        id="description"
                        value={metadata.description}
                        onChange={(e) => setMetadata({...metadata, description: e.target.value})}
                        placeholder="投稿の説明を入力"
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="tags">タグ</Label>
                      <Input
                        id="tags"
                        value={metadata.tags}
                        onChange={(e) => setMetadata({...metadata, tags: e.target.value})}
                        placeholder="タグをカンマ区切りで入力"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="rss">
              <RssFeedManager />
            </TabsContent>
          </Tabs>
        </div>

        {/* 前処理セクション */}
        {preprocessAvailable && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>前処理オプション</CardTitle>
                <CardDescription>音声ファイルの自動トリミングとキーワード検出</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="trimSilence"
                    checked={trimSilence}
                    onCheckedChange={(checked) => setTrimSilence(checked as boolean)}
                  />
                  <Label htmlFor="trimSilence">無音部分を自動トリミング</Label>
                </div>
                <div>
                  <Label htmlFor="keyword">キーワード検出</Label>
                  <Input
                    id="keyword"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="検出したいキーワードを入力"
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handlePreprocess}
                  disabled={isPreprocessing || !preprocessAvailable}
                  className="w-full"
                >
                  {isPreprocessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      前処理中...
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-2" />
                      前処理を実行
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 配信管理セクション */}
        <div className="mt-8">
          <DistributionManager
            uploadId={distributionFile?.id}
            title={metadata.title || 'Untitled'}
            description={metadata.description || ''}
            filePath={distributionFile?.filePath}
            mimeType={distributionFile?.mimeType}
            disabled={isDistributionDisabled}
          />
        </div>

        {/* 最近のアップロード */}
        <div className="mt-8">
          <RecentUploads />
        </div>
      </div>
    </div>
  )

  // 前処理実行
  async function handlePreprocess() {
    if (!distributionFile) return
    setIsPreprocessing(true)
    try {
      const response = await fetch('/api/uploads/trim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: distributionFile.id,
          trimSilence,
          keyword: keyword || undefined
        })
      })
      if (!response.ok) throw new Error('Preprocessing failed')
      const result = await response.json()
      toast({ title: "前処理完了", description: "音声ファイルの前処理が完了しました。" })
      setPreprocessedFile({
        id: result.data.processed_file_name,
        filePath: result.data.processed_file_name,
        mimeType: distributionFile.mimeType
      })
    } catch (error) {
      toast({ title: "前処理エラー", description: "音声ファイルの前処理に失敗しました。", variant: "destructive" })
    } finally {
      setIsPreprocessing(false)
    }
  }
} 