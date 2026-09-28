/**
 * Small RFC-4180-ish CSV parser: handles quoted fields, escaped quotes
 * (""), and commas/newlines inside quotes. Good enough for contact
 * export files from Shopify/Mailchimp/Google Sheets without pulling in
 * a dependency for something this contained.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      // skip, \n handles the row break
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

const HEADER_ALIASES: Record<string, string> = {
  email: "email",
  "email address": "email",
  "first name": "firstName",
  firstname: "firstName",
  "last name": "lastName",
  lastname: "lastName",
  phone: "phone",
  "phone number": "phone",
};

export function csvToContactRows(csvText: string) {
  const rows = parseCsv(csvText);
  if (rows.length === 0) return { rows: [], skipped: 0 };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const mapped = header.map((h) => HEADER_ALIASES[h] ?? null);

  const dataRows = rows.slice(1);
  const result: { email?: string; firstName?: string; lastName?: string; phone?: string }[] = [];
  let skipped = 0;

  for (const raw of dataRows) {
    const record: Record<string, string> = {};
    mapped.forEach((key, idx) => {
      if (key) record[key] = (raw[idx] ?? "").trim();
    });
    if (record.email) {
      result.push(record);
    } else {
      skipped++;
    }
  }

  return { rows: result, skipped };
}
