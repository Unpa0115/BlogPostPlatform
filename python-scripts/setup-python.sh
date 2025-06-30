#!/bin/bash

# Python環境のセットアップスクリプト

echo "🐍 Python環境をセットアップしています..."

# Python3がインストールされているか確認
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3がインストールされていません。"
    echo "以下のコマンドでインストールしてください："
    echo "  macOS: brew install python3"
    echo "  Ubuntu: sudo apt-get install python3 python3-pip"
    exit 1
fi

echo "✅ Python3が見つかりました: $(python3 --version)"

# pipがインストールされているか確認
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3がインストールされていません。"
    exit 1
fi

echo "✅ pip3が見つかりました: $(pip3 --version)"

# 必要なパッケージをインストール
echo "📦 必要なパッケージをインストールしています..."
pip3 install -r requirements.txt

# Playwrightブラウザをインストール
echo "🌐 Playwrightブラウザをインストールしています..."
python3 -m playwright install chromium

echo "✅ セットアップが完了しました！"
echo ""
echo "📝 使用方法："
echo "  python3 voicy_automation.py \"タイトル\" \"説明\" \"ハッシュタグ\""
echo ""
echo "🔧 環境変数の設定："
echo "  export VOICY_EMAIL=\"your-email@example.com\""
echo "  export VOICY_PASSWORD=\"your-password\"" 