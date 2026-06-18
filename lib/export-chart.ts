export async function downloadChartAsPng(container: HTMLElement, filename: string): Promise<void> {
  const svg = container.querySelector("svg")
  if (!svg) {
    alert("No chart to export")
    return
  }

  const rect = container.getBoundingClientRect()

  const svgClone = svg.cloneNode(true) as SVGElement
  svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  svgClone.setAttribute("width", String(rect.width))
  svgClone.setAttribute("height", String(rect.height))

  const str = new XMLSerializer().serializeToString(svgClone)
  const blob = new Blob([str], { type: "image/svg+xml" })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename.endsWith(".svg") ? filename : `${filename}.svg`
  anchor.click()

  URL.revokeObjectURL(url)
}
