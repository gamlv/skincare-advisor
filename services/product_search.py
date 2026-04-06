"""DuckDuckGo多角検索 + ページ本文取得 + Claude Haiku 要約による製品情報抽出"""

import json
import os
import re
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

import anthropic
import httpx
from ddgs import DDGS
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# ページ取得の設定
_FETCH_TIMEOUT = 8  # 秒
_MAX_PAGES = 5  # 本文を取得するページ数の上限
_MAX_PAGE_CHARS = 8000  # 1ページあたりの本文上限
_MAX_TOTAL_CHARS = 30000  # Haiku に渡すテキストの合計上限

_NOT_FOUND = {
    "found": False, "name": "", "brand": "",
    "category": "その他", "ingredients": [], "concerns": [],
}


def search_candidates(query: str) -> list[dict]:
    """検索ワードからスニペットを収集し、Haikuで候補製品を複数抽出する（軽量）。"""
    urls_and_snippets = _ddg_multi_search(query)
    if not urls_and_snippets:
        return []

    # スニペットだけをまとめる（ページ本文は取得しない＝高速）
    snippet_text = "\n\n".join(
        f"【{item['title']}】\n{item['snippet']}" for item in urls_and_snippets
    )
    return _extract_candidates_with_haiku(query, snippet_text)


def search_product_info(query: str) -> dict:
    """特定の製品名で詳細検索。ページ本文まで取得して成分を抽出する。"""
    # Step1: DuckDuckGo で多角的に検索
    urls_and_snippets = _ddg_multi_search(query)
    if not urls_and_snippets:
        return {**_NOT_FOUND}

    # Step2: 上位ページの本文を取得
    page_texts = _fetch_pages(urls_and_snippets)

    # Step3: スニペット + ページ本文をまとめて Haiku に渡す
    combined = _build_context(urls_and_snippets, page_texts)
    if not combined.strip():
        return {**_NOT_FOUND}

    return _extract_with_haiku(query, combined)


# ── Step1: 多角的な検索 ──

def _ddg_multi_search(query: str) -> list[dict]:
    """複数の検索クエリで DuckDuckGo を叩き、URL・タイトル・スニペットを集める。"""
    search_queries = [
        f"{query} 全成分",
        f"{query} @cosme 成分",
        f"{query} 口コミ 特徴",
        f"{query} ingredients",
        f"{query} スキンケア レビュー",
    ]

    seen_urls: set[str] = set()
    results: list[dict] = []

    try:
        ddgs = DDGS()
        for q in search_queries:
            try:
                hits = ddgs.text(q, max_results=3)
            except Exception:
                continue
            for hit in hits:
                url = hit.get("href", "")
                if url in seen_urls:
                    continue
                seen_urls.add(url)
                results.append({
                    "url": url,
                    "title": hit.get("title", ""),
                    "snippet": hit.get("body", ""),
                })
            if len(results) >= 12:
                break
    except Exception as e:
        logger.warning("DuckDuckGo検索でエラー: %s", e)

    return results


# ── Step2: ページ本文の取得 ──

def _fetch_pages(items: list[dict]) -> dict[str, str]:
    """上位ページのHTMLを取得してテキストを抽出する。並列処理で高速化。"""
    targets = items[:_MAX_PAGES]
    page_texts: dict[str, str] = {}

    def fetch_one(url: str) -> tuple[str, str]:
        try:
            resp = httpx.get(
                url,
                timeout=_FETCH_TIMEOUT,
                follow_redirects=True,
                headers={"User-Agent": "Mozilla/5.0 (compatible; SkincareBot/1.0)"},
            )
            resp.raise_for_status()
            text = _extract_text_from_html(resp.text)
            return url, text[:_MAX_PAGE_CHARS]
        except Exception:
            return url, ""

    with ThreadPoolExecutor(max_workers=_MAX_PAGES) as pool:
        futures = {pool.submit(fetch_one, item["url"]): item["url"] for item in targets}
        for future in as_completed(futures):
            url, text = future.result()
            if text:
                page_texts[url] = text

    return page_texts


def _extract_text_from_html(html: str) -> str:
    """HTMLからスクリプト・スタイル・タグを除去してテキストを抽出する。"""
    # script, style タグごと除去
    html = re.sub(r"<(script|style|noscript)[^>]*>.*?</\1>", "", html, flags=re.DOTALL | re.IGNORECASE)
    # HTMLタグを除去
    text = re.sub(r"<[^>]+>", " ", html)
    # 連続する空白を整理
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ── Step3: コンテキスト構築 ──

