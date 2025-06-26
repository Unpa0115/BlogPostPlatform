import { AppHeader } from "@/components/app-header";
import { Sidebar } from "@/components/sidebar";
import { StatsCards } from "@/components/stats-cards";
import { UploadForm } from "@/components/upload-form";
import { MetadataForm } from "@/components/metadata-form";
import { RecentUploads } from "@/components/recent-uploads";

import { useState } from "react";

export default function Dashboard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <StatsCards />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <UploadForm 
                selectedFile={selectedFile}
                onFileSelect={setSelectedFile}
                uploadProgress={uploadProgress}
                onUploadProgress={setUploadProgress}
              />
              
              <MetadataForm 
                selectedFile={selectedFile}
                onUploadComplete={() => {
                  setSelectedFile(null);
                  setUploadProgress(0);
                }}
              />
            </div>
            
            <RecentUploads />
          </div>
        </main>
      </div>
    </div>
  );
}
