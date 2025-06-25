import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BlogPostPlatform - ホーム',
  description: '音声取得、自動トリミング、複数配信プラットフォームへの自動アップロード機能を持つブログ投稿プラットフォーム',
}

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          BlogPostPlatform
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          音声取得、自動トリミング、複数配信プラットフォームへの自動アップロード機能を持つブログ投稿プラットフォーム
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-2">音声管理</h3>
            <p className="text-muted-foreground">
              音声ファイルのアップロード、プレビュー、管理機能
            </p>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-2">自動トリミング</h3>
            <p className="text-muted-foreground">
              Whisper APIを使用した自動音声トリミング機能
            </p>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-semibold mb-2">配信自動化</h3>
            <p className="text-muted-foreground">
              複数プラットフォームへの自動アップロード機能
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 