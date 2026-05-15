const XLSX = require('xlsx');

const bstr = require('fs').readFileSync('Moi_Vibaram_Template (2).xlsx', 'binary');
const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
const wsname = wb.SheetNames[0];
const ws = wb.Sheets[wsname];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

const headers = data[0].map(h => String(h).trim().toLowerCase());
console.log("Headers:", headers);

const rows = data.slice(1, 4); // look at first 3 rows
rows.forEach((row, idx) => {
    const item = {};
    headers.forEach((h, i) => {
        item[h] = row[i];
    });
    console.log("Row", idx+1, "Date:", item.date, "Type:", typeof item.date, item.date instanceof Date ? "isDate" : "notDate");
});
