import { Switch } from "./switch";
import { Label } from "./label";

interface PlatformToggleProps {
  platform: {
    name: string;
    icon: React.ReactNode;
    enabled: boolean;
    status: "connected" | "disconnected" | "error";
  };
  onToggle: (enabled: boolean) => void;
  children?: React.ReactNode;
  warningMessage?: string;
}

export function PlatformToggle({ platform, onToggle, children, warningMessage }: PlatformToggleProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800";
      case "disconnected":
        return "bg-yellow-100 text-yellow-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "connected":
        return "接続済み";
      case "disconnected":
        return "要設定";
      case "error":
        return "エラー";
      default:
        return "未接続";
    }
  };

  return (
    <div className={`border border-gray-200 rounded-lg p-4 transition-opacity ${
      platform.enabled ? '' : 'opacity-50'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {platform.icon}
          <Label className="font-medium">{platform.name}</Label>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(platform.status)}`}>
            {getStatusText(platform.status)}
          </span>
          <Switch
            checked={platform.enabled}
            onCheckedChange={onToggle}
          />
        </div>
      </div>
      {warningMessage && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-2">
          {warningMessage}
        </div>
      )}
      {children && platform.enabled && (
        <div className="space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}
