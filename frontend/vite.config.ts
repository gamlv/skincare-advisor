import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // ビルド成果物をFastAPIのstaticディレクトリへ出力する
    outDir: path.resolve(__dirname, '../static'),
    emptyOutDir: true,
  },
  server: {
    // 開発時はAPIリクエストをFastAPIへプロキシする
    proxy: {
      '/products': 'http://localhost:8000',
      '/routine': 'http://localhost:8000',
    },
  },
})
