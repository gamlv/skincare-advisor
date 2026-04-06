import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from routers import products, routine

# .envファイルから環境変数を読み込む
load_dotenv()

app = FastAPI(title="スキンケアアドバイザー API", version="0.1.0")

# CORSミドルウェア設定
# FRONTEND_ORIGIN を設定した場合はそのオリジンのみ許可、未設定時は開発用localhost
_raw_origins = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173,http://localhost:3000")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターを登録（SPAフォールバックより先に登録することでAPIが優先される）
app.include_router(products.router)
app.include_router(routine.router)


@app.get("/")
def health_check():
    """ヘルスチェック"""
    return {"status": "ok"}


# Reactビルド成果物の静的ファイル配信
# static/ にビルド済みファイルが存在する場合のみマウントする
_STATIC_DIR = Path(__file__).parent / "static"

if _STATIC_DIR.exists() and any(_STATIC_DIR.iterdir()):
    # /assets/ 以下のJS・CSS・画像などを配信する
    _assets_dir = _STATIC_DIR / "assets"
    if _assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        """ReactのSPAルーティングをサポートするフォールバック"""
        index = _STATIC_DIR / "index.html"
        if index.exists():
            return FileResponse(index)
        return {"detail": "Not found"}
