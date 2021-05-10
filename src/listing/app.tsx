import React, { useEffect, useRef } from "react"

export const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current;

    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  }, [])

  return <canvas ref={canvasRef} width="384" height="216" />
}