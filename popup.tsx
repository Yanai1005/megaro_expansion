import { useEffect, useRef, useState } from "react"

import wasmUrl from "url:~/assets/web.wasm"

const INPUT_BASE = 0
const OUTPUT_BASE = 4096

interface WasmInstance {
  memory: WebAssembly.Memory
  bf_execute: (charCount: number) => number
  bf_compile: (charCount: number) => number
  _start: () => void
}

function writeUTF16LE(view: Uint8Array, base: number, s: string): number {
  for (let i = 0; i < s.length; i++) {
    const cp = s.charCodeAt(i)
    view[base + i * 2] = cp & 0xff
    view[base + i * 2 + 1] = (cp >> 8) & 0xff
  }
  return s.length
}

function readUTF16LE(view: Uint8Array, base: number, charCount: number): string {
  let result = ""
  for (let i = 0; i < charCount; i++) {
    const lo = view[base + i * 2]
    const hi = view[base + i * 2 + 1]
    result += String.fromCharCode(lo | (hi << 8))
  }
  return result
}

function IndexPopup() {
  const [code, setCode] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const wasmRef = useRef<WasmInstance | null>(null)

  useEffect(() => {
    const url = wasmUrl
    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buf) => WebAssembly.instantiate(buf))
      .then(({ instance }) => {
        const exports = instance.exports as unknown as WasmInstance
        exports._start()
        wasmRef.current = exports
      })
      .catch((e) => setError(`WASMの読み込みに失敗: ${e.message}`))
  }, [])

  const run = () => {
    const wasm = wasmRef.current
    if (!wasm) {
      setError("WASMが読み込まれていません")
      return
    }
    setError("")
    try {
      const mem = new Uint8Array(wasm.memory.buffer)
      const charCount = writeUTF16LE(mem, INPUT_BASE, code)
      const outCount = wasm.bf_execute(charCount)
      const result = readUTF16LE(
        new Uint8Array(wasm.memory.buffer),
        OUTPUT_BASE,
        outCount
      )
      setOutput(result)
    } catch (e) {
      setError(`実行エラー: ${(e as Error).message}`)
    }
  }

  return (
    <div style={{ padding: 16, width: 400, fontFamily: "monospace" }}>
      <h2 style={{ marginTop: 0, fontSize: 16 }}>Brainfuck インタプリタ</h2>

      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Brainfuck コードを入力..."
        rows={8}
        style={{
          width: "100%",
          boxSizing: "border-box",
          fontFamily: "monospace",
          fontSize: 13,
          resize: "vertical"
        }}
      />

      <button
        onClick={run}
        style={{
          marginTop: 8,
          padding: "6px 16px",
          cursor: "pointer",
          fontSize: 14
        }}>
        実行
      </button>

      {error && (
        <div
          style={{
            marginTop: 8,
            color: "red",
            fontSize: 13
          }}>
          {error}
        </div>
      )}

      {output !== "" && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
            出力:
          </div>
          <pre
            style={{
              background: "#f5f5f5",
              padding: 8,
              margin: 0,
              fontSize: 14,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              minHeight: 40
            }}>
            {output}
          </pre>
        </div>
      )}
    </div>
  )
}

export default IndexPopup