def _build_context(items: list[dict], page_texts: dict[str, str]) -> str:
    """スニペットとページ本文を統合してAIに渡すテキストを構築する。"""
    parts: list[str] = []
    total = 0

    for item in items:
        url = item["url"]
        title = item["title"]
        snippet = item["snippet"]

        section = f"【{title}】\nURL: {url}\nスニペット: {snippet}"

        # ページ本文があれば追加
        page_text = page_texts.get(url, "")
        if page_text:
            section += f"\n本文:\n{page_text}"

        if total + len(section) > _MAX_TOTAL_CHARS:
            # 残り容量分だけ追加
            remaining = _MAX_TOTAL_CHARS - total
            if remaining > 200:
                parts.append(section[:remaining])
            break

        parts.append(section)
        total += len(section)

    return "\n\n---\n\n".join(parts)


# ── Haiku で候補抽出（軽量） ──

def _extract_candidates_with_haiku(query: str, snippet_text: str) -> list[dict]:
    """スニペットから候補製品を複数抽出する。"""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    prompt = f"""\
あなたはスキンケア製品の専門家です。
以下は「{query}」に関するWeb検索結果のスニペットです。
この中から特定できるスキンケア製品の候補を全て抽出してください。

【検索スニペット】
{snippet_text}

【指示】
- 同一製品の重複は除外してください
- 検索ワードと無関係な製品は除外してください
- 各候補の情報は検索スニペットから読み取れる範囲で構いません
- 最大8件まで

以下のJSON形式のみで返してください（説明文不要）:
[
  {{
    "name": "正式な製品名",
    "brand": "ブランド名",
    "category": "洗顔 | 化粧水 | 美容液 | 乳液 | クリーム | 日焼け止め | その他",
    "description": "製品の特徴を1文で"
  }}
]

製品が1つも見つからない場合は空配列 [] を返してください。"""

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=503, detail="APIキーが無効です")
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail="APIのレート制限に達しました。しばらく待ってから再試行してください")

    text = "".join(b.text for b in response.content if b.type == "text")
    return _parse_json_array(text)


def _parse_json_array(text: str) -> list[dict]:
    """レスポンスからJSON配列を取り出す。"""
    # コードブロック除去
    if "```" in text:
        parts = text.split("```")
        if len(parts) >= 2:
            text = parts[1]
            if text.startswith("json"):
                text = text[4:]

    text = text.strip()
    # [ ... ] の範囲だけ抜き出してパース
    start = text.find("[")
    end = text.rfind("]") + 1
    if start != -1 and end > start:
        try:
            result = json.loads(text[start:end])
            if isinstance(result, list):
                return result
        except json.JSONDecodeError:
            pass
    return []


# ── Haiku で構造化抽出（詳細） ──

def _extract_with_haiku(query: str, context: str) -> dict:
    """収集した情報を Haiku に渡して製品情報を JSON で抽出する。"""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    prompt = f"""\
あなたはスキンケア製品の専門家です。
以下は「{query}」についてインターネットから収集した複数ページの情報です。
これらの情報を総合的に分析し、製品情報をJSON形式でまとめてください。

【収集した情報】
{context}

【指示】
- 複数の情報源を突き合わせて、正確な情報を抽出してください
- 全成分リストが見つかった場合は、主要な成分（最大15個）を選んでください
- 成分は日本語の正式名称で記載してください
- カテゴリは製品の用途から判断してください

以下のJSON形式のみで返してください（説明文不要）:
{{
  "found": true,
  "name": "正式な製品名",
  "brand": "ブランド名",
  "category": "洗顔 | 化粧水 | 美容液 | 乳液 | クリーム | 日焼け止め | その他",
  "ingredients": ["成分1", "成分2", ...],
  "concerns": ["乾燥", "ニキビ", "毛穴", "シミ", "敏感肌", "くすみ", "ハリ不足" から該当するもの]
}}

製品情報が読み取れない場合: {{"found": false}}
成分が不明な場合は ingredients を [] にして found: true を返してください。"""

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=503, detail="APIキーが無効です")
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail="APIのレート制限に達しました。しばらく待ってから再試行してください")

    text = "".join(b.text for b in response.content if b.type == "text")
    return _parse_json(text)


def _parse_json(text: str) -> dict:
    """レスポンスからJSONを取り出す。コードブロックも考慮。"""
    # コードブロック除去
    if "```" in text:
        parts = text.split("```")
        if len(parts) >= 2:
            text = parts[1]
            if text.startswith("json"):
                text = text[4:]

    text = text.strip()
    # { ... } の範囲だけ抜き出してパース
    start = text.find("{")
    end = text.rfind("}") + 1
    if start != -1 and end > start:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass

    return {**_NOT_FOUND}
