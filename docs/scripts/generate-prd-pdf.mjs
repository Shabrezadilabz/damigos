import { mdToPdf } from "md-to-pdf";
import { mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const pdfs = [
  ["prd/GUEST-APP-PRD.md", "prd/pdf/GUEST-APP-PRD.pdf"],
  ["prd/CRM-APP-PRD.md", "prd/pdf/CRM-APP-PRD.pdf"],
];

const pdfCss = `
  body { font-family: system-ui, Segoe UI, sans-serif; font-size: 11pt; line-height: 1.45; max-width: 100%; }
  h1 { font-size: 20pt; border-bottom: 1px solid #ccc; padding-bottom: 0.25em; }
  h2 { font-size: 14pt; margin-top: 1.2em; }
  h3 { font-size: 12pt; }
  table { border-collapse: collapse; width: 100%; font-size: 9pt; }
  th, td { border: 1px solid #ddd; padding: 4px 6px; vertical-align: top; }
  th { background: #f5f5f5; }
  code { font-size: 9pt; }
  pre { font-size: 8pt; overflow-x: auto; }
`;

await mkdir(join(root, "prd", "pdf"), { recursive: true });

for (const [src, dest] of pdfs) {
  const input = join(root, src);
  const output = join(root, dest);
  console.log(`Generating ${dest} ...`);
  await mdToPdf({ path: input }, { dest: output, css: pdfCss, pdf_options: { format: "A4", margin: "18mm 14mm" } });
  console.log(`  OK → ${output}`);
}

console.log("Done.");
