import { Metadata } from 'next'
import { UploadForm } from "@/components/upload-form"
import { RecentUploads } from "@/components/recent-uploads"
import { StatsCards } from "@/components/stats-cards"

export const metadata: Metadata = {
  title: 'BlogPostPlatform - ホーム',
  description: '音声取得、自動トリミング、複数配信プラットフォームへの自動アップロード機能を持つブログ投稿プラットフォーム',
}

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-600 mt-2">
            音声ファイルのアップロードと配信管理を行います
          </p>
        </div>

        <StatsCards />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <UploadForm />
          <RecentUploads />
        </div>
      </div>
    </div>
  )
} 