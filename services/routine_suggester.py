"""Claude API を使ったルーティン提案サービス"""

import os
import json
import anthropic
from fastapi import HTTPException

from models import Product
from services.ingredient_checker import check_routine_compatibility


# 気分モードの定義（APIキー → 日本語ラベル・提案方針）
_MOOD_DEFINITIONS = {
    "refresh":    {"label": "リフレッシュ",    "policy": "爽やかさ重視。さっぱり系・軽いテクスチャの製品を優先し、重ねづけは最小限にする。"},
    "relax":      {"label": "リラックス",      "policy": "保湿重視。じっくりケアし、肌にうるおいを与える製品を多めに使う。"},
    "thorough":   {"label": "しっかりケア",    "policy": "フル工程。使用可能な全製品をカテゴリ順に使い、肌に最大限の栄養を与える。"},
    "quick":      {"label": "時短",            "policy": "最小手順。クレンジング・保湿・日焼け止めなど必須ケアのみに絞る。"},
    "sensitive":  {"label": "肌荒れ",          "policy": "低刺激優先。AHA/BHA・レチノール・ビタミンCなど刺激になりやすい成分を含む製品は除外する。"},
    "morning":    {"label": "朝ケア",          "policy": "朝の準備に最適化。日焼け止めを必須とし、レチノールは除外する。軽いテクスチャで化粧下地としても機能する製品を優先する。"},
    "night":      {"label": "夜ケア",          "policy": "夜の肌再生に最適化。日焼け止めは不要。美容液・クリームを厚めに重ね、レチノールや高濃度成分も積極的に活用する。"},
    "brightening":{"label": "美白ケア",        "policy": "くすみ・シミ対策重視。ビタミンC・ナイアシンアミド・トラネキサム酸を含む製品を優先的に選ぶ。"},
    "antiaging":  {"label": "エイジングケア",  "policy": "ハリ・弾力ケア重視。レチノール・ペプチド・コラーゲン・セラミドを含む製品を優先し、保湿もしっかり行う。"},
    "pore":       {"label": "毛穴ケア",        "policy": "皮脂コントロール・毛穴引き締め重視。BHA（サリチル酸）・ナイアシンアミド・クレイ系製品を優先し、重ためのオイル系は除外する。"},
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


def suggest_routine(products: list[Product], moods: list[str], weather: dict | None = None) -> dict:
    """気分・天気に合わせて製品リストからルーティンを提案する。

    Args:
        products: 対象の製品リスト
        moods: 気分モードのキーリスト（1〜3件）
        weather: 天気コンテキスト（temperature, humidity, uv_index, weather_label, pollen）

    Returns:
        {
            "moods": ["morning", "quick"],
            "mood_label": "朝ケア + 時短",
            "steps": [{"order": 1, "product_name": ..., "instructions": ...}],
            "notes": "...",
            "warnings": [{"product_a": ..., "product_b": ..., "ng_pairs": [...]}]
        }
    """
    mood_defs = [_MOOD_DEFINITIONS.get(m, _MOOD_DEFINITIONS["thorough"]) for m in moods]
    mood_label = " + ".join(d["label"] for d in mood_defs)

    # NGペアを先に検出して警告リストを作る
    warnings = check_routine_compatibility(products)

    # Claude に渡す製品情報（名前・カテゴリ・成分・悩み）
    product_list_text = _format_products_for_prompt(products)

    # NGペアがある場合は除外指示を追加
    ng_note = _format_ng_warnings_for_prompt(warnings) if warnings else "成分的な問題はありません。"

    # 天気情報を追加（取得できている場合のみ）
    weather_note = f"\n\n{_format_weather_for_prompt(weather)}" if weather else ""

    # 複数気分の提案方針を箇条書きで列挙する
    policy_lines = "\n".join(f"- {d['policy']}" for d in mood_defs)
    policy_note = (
        f"提案方針：{policy_lines}\n"
        "※ 上記すべての方針を考慮してバランスよく製品を選んでください。"
        if len(mood_defs) > 1
        else f"提案方針：{mood_defs[0]['policy']}"
    )

    user_message = (
        f"今日の気分：{mood_label}\n"
        f"{policy_note}"
        f"{weather_note}\n\n"
        f"【登録製品】\n{product_list_text}\n\n"
        f"【成分チェック結果】\n{ng_note}"
    )

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
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
        "moods": moods,
        "mood_label": mood_label,
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


def _format_weather_for_prompt(weather: dict) -> str:
    """天気・環境情報をClaudeへ渡すテキスト形式に変換する。"""
    uv = weather.get("uv_index", 0)
    if uv <= 2:
        uv_label = "低い"
    elif uv <= 5:
        uv_label = "中程度"
    elif uv <= 7:
        uv_label = "高い（日焼け止め推奨）"
    else:
        uv_label = "非常に高い（日焼け止め必須）"

    humidity = weather.get("humidity", 50)
    humidity_note = "（乾燥注意・保湿強化推奨）" if humidity < 40 else ""

    lines = [
        "【今日の環境】",
        f"- 気温：{weather.get('temperature', '不明')}℃",
        f"- 湿度：{humidity}%{humidity_note}",
        f"- UV指数：{uv}（{uv_label}）",
        f"- 天気：{weather.get('weather_label', '不明')}",
    ]
    if weather.get("pollen"):
        lines.append("- 花粉：注意レベル（肌バリア強化・低刺激製品を優先すること）")

    lines.append("※ 上記の環境条件も考慮して、最適な製品の組み合わせと使い方を提案してください。")
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
