import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useLocation } from "wouter";

export function AppHeader() {
  const [location] = useLocation();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">
              投稿自動化システム
            </h1>
            <nav className="hidden md:flex space-x-4">
              <Link 
                to="/" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location === "/" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                ダッシュボード
              </Link>
              <Link 
                to="/audio" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location === "/audio" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                音声加工
              </Link>
              <Link 
                to="/settings" 
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location === "/settings" ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                設定
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            
            <Avatar>
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-blue-600">AutoPost</h1>
            </div>
            <nav className="hidden md:ml-10 md:flex md:space-x-8">
              <Link href="/" className={`pb-2 px-1 text-sm font-medium transition-colors ${
                location === "/" 
                  ? "text-blue-600 border-b-2 border-blue-600" 
                  : "text-gray-500 hover:text-gray-700"
              }`}>
                ダッシュボード
              </Link>
              <Link href="/settings" className={`pb-2 px-1 text-sm font-medium transition-colors ${
                location === "/settings" 
                  ? "text-blue-600 border-b-2 border-blue-600" 
                  : "text-gray-500 hover:text-gray-700"
              }`}>
                設定
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
              <Bell className="h-5 w-5" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-600 text-white">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
