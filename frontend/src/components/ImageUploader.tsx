import { useState, useRef, DragEvent } from 'react'

interface Props {
  onImage: (file: File) => void
  disabled?: boolean
}

export default function ImageUploader({ onImage, disabled }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setPreview(URL.createObjectURL(file))
    onImage(file)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        dragOver ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-600'
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      {preview ? (
        <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg object-contain" />
      ) : (
        <div className="text-gray-400 dark:text-gray-500">
          <div className="text-4xl mb-2">📸</div>
          <p>Drop a food photo here or click to browse</p>
          <p className="text-sm mt-1">NutriSnap will estimate calories using AI</p>
        </div>
      )}
    </div>
  )
}
