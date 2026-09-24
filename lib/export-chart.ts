/**
 * Rasterizes the `<svg>` found inside `container` to a PNG and downloads it.
 *
 * Chart colors are drawn with CSS custom properties (e.g. `fill="var(--primary)"`)
 * that only resolve against the page's stylesheet. Once the SVG is cloned into a
 * standalone document (which is what happens when it's loaded into an `<img>` via
 * a blob URL) those variables would no longer resolve, so their current computed
 * values are baked into an inline `<style>` block before serializing.
 */
export async function downloadChartAsPng(container: HTMLElement, filename: string): Promise<void> {
  const svg = container.querySelector("svg")
  if (!svg) {
    alert("No chart to export")
    return
  }

  const rect = container.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))

  const svgClone = svg.cloneNode(true) as SVGElement
  svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  svgClone.setAttribute("width", String(width))
  svgClone.setAttribute("height", String(height))
  inlineCssVariables(svgClone, container)

  const svgString = new XMLSerializer().serializeToString(svgClone)
  const svgUrl = URL.createObjectURL(new Blob([svgString], { type: "image/svg+xml;charset=utf-8" }))

  try {
    const image = await loadImage(svgUrl)

    const scale = Math.max(window.devicePixelRatio || 1, 2)
    const canvas = document.createElement("canvas")
    canvas.width = width * scale
    canvas.height = height * scale

    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas 2D context unavailable")

    ctx.scale(scale, scale)
    // Fill with the chart's actual background so the PNG isn't transparent
    // (which reads as broken/blank in most image viewers).
    ctx.fillStyle = resolveBackgroundColor(container)
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(image, 0, 0, width, height)

    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
    if (!pngBlob) throw new Error("Failed to rasterize chart to PNG")

    const pngUrl = URL.createObjectURL(pngBlob)
    const pngFilename = filename.replace(/\.(svg|png)$/i, "") + ".png"
    const anchor = document.createElement("a")
    anchor.href = pngUrl
    anchor.download = pngFilename
    anchor.click()
    URL.revokeObjectURL(pngUrl)
  } catch (error) {
    console.error("Failed to export chart as PNG", error)
    alert("Failed to export chart")
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Failed to load chart SVG for rasterization"))
    image.src = src
  })
}

/** Bakes the current computed value of any `var(--foo)` used in the SVG into an inline `<style>` block. */
function inlineCssVariables(svgClone: SVGElement, sourceEl: HTMLElement): void {
  const serialized = new XMLSerializer().serializeToString(svgClone)
  const varNames = Array.from(
    new Set(Array.from(serialized.matchAll(/var\((--[a-zA-Z0-9-]+)\)/g), (m) => m[1])),
  )
  if (varNames.length === 0) return

  const computed = getComputedStyle(sourceEl)
  const declarations = varNames
    .map((name) => `${name}: ${computed.getPropertyValue(name).trim()};`)
    .join(" ")

  const style = document.createElementNS("http://www.w3.org/2000/svg", "style")
  style.textContent = `:root, svg { ${declarations} }`
  svgClone.insertBefore(style, svgClone.firstChild)
}

/** Walks up from `el` to find the nearest non-transparent background color. */
function resolveBackgroundColor(el: HTMLElement): string {
  let node: HTMLElement | null = el
  while (node) {
    const bg = getComputedStyle(node).backgroundColor
    if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg
    node = node.parentElement
  }
  return "#ffffff"
}
