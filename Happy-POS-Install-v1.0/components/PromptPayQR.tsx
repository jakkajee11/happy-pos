'use client'
import { useEffect, useRef, useState } from 'react'
import { buildPromptPayPayload, formatPromptPayAccount } from '@/lib/promptpay'

interface Props {
  account: string   // หมายเลขโทรศัพท์ หรือ เลขนิติบุคคล
  amount?: number   // จำนวนเงิน (บาท)
  size?: number     // ขนาด QR (px) default 200
}

export default function PromptPayQR({ account, amount, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!account) return
    setLoading(true)
    setError(null)

    const payload = buildPromptPayPayload(account, amount)

    // Dynamic import — qrcode is client-only (canvas API)
    import('qrcode').then((QRCode) => {
      const canvas = canvasRef.current
      if (!canvas) return
      QRCode.toCanvas(canvas, payload, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      }, (err) => {
        if (err) {
          console.error('QR generation error:', err)
          setError('ไม่สามารถสร้าง QR Code ได้')
        }
        setLoading(false)
      })
    }).catch(() => {
      setError('โหลด QR library ไม่สำเร็จ')
      setLoading(false)
    })
  }, [account, amount, size])

  if (!account) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-sm"
        style={{ width: size, height: size }}
      >
        <span className="text-3xl mb-2">📱</span>
        <span>ยังไม่ได้ตั้งค่า PromptPay</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* PromptPay logo badge */}
      <div className="flex items-center gap-1.5 bg-[#003b7a] text-white px-3 py-1 rounded-full text-xs font-semibold">
        <span>💳</span>
        <span>PromptPay</span>
      </div>

      {/* QR Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="rounded-xl shadow-sm"
          style={{ display: loading || error ? 'none' : 'block' }}
        />
        {loading && !error && (
          <div
            className="flex items-center justify-center bg-gray-50 rounded-xl animate-pulse"
            style={{ width: size, height: size }}
          >
            <span className="text-gray-300 text-4xl">⬛</span>
          </div>
        )}
        {error && (
          <div
            className="flex flex-col items-center justify-center bg-red-50 rounded-xl border border-red-200 text-red-500 text-sm"
            style={{ width: size, height: size }}
          >
            <span className="text-2xl mb-1">⚠️</span>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Account display */}
      <div className="text-center">
        <p className="text-xs text-gray-500">หมายเลข PromptPay</p>
        <p className="text-sm font-mono font-semibold text-gray-700">{formatPromptPayAccount(account)}</p>
      </div>
    </div>
  )
}
