import { useState } from "react";
import {
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	getPaginationRowModel,
	getFilteredRowModel,
	useReactTable,
	type SortingState,
	type ColumnFiltersState,
	type ColumnDef,
} from "@tanstack/react-table";
import { HiChevronLeft, HiChevronRight, HiArrowsUpDown, HiArrowUp, HiArrowDown, HiEllipsisHorizontal } from "react-icons/hi2";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/utils/export";

interface DataTableProps<T> {
	columns: ColumnDef<T>[];
	data: T[];
	exportFilename?: string;
	searchPlaceholder?: string;
}

export function DataTable<T>({
	columns,
	data,
	exportFilename = "export",
	searchPlaceholder = "Search...",
}: DataTableProps<T>) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [pageSize, setPageSize] = useState(10);

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnFilters,
			globalFilter,
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	const handleExport = (format: "csv" | "excel" | "pdf") => {
		const headers = table
			.getVisibleLeafColumns()
			.map((col) => (col.columnDef.header as string) || "");

		const rows = table.getRowModel().rows.map((row) =>
			row.getVisibleCells().map((cell) => {
				const value = cell.getValue();
				if (value === null || value === undefined) return "";
				if (typeof value === "object") return JSON.stringify(value);
				return String(value);
			}),
		);

		const exportData = {
			columns: headers,
			data: rows,
		};

		switch (format) {
			case "csv":
				exportToCSV(exportFilename, exportData);
				break;
			case "excel":
				exportToExcel(exportFilename, exportData);
				break;
			case "pdf":
				exportToPDF(exportFilename, exportData);
				break;
		}
	};

	return (
		<div className="space-y-4">
			{/* Toolbar */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<input
					type="text"
					placeholder={searchPlaceholder}
					value={globalFilter}
					onChange={(e) => setGlobalFilter(e.target.value)}
					className="rounded-2xl border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-brand"
				/>

				<div className="relative">
					<ExportMenu onExport={handleExport} />
				</div>
			</div>

			{/* Table */}
			<div className="overflow-x-auto rounded-3xl border border-border">
				<table className="min-w-full border-collapse bg-surface text-left text-sm">
					<thead className="bg-surface-muted text-xs uppercase tracking-[0.14em] text-ink-soft">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										className="px-4 py-3 font-semibold"
										onClick={header.column.getToggleSortingHandler()}
										style={{ cursor: header.column.getCanSort() ? "pointer" : "default" }}
									>
										<div className="inline-flex items-center gap-2">
											{flexRender(header.column.columnDef.header, header.getContext())}
											{header.column.getCanSort() && (
												<span>
													{header.column.getIsSorted() === "asc" ? (
														<HiArrowUp className="h-4 w-4 text-brand" />
													) : header.column.getIsSorted() === "desc" ? (
														<HiArrowDown className="h-4 w-4 text-brand" />
													) : (
													<HiArrowsUpDown className="h-4 w-4 text-ink-soft opacity-50" />
													)}
												</span>
											)}
										</div>
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody>
						{table.getRowModel().rows.map((row) => (
							<tr key={row.id} className="border-t border-border align-top">
								{row.getVisibleCells().map((cell) => (
									<td key={cell.id} className="px-4 py-3 text-ink-soft">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>

				{table.getRowModel().rows.length === 0 && (
					<div className="px-4 py-5 text-center text-sm text-ink-soft">
						No records found.
					</div>
				)}
			</div>

			{/* Pagination */}
			<div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
				<div className="flex items-center gap-2">
					<span className="text-sm text-ink-soft">Rows per page:</span>
					<select
						value={pageSize}
						onChange={(e) => {
							setPageSize(Number(e.target.value));
							table.setPageSize(Number(e.target.value));
						}}
						className="rounded-2xl border border-border bg-surface px-2 py-1 text-sm outline-none focus:border-brand"
					>
						{[5, 10, 20, 30, 40, 50].map((size) => (
							<option key={size} value={size}>
								{size}
							</option>
						))}
					</select>
				</div>

				<div className="text-sm text-ink-soft">
					Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
				</div>

				<div className="flex items-center gap-2">
					<button
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
						className="rounded-2xl border border-border bg-surface px-3 py-1 transition-colors hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<HiChevronLeft className="h-4 w-4" />
					</button>
					<button
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
						className="rounded-2xl border border-border bg-surface px-3 py-1 transition-colors hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<HiChevronRight className="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	);
}

function ExportMenu({ onExport }: { onExport: (format: "csv" | "excel" | "pdf") => void }) {
	const [open, setOpen] = useState(false);

	return (
		<div className="relative inline-block text-left">
			<button
				type="button"
				onClick={() => setOpen((s) => !s)}
				className="rounded-full border border-border bg-surface p-2 text-ink transition-colors hover:bg-surface-muted"
				aria-haspopup="true"
				aria-expanded={open}
			>
				<HiEllipsisHorizontal className="h-5 w-5" />
			</button>

			{open && (
				<div className="absolute right-0 mt-2 w-40 rounded-lg border border-border bg-surface p-2 shadow-lg">
					<button
						className="w-full text-left rounded px-2 py-2 text-sm hover:bg-surface-muted"
						onClick={() => {
							onExport("csv");
							setOpen(false);
						}}
					>
						Export CSV
					</button>
					<button
						className="w-full text-left rounded px-2 py-2 text-sm hover:bg-surface-muted"
						onClick={() => {
							onExport("excel");
							setOpen(false);
						}}
					>
						Export Excel
					</button>
					<button
						className="w-full text-left rounded px-2 py-2 text-sm hover:bg-surface-muted"
						onClick={() => {
							onExport("pdf");
							setOpen(false);
						}}
					>
						Export PDF
					</button>
				</div>
			)}
		</div>
	);
}
