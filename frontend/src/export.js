export function exportToCsv(filename, headers, rows) {
  if (!rows || rows.length === 0) {
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
  link.setAttribute("download", filename.endsWith(".csv") ? filename : filename + ".csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return '""';
  }
  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return '"' + stringValue.replace(/"/g, '""') + '"';
  }
  return '"' + stringValue + '"';
}

export function triggerPrintReport() {
  if (typeof window !== "undefined" && typeof window.print === "function") {
    window.print();
  }
}
