// バーコードスキャナーコンポーネント（html5-qrcodeを使用）

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onCancel: () => void
}

const SCANNER_DIV_ID = "barcode-scanner-region"

// html5-qrcodeのstop()を安全に呼ぶユーティリティ
// スキャナーが未起動のときstop()が同期例外を投げることがあるため
function safeStop(scanner: Html5Qrcode) {
  try {
    scanner.stop().catch(() => {})
  } catch {
    // 未起動状態のstop()は無視する
  }
}

export function BarcodeScanner({ onScan, onCancel }: BarcodeScannerProps) {
  const [cameraError, setCameraError] = useState<string | null>(null)
  const scannedRef = useRef(false)

  useEffect(() => {
    // active フラグでStrictModeの二重実行によるstate更新を防ぐ
    let active = true
    scannedRef.current = false

    // StrictModeの二重実行でDOMに残骸が残る場合のクリーンアップ
    const el = document.getElementById(SCANNER_DIV_ID)
    if (el) el.innerHTML = ""

    let scanner: Html5Qrcode | null = null
    try {
      scanner = new Html5Qrcode(SCANNER_DIV_ID)
    } catch (err) {
      console.error("スキャナー初期化エラー:", err)
      if (active) setCameraError("カメラを起動できませんでした。カメラへのアクセスを許可してください。")
      return () => { active = false }
    }

    const s = scanner

    // 複数カメラがある端末で適切な背面カメラを選ぶ
    // facingMode指定だと広角・超広角が選ばれることがあるため、カメラIDで明示的に指定する
    const selectCamera = async (): Promise<string | MediaTrackConstraints> => {
      try {
        const cameras = await Html5Qrcode.getCameras()
        if (cameras.length === 0) return { facingMode: "environment" }

        // 広角・超広角を除いたメイン背面カメラを優先する
        const main = cameras.find(c => {
          const label = c.label.toLowerCase()
          return (label.includes("back") || label.includes("rear") || label.includes("背面")) &&
            !label.includes("wide") &&
            !label.includes("ultra") &&
            !label.includes("macro")
        })
        // 見つからなければリストの最後（多くの端末でメインカメラ）
        return (main ?? cameras[cameras.length - 1]).id
      } catch {
        return { facingMode: "environment" }
      }
    }

    selectCamera().then(cameraConfig =>
      s.start(
        cameraConfig,
        {
          fps: 10,
          // バーコード用に横長のスキャン枠を設定
          qrbox: { width: 280, height: 100 },
        },
        (decodedText) => {
          if (scannedRef.current || !active) return
          scannedRef.current = true
          safeStop(s)
          onScan(decodedText)
        },
        () => {
          // スキャン未成功（毎フレーム呼ばれる）は無視する
        }
      )
    ).catch((err) => {
      console.error("カメラ起動エラー:", err)
      if (!active) return
      const isHttps = location.protocol === "https:"
      if (!isHttps) {
        setCameraError(
          "カメラを起動できませんでした。iOSはHTTPS接続が必要です。Androidの場合はカメラへのアクセスを許可してください。"
        )
      } else {
        setCameraError("カメラを起動できませんでした。カメラへのアクセスを許可してください。")
      }
    })

    return () => {
      active = false
      safeStop(s)
    }
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <p className="text-sm font-medium text-gray-700">
          バーコードをカメラに向けてください
        </p>
        <p className="text-xs text-gray-400 mt-1">
          製品パッケージのJANコード（縦縞のバーコード）
        </p>
      </div>

      {cameraError ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
          <p className="text-sm text-red-700">{cameraError}</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border-2 border-pink-200">
          {/* html5-qrcodeがここにカメラ映像を描画する */}
          <div id={SCANNER_DIV_ID} className="w-full" />
        </div>
      )}

      <button
        onClick={onCancel}
        className="text-sm text-gray-400 underline hover:text-gray-600 text-center"
      >
        キャンセル
      </button>
    </div>
  )
}
