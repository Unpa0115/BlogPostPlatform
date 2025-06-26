export default function UploadPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">新規アップロード</h2>
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 flex flex-col items-center justify-center text-gray-500 mb-4">
          <span className="text-lg">ここに動画・音声ファイルをドラッグ＆ドロップ</span>
          <span className="text-sm mt-2">またはファイルを選択</span>
        </div>
        <div className="flex flex-col gap-4">
          <input type="text" placeholder="タイトル" className="border rounded px-3 py-2" />
          <textarea placeholder="説明文" className="border rounded px-3 py-2" rows={3} />
          <input type="text" placeholder="タグ（カンマ区切り）" className="border rounded px-3 py-2" />
          <select className="border rounded px-3 py-2">
            <option>カテゴリを選択してください</option>
            <option>Podcast</option>
            <option>Music</option>
            <option>Talk</option>
          </select>
          <button className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 mt-4 self-end">アップロード</button>
        </div>
      </div>
    </div>
  )
} 