const xlsx = require('xlsx');
const wb = xlsx.readFile('C:\\Users\\DENNIS\\Downloads\\Complete_Sorted_Student_Details_Corrected.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
console.log(JSON.stringify(xlsx.utils.sheet_to_json(ws).slice(0, 5), null, 2));
