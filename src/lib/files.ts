/** Shares a JSON file via the Web Share API on phones, downloads it elsewhere. */
export async function shareOrDownloadJson(
  data: unknown,
  fileName: string,
  title: string,
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const json = JSON.stringify(data, null, 2)
  const file = new File([json], fileName, { type: 'application/json' })
  const coarse = window.matchMedia('(pointer: coarse)').matches
  if (coarse && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled'
    }
  }
  downloadFile(file)
  return 'downloaded'
}

export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true })
    input.addEventListener('cancel', () => resolve(null), { once: true })
    input.click()
  })
}
