import Link from 'next/link'
import { Upload, Settings } from 'lucide-react'

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-white border-r flex flex-col py-6 px-4 shadow-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-blue-600">AutoPost</h1>
      </div>
      <nav className="flex-1 flex flex-col gap-2">
        <Link href="/upload" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-blue-50 text-gray-800 font-medium">
          <Upload className="w-5 h-5" />
          アップロード
        </Link>
        <Link href="/platforms" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-blue-50 text-gray-800 font-medium">
          <Settings className="w-5 h-5" />
          プラットフォーム設定
        </Link>
      </nav>
    </aside>
  )
} 