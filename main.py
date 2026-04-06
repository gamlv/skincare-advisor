from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import products, routine

# .envファイルから環境変数を読み込む
load_dotenv()

app = FastAPI(title="スキンケアアドバイザー API", version="0.1.0")

# CORSミドルウェア設定（開発用：全オリジン許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターを登録
app.include_router(products.router)
app.include_router(routine.router)


@app.get("/")
def health_check():
    """ヘルスチェック"""
    return {"status": "ok"}
