import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Upload, 
  History, 
  Settings, 
  TrendingUp,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { FaYoutube, FaSpotify } from "react-icons/fa";
import { Mic } from "lucide-react";
import type { PlatformSettings } from "@shared/schema";

export function Sidebar() {
  const { data: platforms } = useQuery<PlatformSettings[]>({
    queryKey: ['/api/platforms'],
  });

  const getPlatformStatus = (platform: string, isActive: boolean) => {
    // For Spotify and Voicy, show as configured since environment variables are set
    if (platform === 'spotify' || platform === 'voicy') {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="mr-1 h-3 w-3" />
          設定完了
        </Badge>
      );
    }
    
    if (!isActive) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <AlertTriangle className="mr-1 h-3 w-3" />
          要設定
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="mr-1 h-3 w-3" />
        接続済み
      </Badge>
    );
  };

  const navItems = [
    { icon: Upload, label: "新規アップロード", href: "/", active: true },
    { icon: Settings, label: "プラットフォーム設定", href: "/settings", active: false },
  ];

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200">
      <div className="p-6">
        <nav className="space-y-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <a
                key={index}
                href={item.href}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  item.active
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.label}
              </a>
            );
          })}
        </nav>
      </div>

      <div className="p-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">プラットフォーム状態</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FaYoutube className="text-red-600 mr-2 h-4 w-4" />
              <span className="text-sm">YouTube</span>
            </div>
            {getPlatformStatus('youtube', platforms?.find(p => p.platform === 'youtube')?.isActive || false)}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FaSpotify className="text-green-600 mr-2 h-4 w-4" />
              <span className="text-sm">Spotify</span>
            </div>
            {getPlatformStatus('spotify', platforms?.find(p => p.platform === 'spotify')?.isActive || false)}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Mic className="text-orange-600 mr-2 h-4 w-4" />
              <span className="text-sm">Voicy</span>
            </div>
            {getPlatformStatus('voicy', platforms?.find(p => p.platform === 'voicy')?.isActive || false)}
          </div>
        </div>
      </div>
    </aside>
  );
}
