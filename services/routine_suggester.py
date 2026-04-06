"""Claude API を使ったルーティン提案サービス"""

import os
import json
import anthropic
from fastapi import HTTPException

from models import Product
from services.ingredient_checker import check_routine_compatibility


# 気分モードの定義（APIキー → 日本語ラベル・提案方針）
_MOOD_DEFINITIONS = {
    "refresh":  {"label": "リフレッシュ",  "policy": "爽やかさ重視。さっぱり系・軽いテクスチャの製品を優先し、重ねづけは最小限にする。"},
    "relax":    {"label": "リラックス",    "policy": "保湿重視。じっくりケアし、肌にうるおいを与える製品を多めに使う。"},
    "thorough": {"label": "しっかりケア",  "policy": "フル工程。使用可能な全製品をカテゴリ順に使い、肌に最大限の栄養を与える。"},
    "quick":    {"label": "時短",          "policy": "最小手順。クレンジング・保湿・日焼け止めなど必須ケアのみに絞る。"},
    "sensitive": {"label": "肌荒れ",       "policy": "低刺激優先。AHA/BHA・レチノール・ビタミンCなど刺激になりやすい成分を含む製品は除外する。"},
}

_SYSTEM_PROMPT = """\
あなたはスキンケアの専門家です。
ユーザーが登録した製品リストと今日の気分をもとに、最適なスキンケアルーティンを提案してください。

以下のJSON形式のみを返してください：
{
  "steps": [
    {
      "order": 1,
      "product_name": "製品名",
      "instructions": "使い方・ポイント（1〜2文）"
    }
  ],
  "notes": "全体的なアドバイス（任意）"
}

JSONのみを返し、説明文やコードブロックは不要です。
"""


def suggest_routine(products: list[Product], mood: str) -> dict:
    """気分に合わせて製品リストからルーティンを提案する。

    Args:
        products: 対象の製品リスト
        mood: 気分モードのキー（refresh / relax / thorough / quick / sensitive）

    Returns:
        {
            "mood": "refresh",
            "mood_label": "リフレッシュ",
            "steps": [{"order": 1, "product_name": ..., "instructions": ...}],
            "notes": "...",
            "warnings": [{"product_a": ..., "product_b": ..., "ng_pairs": [...]}]
        }
    """
    mood_def = _MOOD_DEFINITIONS.get(mood, _MOOD_DEFINITIONS["thorough"])

    # NGペアを先に検出して警告リストを作る
    warnings = check_routine_compatibility(products)

    # Claude に渡す製品情報（名前・カテゴリ・成分・悩み）
    product_list_text = _format_products_for_prompt(products)

    # NGペアがある場合は除外指示を追加
    ng_note = _format_ng_warnings_for_prompt(warnings) if warnings else "成分的な問題はありません。"

    user_message = (
        f"今日の気分：{mood_def['label']}\n"
        f"提案方針：{mood_def['policy']}\n\n"
        f"【登録製品】\n{product_list_text}\n\n"
        f"【成分チェック結果】\n{ng_note}"
    )

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    try:
        response = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=2048,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=503, detail="APIキーが無効です")
    except anthropic.BadRequestError as e:
        raise HTTPException(status_code=503, detail=f"Claude APIエラー：{e.message}")
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail="APIのレート制限に達しました。しばらく待ってから再試行してください")

    text = next((b.text for b in response.content if b.type == "text"), "{}")
    result = _safe_parse_json(text)

    return {
        "mood": mood,
        "mood_label": mood_def["label"],
        "steps": result.get("steps", []),
        "notes": result.get("notes", ""),
        "warnings": warnings,
    }


def _format_products_for_prompt(products: list[Product]) -> str:
    """製品リストをClaudeへ渡すテキスト形式に変換する。"""
    lines = []
    for p in products:
        ingredients = "、".join(p.ingredients) if p.ingredients else "不明"
        concerns = "、".join(p.concerns) if p.concerns else "なし"
        lines.append(
            f"- {p.name}（{p.brand}）/ カテゴリ：{p.category} / 成分：{ingredients} / 悩み：{concerns}"
        )
    return "\n".join(lines) if lines else "製品が登録されていません"


def _format_ng_warnings_for_prompt(warnings: list[dict]) -> str:
    """NGペア警告をClaudeへ渡すテキスト形式に変換する。"""
    lines = ["以下の組み合わせはNGのため、同じルーティンに含めないでください："]
    for w in warnings:
        pairs = "、".join(f"{a}×{b}" for a, b in w["ng_pairs"])
        lines.append(f"- 「{w['product_a']}」と「{w['product_b']}」（{pairs}）")
    return "\n".join(lines)


def _safe_parse_json(text: str) -> dict:
    """コードブロックを除去してJSONをパースする。失敗時は空dictを返す。"""
    text = text.strip()
    # ```json ... ``` または ``` ... ``` で囲まれている場合は除去する
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1])  # 最初と最後の行（```）を取り除く
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        return {}
