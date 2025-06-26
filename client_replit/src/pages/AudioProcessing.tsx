import { SimpleAudioProcessor } from '@/components/SimpleAudioProcessor';

export function AudioProcessing() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">音声データ加工</h1>
        <p className="text-muted-foreground">
          音声・動画ファイルの無音区間削除と特定フレーズの抽出を行います
        </p>
      </div>
      
      <SimpleAudioProcessor />
    </div>
  );
}