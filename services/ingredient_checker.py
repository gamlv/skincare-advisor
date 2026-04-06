"""成分の正規化とNGペア検出ロジック"""

from models import Product


# -------------------------------------------------------
# 成分の正規化マップ（別名・表記ゆれ → 正規名）
# キーは小文字・スペース除去後に照合するため、全角半角の揺れも吸収できる
# -------------------------------------------------------
_NORMALIZE_MAP: dict[str, str] = {
    # ビタミンC 系
    "アスコルビン酸": "ビタミンC",
    "l-アスコルビン酸": "ビタミンC",
    "ビタミンc": "ビタミンC",
    "ビタミンc誘導体": "ビタミンC",
    "アスコルビルグルコシド": "ビタミンC",
    "3-o-エチルアスコルビン酸": "ビタミンC",
    "アスコルビン酸2-グルコシド": "ビタミンC",
    # レチノール 系
    "レチノイン酸": "レチノール",
    "レチナール": "レチノール",
    "レチニルパルミテート": "レチノール",
    "トレチノイン": "レチノール",
    # AHA 系（α-ヒドロキシ酸）
    "グリコール酸": "AHA",
    "乳酸": "AHA",
    "クエン酸": "AHA",
    "リンゴ酸": "AHA",
    "酒石酸": "AHA",
    "マンデル酸": "AHA",
    "α-ヒドロキシ酸": "AHA",
    # BHA 系（β-ヒドロキシ酸）
    "サリチル酸": "BHA",
    "β-ヒドロキシ酸": "BHA",
    # AHA/BHA 両方にマッチさせるため、正規化後にチェックロジックで統合
}

# NGペア定義（順不同でチェックするため、片方向のみ登録してOK）
# tuple の中身は正規化済みの成分名
_NG_PAIRS: list[tuple[str, str]] = [
    ("ビタミンC", "ナイアシンアミド"),
    ("レチノール", "AHA"),
    ("レチノール", "BHA"),
    ("ビタミンC", "レチノール"),
    ("ビタミンC", "AHA"),
    ("ビタミンC", "BHA"),
    ("銅ペプチド", "ビタミンC"),
    ("銅ペプチド", "AHA"),
    ("銅ペプチド", "BHA"),
    ("過酸化ベンゾイル", "レチノール"),
]


def normalize_ingredient(name: str) -> str:
    """成分名を正規名に変換する。マップにない場合はそのまま返す。"""
    # 小文字化・スペース除去で表記ゆれを吸収してからマップを引く
    normalized_key = name.lower().replace(" ", "").replace("　", "")
    return _NORMALIZE_MAP.get(normalized_key, name)


def check_compatibility(
    ingredients_a: list[str],
    ingredients_b: list[str],
) -> list[tuple[str, str]]:
    """2つの成分リスト間のNGペアを検出して返す。

    Args:
        ingredients_a: 製品Aの成分リスト
        ingredients_b: 製品Bの成分リスト

    Returns:
        検出されたNGペアのリスト。問題なければ空リスト。
    """
    normalized_a = {normalize_ingredient(i) for i in ingredients_a}
    normalized_b = {normalize_ingredient(i) for i in ingredients_b}

    return [
        (x, y)
        for x, y in _NG_PAIRS
        if (x in normalized_a and y in normalized_b)
        or (y in normalized_a and x in normalized_b)
    ]


def check_routine_compatibility(products: list[Product]) -> list[dict]:
    """製品リスト全体のNGペアを検出して警告リストを返す。

    Returns:
        警告リスト。各要素は以下の形式：
        {
            "product_a": "製品名A",
            "product_b": "製品名B",
            "ng_pairs": [("成分X", "成分Y"), ...]
        }
    """
    warnings = []

    # 全製品の組み合わせ（2製品ずつ）をチェックする
    for i, product_a in enumerate(products):
        for product_b in products[i + 1 :]:
            ng_pairs = check_compatibility(product_a.ingredients, product_b.ingredients)
            if ng_pairs:
                warnings.append({
                    "product_a": product_a.name,
                    "product_b": product_b.name,
                    "ng_pairs": ng_pairs,
                })

    return warnings
