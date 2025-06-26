import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/ui/file-upload";
import { Progress } from "@/components/ui/progress";
import { SimpleAudioProcessor } from "@/components/SimpleAudioProcessor";
import { RssEpisodeSelector } from "./rss-episode-selector";
import { AudioLines, Upload, Rss } from "lucide-react";
import { useState } from "react";

interface UploadFormProps {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  uploadProgress: number;
  onUploadProgress: (progress: number) => void;
}

export function UploadForm({
  selectedFile,
  onFileSelect,
  uploadProgress,
  onUploadProgress,
}: UploadFormProps) {
  
  const handleFileSelect = (file: File) => {
    onFileSelect(file);
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 100) {
        progress = 100;
        clearInterval(interval);
      }
      onUploadProgress(progress);
    }, 200);
  };

  const handleRssEpisodeSelect = (episode: any, file: File) => {
    onFileSelect(file);
    onUploadProgress(100); // RSS episodes are already downloaded
  };

  const handleFileRemove = () => {
    onFileSelect(null as any);
    onUploadProgress(0);
  };

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
              ファイルアップロード
            </TabsTrigger>
            <TabsTrigger value="rss" className="flex items-center gap-2">
              <Rss className="h-4 w-4" />
              RSSエピソード
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="mt-4">
            <FileUpload
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              onFileRemove={handleFileRemove}
            />
          </TabsContent>
          
          <TabsContent value="rss" className="mt-4">
            <RssEpisodeSelector onEpisodeSelect={handleRssEpisodeSelect} />
          </TabsContent>
        </Tabs>

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


      </CardContent>
    </Card>
  );
}
