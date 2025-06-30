"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Upload, FileAudio, FileVideo } from "lucide-react"
import { StatsCards } from "@/components/stats-cards"
import { RecentUploads } from "@/components/recent-uploads"
import { DistributionManager } from "@/components/distribution-manager"
import { useAuth } from "@/contexts/auth-context"
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
 */

export default function Dashboard() {
  const { user, loading: authLoading, token } = useAuth()
  const router = useRouter()
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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

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
        headers: { 'Authorization': `Bearer ${token}` },
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }
  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600 mt-2">音声ファイルのアップロードと配信管理を行います</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 認証通知 */}
          <div className="lg:col-span-1">
            <AuthNotifications userId="10699750-312a-4f82-ada7-c8e5cf9b1fa8" />
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
                          <span className="font-medium">{selectedFile.name}</span>
                        </div>
                        <div className="text-xs text-gray-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-12 w-12 mb-4" />
                        <div className="text-xl font-semibold mb-2">ここに動画・音声ファイルをドラッグ＆ドロップ</div>
                        <div className="text-gray-500 mb-2">またはクリックしてファイルを選択</div>
                        <div className="text-xs text-gray-400">対応形式: MP4, MOV, MP3, WAV, M4A</div>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".mp4,.mov,.mp3,.wav,.m4a,video/*,audio/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                    />
                  </div>
                  {/* アップロード済みファイルのサムネイル（うっすら表示） */}
                  {uploadedFile && (
                    <div className={cn("mt-4 p-4 rounded-lg border flex items-center gap-4", "bg-gray-100/60 text-gray-700")}> 
                      <FileAudio className="h-8 w-8 text-green-400" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{uploadedFile.id}</div>
                        <div className="text-xs">{uploadedFile.mimeType} / {uploadedFile.fileSize ? `${(uploadedFile.fileSize / 1024 / 1024).toFixed(2)} MB` : 'サイズ不明'}</div>
                      </div>
                    </div>
                  )}
                  {/* メタデータ入力 */}
                  <div className="space-y-2">
                    <Label htmlFor="title">タイトル</Label>
                    <Input
                      id="title"
                      value={metadata.title}
                      onChange={e => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="エピソードのタイトル"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">説明</Label>
                    <Textarea
                      id="description"
                      value={metadata.description}
                      onChange={e => setMetadata(prev => ({ ...prev, description: e.target.value }))}
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
                        onChange={e => setMetadata(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="カンマ区切りでタグを入力"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">カテゴリ</Label>
                      <Input
                        id="category"
                        value={metadata.category}
                        onChange={e => setMetadata(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="カテゴリ"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="rss">
              <Card>
                <CardHeader>
                  <CardTitle>RSS Feed管理・配信</CardTitle>
                  <CardDescription>RSS Feedの管理や配信設定を行います</CardDescription>
                </CardHeader>
                <CardContent>
                  <RssFeedManager />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        {/* ファイル前処理エリア（1カラム） */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>ファイル前処理</CardTitle>
            <CardDescription>アップロードしたファイルに対して前処理を行えます</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="trim-silence" checked={trimSilence} onCheckedChange={val => setTrimSilence(val === true)} disabled={!preprocessAvailable || isPreprocessing} />
                <Label htmlFor="trim-silence">無音部分をトリミング</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="keyword" className="min-w-fit">このフレーズからスタート</Label>
                <Input
                  id="keyword"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder="このフレーズからスタート"
                  disabled={!preprocessAvailable || isPreprocessing || !getOpenAIKey()}
                />
                {!getOpenAIKey() && preprocessAvailable && (
                  <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    OpenAI APIキーを設定してください
                  </div>
                )}
              </div>
              <Button 
                disabled={!preprocessAvailable || isPreprocessing || (!!keyword && !getOpenAIKey())} 
                className="w-full"
                onClick={async () => {
                  if (!uploadedFile) return
                  setIsPreprocessing(true)
                  try {
                    // ファイル名命名規則: 元ファイル名_trim_タイムスタンプ.mp3
                    const ts = new Date().toISOString().replace(/[-:.TZ]/g, "")
                    const base = uploadedFile.id.replace(/\.[^/.]+$/, "")
                    let suffix = []
                    if (trimSilence) suffix.push("silence")
                    if (keyword) suffix.push(`kw_${keyword}`)
                    const outputFileName = `${base}_${suffix.join("_")}_${ts}.mp3`
                    // OpenAI APIキーは.envから取得する想定（仮: window.環境変数 or サーバー側で注入）
                    const openaiApiKey = getOpenAIKey() || ''
                    const res = await fetch('/api/uploads/trim', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        filePath: uploadedFile.filePath,
                        outputFileName,
                        trimSilence,
                        keyword,
                        openaiApiKey
                      })
                    })
                    const data = await res.json()
                    if (!res.ok) throw new Error(data.error || '前処理失敗')
                    setPreprocessedFile({
                      id: outputFileName,
                      filePath: data.outputPath,
                      mimeType: uploadedFile.mimeType
                    })
                    toast({ title: "前処理完了", description: "ファイルの前処理が完了しました。" })
                  } catch (e: any) {
                    toast({ title: "前処理エラー", description: e.message || '前処理に失敗しました', variant: 'destructive' })
                  } finally {
                    setIsPreprocessing(false)
                  }
                }}
              >前処理を実行</Button>
            </div>
            {/* 前処理済みファイルのサムネイル */}
            {preprocessedFile && (
              <div className={cn("mt-4 p-4 rounded-lg border flex items-center gap-4", "bg-blue-100/60 text-blue-700")}> 
                <FileAudio className="h-8 w-8 text-blue-400" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{preprocessedFile.id}</div>
                  <div className="text-xs">{preprocessedFile.mimeType}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {/* 配信UI（常時表示・disabled制御） */}
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
          <Suspense fallback={<div>アップロード履歴を読み込み中...</div>}>
            <RecentUploads />
          </Suspense>
        </div>
      </div>
    </div>
  )
} 