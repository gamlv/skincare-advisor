"""Claude API の web_search を使った製品情報検索サービス"""

import json
import os
import anthropic
from fastapi import HTTPException

# Claudeへの指示：部分情報でも返す・複数クエリで検索する
_SYSTEM_PROMPT = """\
あなたはスキンケア製品の専門家です。
ユーザーが指定した製品をWeb検索し、以下の情報をJSON形式で返してください。

【重要なルール】
- 製品の存在が確認できたら必ず found: true を返す（成分情報が不完全でもOK）
- 検索クエリは複数試すこと（日本語名・英語名・ブランド名の組み合わせなど）
- 成分リストが取得できなかった場合は ingredients を空リスト [] にして found: true を返す
- found: false は「その製品が存在しないことが確認できた場合」のみ使う

返却するJSONのフォーマット：
{
  "name": "商品名（正式名称）",
  "brand": "ブランド名",
  "category": "洗顔 | 化粧水 | 美容液 | 乳液 | クリーム | 日焼け止め | その他",
  "ingredients": ["成分1", "成分2", ...],
  "concerns": ["乾燥" | "ニキビ" | "毛穴" | "シミ" | "敏感肌" | "くすみ" | "ハリ不足"],
  "found": true
}

成分は日本語の正式名称で記載してください。
JSONのみを返し、説明文は不要です。
"""


def search_product_info(query: str) -> dict:
    """製品名でWeb検索し、成分などの情報を取得して返す。
    部分情報しか取れない場合でも found: true で返し、ユーザーが編集できるようにする。

    Args:
        query: 検索する製品名（例：「シカクリーム Dr.Jart+」）

    Returns:
        製品情報の辞書。found=Falseの場合は製品が存在しないことが確認された。
    """
    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    # 日本語名・英語名・ブランド名の組み合わせで検索しやすいよう指示を追加
    user_message = (
        f"次のスキンケア製品を検索してください：{query}\n\n"
        f"見つからない場合は「{query} スキンケア 成分」「{query} skincare ingredients」など"
        f"複数のクエリで検索してください。"
        f"製品の存在が確認できたら、成分情報が不完全でも found: true で返してください。"
    )

    messages = [{"role": "user", "content": user_message}]

    # web_searchはサーバーサイドツールのため、Claudeが自律的に検索を実行する
    # pause_turnになった場合はメッセージを引き継いでループを続ける
    try:
        while True:
            response = client.messages.create(
                model="claude-opus-4-6",
                max_tokens=2048,
                system=_SYSTEM_PROMPT,
                tools=[{"type": "web_search_20260209", "name": "web_search"}],
                messages=messages,
            )

            # サーバーサイドのループ上限（10回）に達した場合は会話を引き継いで継続
            if response.stop_reason == "pause_turn":
                messages.append({"role": "assistant", "content": response.content})
                continue

            break
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=503, detail="APIキーが無効です")
    except anthropic.BadRequestError as e:
        raise HTTPException(status_code=503, detail=f"Claude APIエラー：{e.message}")
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail="APIのレート制限に達しました。しばらく待ってから再試行してください")

    return _extract_json_from_response(response)


def _extract_json_from_response(response: anthropic.types.Message) -> dict:
    """レスポンスのtextブロックからJSONを抽出して返す。"""
    text = next((b.text for b in response.content if b.type == "text"), "")

    # コードブロック（```json ... ```）で囲まれている場合は取り除く
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        # JSONが取得できなかった場合は「見つからなかった」として返す
        return {"found": False, "name": "", "brand": "", "category": "その他",
                "ingredients": [], "concerns": []}
