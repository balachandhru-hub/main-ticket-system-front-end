import * as XLSX from "xlsx";

// Convert "key_name" → "Key Name"
const formatHeader = (key: string) => {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export const downloadExcel = (jsonData: any[], fileName: string) => {
  if (!jsonData || jsonData.length === 0) return;

  // Format headers
  const formattedData = jsonData.map((row) => {
    const formattedRow: any = {};
    Object.keys(row).forEach((key) => {
      formattedRow[formatHeader(key)] = row[key];
    });
    return formattedRow;
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // ------------------------------------------------
  // APPLY BOLD STYLE TO HEADERS (Row = 0)
  // ------------------------------------------------
  const headerKeys = Object.keys(formattedData[0] ?? {});

  headerKeys.forEach((_, index) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });

    if (!worksheet[cellAddress]) return;

    worksheet[cellAddress].s = {
      font: { bold: true }
    };
  });

  // ------------------------------------------------
  // AUTO COLUMN WIDTH BASED ON MAX TEXT LENGTH
  // ------------------------------------------------
  const columnWidths = headerKeys.map((key) => {
    let maxLength = key.length;

    formattedData.forEach((row) => {
      const cellValue = row[key] ? row[key].toString() : "";
      maxLength = Math.max(maxLength, cellValue.length);
    });

    return { wch: maxLength + 4 };
  });

  worksheet["!cols"] = columnWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  // Download Excel file
  XLSX.writeFile(workbook, fileName);
};
