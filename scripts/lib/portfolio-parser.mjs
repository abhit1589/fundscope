import XLSX from "xlsx";

const HEADER_HINTS = {
  isin: ["isin"],
  name: ["name of the instrument", "name of instrument", "security name", "issuer name"],
  sector: ["industry", "sector", "rating"],
  quantity: ["quantity", "face value"],
  value: ["market", "fair value", "value (rs"],
  weight: ["% to nav", "% of nav", "percent to nav"],
};

function findHeaderRow(matrix) {
  for (let r = 0; r < Math.min(matrix.length, 40); r++) {
    const row = matrix[r].map((c) => String(c).toLowerCase().trim());
    const hasIsin = row.some((c) => c.includes("isin"));
    const hasWeight = row.some((c) => c.includes("%") && c.includes("nav"));
    const hasName = row.some((c) =>
      HEADER_HINTS.name.some((h) => c.includes(h))
    );
    if (hasIsin && hasWeight && hasName) return r;
  }
  return -1;
}

function mapColumns(headerRow) {
  const cols = {};
  headerRow.forEach((cell, idx) => {
    const c = String(cell).toLowerCase().trim();
    if (!c) return;
    if (HEADER_HINTS.isin.some((h) => c.includes(h))) cols.isin = idx;
    if (HEADER_HINTS.name.some((h) => c.includes(h))) cols.name = idx;
    if (HEADER_HINTS.sector.some((h) => c.includes(h)) && cols.sector == null)
      cols.sector = idx;
    if (HEADER_HINTS.quantity.some((h) => c.includes(h)) && cols.quantity == null)
      cols.quantity = idx;
    if (HEADER_HINTS.value.some((h) => c.includes(h)) && cols.value == null)
      cols.value = idx;
    if (HEADER_HINTS.weight.some((h) => c.includes(h))) cols.weight = idx;
  });
  return cols;
}

function classifySection(text) {
  const t = String(text).toLowerCase();
  if (t.includes("equity")) return "Equity";
  if (t.includes("debt") || t.includes("bond") || t.includes("g-sec"))
    return "Debt";
  if (t.includes("money market") || t.includes("treasury") || t.includes("cash"))
    return "Cash";
  if (t.includes("reit") || t.includes("invit") || t.includes("gold"))
    return "Other";
  return null;
}

function parseNumber(v) {
  if (v === "" || v == null) return undefined;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isNaN(n) ? undefined : n;
}

function extractAsOf(matrix) {
  for (const row of matrix.slice(0, 8)) {
    for (const cell of row) {
      const m = String(cell).match(
        /portfolio\s+as\s+on\s+(\d{1,2}[-/][A-Za-z]{3,9}[-/]\d{4})/i
      );
      if (m) return m[1].replace(/\//g, "-");
    }
  }
  return null;
}

/**
 * Parse SEBI-style monthly portfolio Excel → full holdings list.
 */
export function parsePortfolioWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const headerIdx = findHeaderRow(matrix);
  if (headerIdx < 0) return { asOf: extractAsOf(matrix), holdings: [] };

  const cols = mapColumns(matrix[headerIdx]);
  if (cols.name == null || cols.weight == null) {
    return { asOf: extractAsOf(matrix), holdings: [] };
  }

  let section = "Other";
  const holdings = [];

  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const row = matrix[r];
    const joined = row.join(" ").trim();
    if (!joined) continue;

    const sectionHit = classifySection(joined);
    if (sectionHit && !parseNumber(row[cols.weight])) {
      section = sectionHit;
      continue;
    }

    const name = String(row[cols.name] ?? "").trim();
    const weight = parseNumber(row[cols.weight]);
    if (!name || weight == null || weight <= 0) continue;
    if (/^total$/i.test(name) || /net receivables/i.test(name)) continue;

    const isinRaw = cols.isin != null ? String(row[cols.isin] ?? "").trim() : "";
    const isin = /^IN[A-Z0-9]{10}$/i.test(isinRaw) ? isinRaw.toUpperCase() : undefined;

    holdings.push({
      isin,
      name: name.replace(/[£$]/g, "").trim(),
      sector:
        cols.sector != null ? String(row[cols.sector] ?? "").trim() || undefined : undefined,
      instrumentType: section,
      quantity: cols.quantity != null ? parseNumber(row[cols.quantity]) : undefined,
      valueLakh: cols.value != null ? parseNumber(row[cols.value]) : undefined,
      weightPct: weight,
    });
  }

  return { asOf: extractAsOf(matrix), holdings };
}
