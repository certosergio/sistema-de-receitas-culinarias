import React, { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface RecipeQrCodeProps {
  /** The URL to encode in the QR code. */
  url: string
  /** Pixel size of the QR code (square). Defaults to 64. */
  size?: number
  /** Optional className for the wrapping element. */
  className?: string
}

/**
 * Renders a small, client-side QR code pointing to a recipe's ficha técnica.
 *
 * Uses the `qrcode` npm package to draw onto a <canvas>. Generation happens
 * entirely in the browser — no server-side canvas. The QR modules use a deep
 * verde (#24392C) on a transparent background so the code stays legible in
 * both light and dark themes (the host surface provides the contrast).
 */
export const RecipeQrCode: React.FC<RecipeQrCodeProps> = ({ url, size = 64, className }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let cancelled = false
    const canvas = canvasRef.current
    if (!canvas) return

    QRCode.toCanvas(
      canvas,
      url,
      {
        width: size,
        margin: 0,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#24392C',
          light: '#00000000', // transparent
        },
      },
      (err) => {
        if (err && !cancelled) {
          console.error('Falha ao gerar QR code:', err)
        }
      },
    )

    return () => {
      cancelled = true
    }
  }, [url, size])

  return (
    <span
      className={`inline-block rounded bg-white p-0.5 leading-none ${className ?? ''}`}
      style={{ lineHeight: 0 }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: size, height: size }} />
    </span>
  )
}

export default RecipeQrCode
