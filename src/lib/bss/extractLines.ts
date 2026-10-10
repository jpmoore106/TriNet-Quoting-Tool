// Turns a PDF into text lines per page using pdf.js: text items that share a baseline become one line.
type TextItem = { str: string; transform: number[] };
type PdfJs = {
  getDocument: (src: { data: Uint8Array; useSystemFonts?: boolean; isEvalSupported?: boolean }) => {
    promise: Promise<{ numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: unknown[] }> }> }>;
  };
};

export async function extractPdfLines(pdfjs: PdfJs, data: Uint8Array): Promise<string[][]> {
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  const pages: string[][] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    const items = (content.items as TextItem[]).filter((i) => typeof i.str === "string" && i.str.trim() !== "");
    const rows: { y: number; parts: { x: number; s: string }[] }[] = [];
    for (const it of items) {
      const x = it.transform[4];
      const y = it.transform[5];
      const row = rows.find((r) => Math.abs(r.y - y) < 2.5);
      if (row) row.parts.push({ x, s: it.str });
      else rows.push({ y, parts: [{ x, s: it.str }] });
    }
    rows.sort((a, b) => b.y - a.y);
    pages.push(rows.map((r) => r.parts.sort((a, b) => a.x - b.x).map((p) => p.s.trim()).join(" ").replace(/\s+/g, " ").trim()));
  }
  return pages;
}
