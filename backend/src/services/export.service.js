const ExcelJS = require('exceljs');

const generarExcel = async (data, nombreHoja) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(nombreHoja);

  if (data.length > 0) {
    const columns = Object.keys(data[0]).map(key => ({
      header: key,
      key,
      width: Math.max(key.length, 20)
    }));
    worksheet.columns = columns;
    data.forEach(row => worksheet.addRow(row));
  }

  return workbook;
};

module.exports = { generarExcel };