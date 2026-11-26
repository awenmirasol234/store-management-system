// RFC 4180 compliant CSV parser and serializer

export function parseCsv(csvText) {
  if (typeof csvText !== "string") {
    return { headers: [], rows: [], rowCount: 0 };
  }

  // Strip leading UTF-8 Byte Order Mark (BOM) if present
  let text = csvText;
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // Normalize line endings
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const records = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;
  let index = 0;
  const length = text.length;

  while (index < length) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (index + 1 < length && text[index + 1] === '"') {
          // Escaped quote: "" -> "
          currentField = currentField + '"';
          index = index + 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          index = index + 1;
          continue;
        }
      } else {
        currentField = currentField + char;
        index = index + 1;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        index = index + 1;
        continue;
      } else if (char === ",") {
        currentRow.push(currentField);
        currentField = "";
        index = index + 1;
        continue;
      } else if (char === "\n") {
        currentRow.push(currentField);
        // Only push non-empty lines (avoid trailing newline creating an empty array)
        if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim().length > 0)) {
          records.push(currentRow);
        }
        currentRow = [];
        currentField = "";
        index = index + 1;
        continue;
      } else {
        currentField = currentField + char;
        index = index + 1;
        continue;
      }
    }
  }

  // Final field and row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim().length > 0)) {
      records.push(currentRow);
    }
  }

  if (records.length === 0) {
    return { headers: [], rows: [], rowCount: 0 };
  }

  // First row is headers
  const rawHeaders = records[0];
  const headers = [];
  for (let h = 0; h < rawHeaders.length; h = h + 1) {
    let headerName = rawHeaders[h].trim();
    if (headerName.startsWith("'")) {
      headerName = headerName.slice(1).trim();
    }
    headers.push(headerName);
  }

  const rows = [];
  for (let r = 1; r < records.length; r = r + 1) {
    const record = records[r];
    const rowObj = {};
    for (let c = 0; c < headers.length; c = c + 1) {
      const headerKey = headers[c];
      let val = "";
      if (c < record.length) {
        val = record[c].trim();
        // Remove formula-escaped leading apostrophe if present
        if (val.startsWith("'")) {
          val = val.slice(1);
        }
      }
      rowObj[headerKey] = val;
    }
    rows.push(rowObj);
  }

  return {
    headers: headers,
    rows: rows,
    rowCount: rows.length
  };
}

export function escapeCsvField(value) {
  if (value === null || value === undefined) {
    return '""';
  }
  let str = String(value);
  // Protect against spreadsheet formula injection
  if (/^[\t ]*[=+\-@]/.test(str)) {
    str = "'" + str;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return '"' + str + '"';
}

export function generateCsv(headers, rows) {
  const headerKeys = [];
  const headerLabels = [];

  for (let i = 0; i < headers.length; i = i + 1) {
    const item = headers[i];
    if (typeof item === "string") {
      headerKeys.push(item);
      headerLabels.push(escapeCsvField(item));
    } else {
      headerKeys.push(item.key);
      headerLabels.push(escapeCsvField(item.label || item.key));
    }
  }

  const lines = [headerLabels.join(",")];

  for (let r = 0; r < rows.length; r = r + 1) {
    const row = rows[r];
    const values = [];
    for (let k = 0; k < headerKeys.length; k = k + 1) {
      const key = headerKeys[k];
      values.push(escapeCsvField(row[key]));
    }
    lines.push(values.join(","));
  }

  return lines.join("\n");
}
