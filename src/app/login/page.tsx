"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login, register } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await login(email, password)
      if (result.success) {
        toast({
          title: "ログイン成功",
          description: "正常にログインしました。",
        })
        router.push("/")
      } else {
        toast({
          title: "ログイン失敗",
          description: result.error || "メールアドレスまたはパスワードが正しくありません。",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "ログイン中にエラーが発生しました。",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await register(email, password)
      if (result.success) {
        toast({
          title: "登録成功",
          description: "アカウントが正常に作成されました。",
        })
        router.push("/")
      } else {
        toast({
          title: "登録失敗",
          description: result.error || "アカウントの作成に失敗しました。",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "登録中にエラーが発生しました。",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            BlogPostPlatform
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            音声管理・配信プラットフォーム
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>アカウント</CardTitle>
            <CardDescription>
              ログインまたは新規登録してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">ログイン</TabsTrigger>
                <TabsTrigger value="register">新規登録</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">メールアドレス</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="example@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">パスワード</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="パスワード"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "ログイン中..." : "ログイン"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">メールアドレス</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="example@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">パスワード</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="8文字以上"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "登録中..." : "新規登録"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 