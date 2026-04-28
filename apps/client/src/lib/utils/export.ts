import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Papa from "papaparse";

interface ExportData {
	columns: string[];
	data: (string | number | boolean | null | undefined)[][];
}

export const exportToCSV = (filename: string, { columns, data }: ExportData) => {
	const csv = Papa.unparse({
		fields: columns,
		data: data,
	});

	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = `${filename}.csv`;
	link.click();
};

export const exportToExcel = (filename: string, { columns, data }: ExportData) => {
	const ws = XLSX.utils.aoa_to_sheet([columns, ...data]);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
	XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToPDF = (filename: string, { columns, data }: ExportData) => {
	const doc = new jsPDF();

	const filteredData = data.map(row => 
		row.map(cell => cell ?? "")
	);

	autoTable(doc, {
		head: [columns],
		body: filteredData as never,
		margin: { top: 10 },
		styles: {
			fontSize: 10,
			cellPadding: 3,
		},
		headStyles: {
			fillColor: [66, 133, 244],
			textColor: 255,
			fontStyle: "bold",
		},
	});

	doc.save(`${filename}.pdf`);
};
