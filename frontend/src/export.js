export function exportToCsv(filename, headers, rows) {
  if (!rows) {
    return false;
  }
  const headerKeys = headers.map(function (h) {
    return h.key;
  });
  const headerLabels = headers.map(function (h) {
    return escapeCsvValue(h.label);
  });

  const lines = [headerLabels.join(",")];

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const values = [];
    for (let k = 0; k < headerKeys.length; k++) {
      const key = headerKeys[k];
      const val = row[key];
      values.push(escapeCsvValue(val));
    }
    lines.push(values.join(","));
  }

  const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(lines.join("\n"));
  const link = document.createElement("a");
  link.setAttribute("href", csvContent);
  let downloadName = filename + ".csv";
  if (filename.toLowerCase().endsWith(".csv")) {
    downloadName = filename;
  }
  link.setAttribute("download", downloadName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return '""';
  }
  let stringValue = String(value);
  if (typeof value === "string" && /^[\t ]*[=+\-@]/.test(stringValue)) {
    stringValue = "'" + stringValue;
  }
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\r") || stringValue.includes("\n")) {
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }
  return '"' + stringValue + '"';
}

export function triggerPrintReport() {
  if (typeof window !== "undefined" && typeof window.print === "function") {
    window.print();
  }
}
