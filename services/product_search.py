"""DuckDuckGo多角検索 + ページ本文取得（Qoo10はPlaywright）+ Claude 要約による製品情報抽出

モデルの使い分け:
- 候補検索（軽量）     : claude-haiku-4-5-20251001
- バーコード詳細検索   : claude-haiku-4-5-20251001（DDG失敗時はClaude web_search）
- 製品名詳細検索       : claude-sonnet-4-6（精度優先）
"""

import json
import os
import re
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

import anthropic
import httpx
from ddgs import DDGS
from fastapi import HTTPException
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)

_HAIKU = "claude-haiku-4-5-20251001"
_SONNET = "claude-sonnet-4-6"

# ページ取得の設定
_FETCH_TIMEOUT = 8  # 秒
_MAX_PAGES = 5  # 本文を取得するページ数の上限
_MAX_PAGE_CHARS = 8000  # 1ページあたりの本文上限
_MAX_TOTAL_CHARS = 30000  # Claude に渡すテキストの合計上限

_NOT_FOUND = {
    "found": False, "name": "", "brand": "",
    "category": "その他", "ingredients": [], "concerns": [],
}


def search_candidates(query: str) -> list[dict]:
    """検索ワードからスニペットを収集し、Haikuで候補製品を複数抽出する（軽量）。"""
    urls_and_snippets = _ddg_multi_search(query)
    if not urls_and_snippets:
        return []

    snippet_text = "\n\n".join(
        f"【{item['title']}】\n{item['snippet']}" for item in urls_and_snippets
    )
    return _extract_candidates_with_haiku(query, snippet_text)


def search_product_info(query: str) -> dict:
    """特定の製品名で詳細検索。ページ本文まで取得してSonnetで成分を抽出する。
    Qoo10を優先的に検索し、取れなければ他のソースにフォールバックする。"""
    queries = [
        f"{query} site:qoo10.jp 全成分",   # Qoo10優先（Playwrightで取得）
        f"{query} site:qoo10.jp",
        f"{query} 全成分",
        f"{query} @cosme 成分",
        f"{query} 口コミ 特徴",
        f"{query} ingredients",
        f"{query} スキンケア レビュー",
    ]
    return _run_search(query, queries, model=_SONNET)


def search_product_by_barcode(barcode: str) -> dict:
    """バーコード（JANコード・GTINなど）からWeb検索で製品情報を取得する。
    1. DuckDuckGo検索を試みる（Haiku抽出）
    2. 見つからなければClaude Haiku + web_searchにフォールバック"""
    queries = [
        f"{barcode} スキンケア 全成分",
        f"{barcode} 化粧品 成分表",
        f'"{barcode}" cosmetics ingredients',
        f"JAN {barcode} beauty skincare",
        f"{barcode} site:qoo10.jp",
        f"{barcode} @cosme",
    ]
    result = _run_search(f"バーコード {barcode} の製品", queries, model=_HAIKU)

    if result.get("found"):
        return result

    # DDGで見つからなければClaude Haiku web_searchで再試行
    logger.info("DDG検索失敗、Claude Haiku web_searchにフォールバック: %s", barcode)
    return _search_barcode_with_claude_haiku(barcode)


def _run_search(label: str, queries: list[str], model: str = _HAIKU) -> dict:
    """DuckDuckGo検索 → ページ取得 → Claudeで抽出する共通処理。"""
    urls_and_snippets = _ddg_search(queries)
    if not urls_and_snippets:
        return {**_NOT_FOUND}

    page_texts = _fetch_pages(urls_and_snippets)
    combined = _build_context(urls_and_snippets, page_texts)
    if not combined.strip():
        return {**_NOT_FOUND}

    return _extract_with_claude(label, combined, model)


# ── Step1: 多角的な検索 ──

def _ddg_multi_search(query: str) -> list[dict]:
    """製品名検索用クエリを組み立てて DuckDuckGo を叩く。"""
    queries = [
        f"{query} 全成分",
        f"{query} @cosme 成分",
        f"{query} 口コミ 特徴",
        f"{query} ingredients",
        f"{query} スキンケア レビュー",
    ]
    return _ddg_search(queries)


def _ddg_search(search_queries: list[str]) -> list[dict]:
    """複数の検索クエリで DuckDuckGo を叩き、URL・タイトル・スニペットを集める。"""
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
    """上位ページのHTMLを取得してテキストを抽出する。
    qoo10.jpはPlaywright（JS実行）、それ以外はhttpxで取得する。"""
    targets = items[:_MAX_PAGES]
    page_texts: dict[str, str] = {}

    qoo10_targets = [item for item in targets if "qoo10.jp" in item["url"]]
    other_targets = [item for item in targets if "qoo10.jp" not in item["url"]]

    # Qoo10以外はhttpxで並列取得
    def fetch_one_httpx(url: str) -> tuple[str, str]:
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

    with ThreadPoolExecutor(max_workers=max(len(other_targets), 1)) as pool:
        futures = {pool.submit(fetch_one_httpx, item["url"]): item["url"] for item in other_targets}
        for future in as_completed(futures):
            url, text = future.result()
            if text:
                page_texts[url] = text

    # Qoo10はPlaywrightでまとめて取得（ブラウザインスタンスを使い回す）
    if qoo10_targets:
        qoo10_texts = _fetch_qoo10_with_playwright([item["url"] for item in qoo10_targets])
        page_texts.update(qoo10_texts)

    return page_texts


