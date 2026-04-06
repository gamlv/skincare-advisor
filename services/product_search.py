"""DuckDuckGo検索 + Claude Haiku による製品情報抽出サービス"""

import json
import os
import anthropic
from ddgs import DDGS
from fastapi import HTTPException


def search_product_info(query: str) -> dict:
    """DuckDuckGoで検索し、Claude HaikuにJSONを抽出させて返す。"""
    # Step1: DuckDuckGo で検索（無料・API不要）
    snippets = _ddg_search(query)
    if not snippets:
        return {"found": False, "name": "", "brand": "", "category": "その他",
                "ingredients": [], "concerns": []}

    # Step2: Haiku にスニペットを渡してJSON抽出
    return _extract_with_haiku(query, snippets)


def _ddg_search(query: str) -> str:
    """DuckDuckGoで製品名を検索し、上位結果のスニペットをまとめて返す。"""
    search_queries = [
        f"{query} スキンケア 成分",
        f"{query} skincare ingredients",
    ]
    results = []
    try:
        with DDGS() as ddgs:
            for q in search_queries:
                for r in ddgs.text(q, max_results=3):
                    results.append(f"【{r['title']}】\n{r['body']}")
                    if len(results) >= 5:
                        break
                if len(results) >= 5:
                    break
    except Exception:
        return ""

    return "\n\n".join(results)


def _extract_with_haiku(query: str, snippets: str) -> dict:
    """検索スニペットを Haiku に渡して製品情報を JSON で抽出する。"""
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    prompt = f"""\
以下は「{query}」に関するWeb検索結果です。この情報から製品情報をJSON形式で抽出してください。

【検索結果】
{snippets}

以下のJSON形式のみで返してください（説明文不要）:
{{
  "found": true,
  "name": "正式な製品名",
  "brand": "ブランド名",
  "category": "洗顔 | 化粧水 | 美容液 | 乳液 | クリーム | 日焼け止め | その他",
  "ingredients": ["成分1", "成分2"],
  "concerns": ["乾燥" | "ニキビ" | "毛穴" | "シミ" | "敏感肌" | "くすみ" | "ハリ不足"]
}}

製品情報が読み取れない場合: {{"found": false}}
成分が不明な場合は ingredients を [] にして found: true を返す。"""

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
    # { ... } の範囲だけ抜き出してパース（配列・余分なテキスト対策）
    start = text.find("{")
    end = text.rfind("}") + 1
    if start != -1 and end > start:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass

    return {"found": False, "name": "", "brand": "", "category": "その他",
            "ingredients": [], "concerns": []}
