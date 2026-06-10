const XLSX = require('xlsx');

const generarExcel = (data, nombreHoja) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, nombreHoja);

  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, 20)
  }));
  worksheet['!cols'] = colWidths;

  return workbook;
};

module.exports = { generarExcel };