def _fetch_qoo10_with_playwright(urls: list[str]) -> dict[str, str]:
    """PlaywrightでQoo10のページ本文を取得する。JSを実行して全成分を取得する。"""
    results: dict[str, str] = {}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            for url in urls:
                try:
                    page = browser.new_page()
                    page.set_extra_http_headers({
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept-Language": "ja-JP,ja;q=0.9",
                    })
                    page.goto(url, timeout=15000, wait_until="domcontentloaded")
                    # 遅延レンダリングを待つ
                    page.wait_for_timeout(2000)
                    html = page.content()
                    page.close()
                    text = _extract_text_from_html(html)
                    if text:
                        results[url] = text[:_MAX_PAGE_CHARS]
                        logger.info("Playwright取得成功 %s: %d文字", url, len(text))
                    else:
                        logger.warning("Playwright取得結果が空 %s", url)
                except Exception as e:
                    logger.warning("Playwright取得失敗 %s: %s", url, e)
            browser.close()
    except Exception as e:
        logger.warning("Playwright起動失敗: %s", e)
    return results


def _extract_text_from_html(html: str) -> str:
    """HTMLからスクリプト・スタイル・タグを除去してテキストを抽出する。"""
    html = re.sub(r"<(script|style|noscript)[^>]*>.*?</\1>", "", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", html)
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

        page_text = page_texts.get(url, "")
        if page_text:
            section += f"\n本文:\n{page_text}"

        if total + len(section) > _MAX_TOTAL_CHARS:
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
            model=_HAIKU,
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
    if "```" in text:
        parts = text.split("```")
        if len(parts) >= 2:
            text = parts[1]
            if text.startswith("json"):
                text = text[4:]

    text = text.strip()
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


# ── Claude で構造化抽出（DDG収集テキストから） ──

def _extract_with_claude(query: str, context: str, model: str) -> dict:
    """収集した情報を指定モデルに渡して製品情報をJSONで抽出する。"""
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
            model=model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=503, detail="APIキーが無効です")
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail="APIのレート制限に達しました。しばらく待ってから再試行してください")

    text = "".join(b.text for b in response.content if b.type == "text")
    return _parse_json(text)


# ── Claude Haiku web_search でバーコード検索（DDGフォールバック） ──

def _search_barcode_with_claude_haiku(barcode: str) -> dict:
    """Claude Haiku の web_search ツールでJANコードから製品情報を取得する。
    DuckDuckGo検索で見つからなかった場合のフォールバック。"""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    prompt = f"""\
JANコード {barcode} のスキンケア製品を検索してください。
製品名・ブランド・全成分リストを取得してください。
Qoo10・Amazon・@cosme・美容サイト等も検索対象にしてください。
日本語・韓国語両方で検索してください。

以下のJSON形式のみで返してください（説明文不要）:
{{
  "found": true,
  "name": "正式な製品名",
  "brand": "ブランド名",
  "category": "洗顔 | 化粧水 | 美容液 | 乳液 | クリーム | 日焼け止め | その他",
  "ingredients": ["成分1", "成分2", ...],
  "concerns": ["乾燥", "ニキビ", "毛穴", "シミ", "敏感肌", "くすみ", "ハリ不足" から該当するもの]
}}

製品が見つからない場合: {{"found": false}}
成分が不明な場合は ingredients を [] にして found: true を返してください。"""

    try:
        response = client.messages.create(
            model=_HAIKU,
            max_tokens=2048,
            tools=[{"type": "web_search_20260209", "name": "web_search", "max_uses": 3}],
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=503, detail="APIキーが無効です")
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail="APIのレート制限に達しました。しばらく待ってから再試行してください")
    except Exception as e:
        logger.warning("Claude web_search失敗: %s", e)
        return {**_NOT_FOUND}

    # 全テキストブロックを走査してJSONを探す（Claudeは複数のtextブロックを返すことがある）
    for block in response.content:
        if hasattr(block, "type") and block.type == "text":
            result = _parse_json(block.text)
            if result.get("found") is not None:
                return result

    return {**_NOT_FOUND}


def _parse_json(text: str) -> dict:
    """レスポンスからJSONを取り出す。コードブロックも考慮。"""
    if "```" in text:
        parts = text.split("```")
        if len(parts) >= 2:
            text = parts[1]
            if text.startswith("json"):
                text = text[4:]

    text = text.strip()
    start = text.find("{")
    end = text.rfind("}") + 1
    if start != -1 and end > start:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass

    return {**_NOT_FOUND}
