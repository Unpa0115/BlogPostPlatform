"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { FileAudio, FileVideo, RefreshCw, Search, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface FileInfo {
  name: string
  path: string
  size: number
  sizeFormatted: string
  modified: string
  type: string
}

interface FileSelectorProps {
  onFileSelect: (files: string[]) => void
  selectedFiles?: string[]
  multiple?: boolean
  title?: string
  description?: string
}

export function FileSelector({ 
  onFileSelect, 
  selectedFiles = [], 
  multiple = false,
  title = "ファイル選択",
  description = "アップロード済みファイルから選択してください"
}: FileSelectorProps) {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilePaths, setSelectedFilePaths] = useState<string[]>(selectedFiles)
  const { toast } = useToast()

  // ファイル一覧を取得
  const fetchFiles = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/uploads/list')
      if (!response.ok) {
        throw new Error('Failed to fetch files')
      }
      
      const result = await response.json()
      if (result.success) {
        setFiles(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch files')
      }
    } catch (error) {
      console.error('Error fetching files:', error)
      toast({
        title: "エラー",
        description: "ファイル一覧の取得に失敗しました。",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  // 検索フィルター
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ファイル選択処理
  const handleFileToggle = (filePath: string) => {
    if (multiple) {
      setSelectedFilePaths(prev => {
        const newSelection = prev.includes(filePath)
          ? prev.filter(path => path !== filePath)
          : [...prev, filePath]
        onFileSelect(newSelection)
        return newSelection
      })
    } else {
      setSelectedFilePaths([filePath])
      onFileSelect([filePath])
    }
  }

  // ファイルアイコン
  const getFileIcon = (type: string) => {
    if (['mp3', 'wav', 'm4a'].includes(type)) {
      return <FileAudio className="h-5 w-5 text-green-500" />
    } else {
      return <FileVideo className="h-5 w-5 text-blue-500" />
    }
  }

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchFiles}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            更新
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 検索バー */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="ファイル名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* ファイル一覧 */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">読み込み中...</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? '検索結果が見つかりません' : 'ファイルが見つかりません'}
            </div>
          ) : (
            filteredFiles.map((file) => {
              const isSelected = selectedFilePaths.includes(file.path)
              
              return (
                <div
                  key={file.path}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => handleFileToggle(file.path)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getFileIcon(file.type)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{file.name}</div>
                        <div className="text-sm text-gray-500 flex items-center space-x-2">
                          <span>{file.sizeFormatted}</span>
                          <span>•</span>
                          <span>{file.type.toUpperCase()}</span>
                          <span>•</span>
                          <span>{formatDate(file.modified)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isSelected && (
                        <Check className="h-5 w-5 text-blue-500" />
                      )}
                      <Badge variant={isSelected ? "default" : "secondary"}>
                        {isSelected ? "選択中" : "未選択"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 選択状況 */}
        {selectedFilePaths.length > 0 && (
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium">選択されたファイル ({selectedFilePaths.length})</Label>
            <div className="mt-2 space-y-1">
              {selectedFilePaths.map((filePath) => (
                <div key={filePath} className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                  {filePath}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 