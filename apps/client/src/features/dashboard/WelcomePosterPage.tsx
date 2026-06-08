import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { HiArrowDownTray, HiPhoto } from "react-icons/hi2";
import { useStudentsQuery } from "@/features/students/students.queries";
import { useSession } from "@/lib/session";
import { API_BASE_URL } from "@/api/client";
import toast from "react-hot-toast";

const SERVER_BASE = API_BASE_URL.replace(/\/api\/?$/, "");

const LEVEL_LABELS: Record<string | number, string> = {
	1: "Seed", 2: "Sprout", 3: "Root", 4: "Leaf",
	5: "Bud", 6: "Bloom", 7: "Fruit",
};

function fmtDate(val?: string | Date | null): string {
	if (!val) return "—";
	const d = typeof val === "string" ? new Date(val) : val;
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
		img.src = src;
	});
}

async function downloadPoster(student: any) {
	if (!student.profilePic) {
		toast.error("This student has no profile picture yet.");
		return;
	}

	const res = await fetch(`${SERVER_BASE}/form/student/${student.id}/profile-image`);
	if (!res.ok) throw new Error("Failed to load profile image");
	const blob = await res.blob();
	const profileUrl = URL.createObjectURL(blob);

	try {
		const canvas = document.createElement("canvas");
		canvas.width = 1080;
		canvas.height = 1350;
		const ctx = canvas.getContext("2d");
		if (!ctx) throw new Error("Failed to get canvas context");

		const [bg, profileImg] = await Promise.all([
			loadImage("/welcome/1.jpg"),
			loadImage(profileUrl),
		]);

		ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

		const imageX = 206;
		const imageY = 538;
		const imageSize = 254;
		const borderRadius = 60;

		const imgW = profileImg.naturalWidth || profileImg.width;
		const imgH = profileImg.naturalHeight || profileImg.height;
		let srcX = 0;
		let srcY = 0;
		let srcSize = Math.min(imgW, imgH);
		if (imgW > imgH) { srcX = Math.round((imgW - imgH) / 2); srcSize = imgH; }
		else if (imgH > imgW) { srcY = Math.round((imgH - imgW) / 2); srcSize = imgW; }

		ctx.save();
		ctx.beginPath();
		ctx.moveTo(imageX + borderRadius, imageY);
		ctx.lineTo(imageX + imageSize - borderRadius, imageY);
		ctx.quadraticCurveTo(imageX + imageSize, imageY, imageX + imageSize, imageY + borderRadius);
		ctx.lineTo(imageX + imageSize, imageY + imageSize - borderRadius);
		ctx.quadraticCurveTo(imageX + imageSize, imageY + imageSize, imageX + imageSize - borderRadius, imageY + imageSize);
		ctx.lineTo(imageX + borderRadius, imageY + imageSize);
		ctx.quadraticCurveTo(imageX, imageY + imageSize, imageX, imageY + imageSize - borderRadius);
		ctx.lineTo(imageX, imageY + borderRadius);
		ctx.quadraticCurveTo(imageX, imageY, imageX + borderRadius, imageY);
		ctx.closePath();
		ctx.clip();
		ctx.drawImage(profileImg, srcX, srcY, srcSize, srcSize, imageX, imageY, imageSize, imageSize);
		ctx.restore();

		const name = student.name ?? "";
		if (name) {
			const centerX = imageX + imageSize / 2;
			const padding = Math.round(canvas.height * 0.02);
			const textY = imageY + imageSize + padding;
			const fontSize = Math.round(canvas.width * 0.02);
			ctx.font = `500 ${fontSize}px Inter, sans-serif`;
			ctx.textAlign = "center";
			ctx.textBaseline = "top";
			ctx.fillStyle = "#000";
			ctx.fillText(name, centerX, textY);
			const country = student.residingCountry ?? student.country ?? student.county ?? "";
			if (country) {
				const smallFont = Math.round(fontSize * 0.65);
				const countryY = textY + fontSize + Math.round(canvas.height * 0.005);
				ctx.font = `300 ${smallFont}px Inter, sans-serif`;
				ctx.fillStyle = "rgba(0,0,0,0.8)";
				ctx.fillText(country, centerX, countryY);
			}
		}

		const outputBlob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob((b) => resolve(b), "image/jpeg", 0.95);
		});
		if (!outputBlob) throw new Error("Failed to create image");

		const url = URL.createObjectURL(outputBlob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `zidnee-welcome-poster-${student.zid}.jpg`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		toast.success("Welcome poster downloaded!");
	} finally {
		URL.revokeObjectURL(profileUrl);
	}
}

export const WelcomePosterPage = () => {
	const { token } = useSession();
	const [searchParams, setSearchParams] = useSearchParams();
	const searchTerm = searchParams.get("search") ?? "";
	const page = Number(searchParams.get("page") ?? "1");
	const limit = Number(searchParams.get("limit") ?? "50");
	const [downloadingId, setDownloadingId] = useState<string | null>(null);

	const studentsQuery = useStudentsQuery(token, {
		scope: "all",
		status: "STUDENT",
		search: searchTerm || undefined,
		sortBy: "admittedAt",
		sortOrder: "desc",
		page,
		limit,
	});

	const setQueryParam = (key: string, value?: string) => {
		const next = new URLSearchParams(searchParams);
		if (value) next.set(key, value); else next.delete(key);
		setSearchParams(next);
	};

	const rows = useMemo(
		() => ((studentsQuery.data?.students ?? []) as any[]).filter((s) => !(s.processId || s.processLabel)),
		[studentsQuery.data?.students],
	);

	const totalPages = (studentsQuery.data as any)?.pagination?.totalPages ?? 1;
	const totalCount = (studentsQuery.data as any)?.pagination?.total ?? rows.length;

	const handleDownload = (student: any) => {
		if (downloadingId) return;
		setDownloadingId(student.id);
		downloadPoster(student).catch((e) => {
			toast.error(e instanceof Error ? e.message : "Download failed");
		}).finally(() => {
			setDownloadingId(null);
		});
	};

	return (
		<div className="space-y-3">
			{/* Page header */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100">
						<HiPhoto className="h-5 w-5 text-teal-700" />
					</div>
					<div>
						<h1 className="text-lg font-bold text-gray-900">Welcome Posters</h1>
						<p className="mt-0.5 text-sm text-gray-500">
							{totalCount > 0 ? `${totalCount} active student${totalCount !== 1 ? "s" : ""}` : "No students"}
							{" · "}Most recently admitted first
						</p>
					</div>
				</div>
			</div>

			{/* Search toolbar */}
			<div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3">
				<input
					value={searchTerm}
					onChange={(e) => { setQueryParam("search", e.target.value); setQueryParam("page", undefined); }}
					placeholder="Search by name, phone, or ZID…"
					className="w-64 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
				/>
				{searchTerm ? (
					<button
						type="button"
						onClick={() => setQueryParam("search", undefined)}
						className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
					>
						Clear
					</button>
				) : null}
				{downloadingId ? (
					<p className="ml-auto text-xs text-teal-600 font-medium">Generating poster…</p>
				) : (
					<p className="ml-auto text-xs text-gray-400">Page {page} of {totalPages}</p>
				)}
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
				{studentsQuery.isLoading ? (
					<div className="flex justify-center py-16">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
					</div>
				) : rows.length === 0 ? (
					<div className="py-16 text-center">
						<HiPhoto className="mx-auto h-10 w-10 text-gray-200" />
						<p className="mt-2 text-sm text-gray-400">No students found.</p>
					</div>
				) : (
					<>
						<div className="overflow-x-auto">
							<table className="min-w-full border-collapse text-sm">
								<thead>
									<tr className="border-b border-gray-100 bg-gray-50/80">
										<th className="py-2.5 pl-5 pr-4 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Student</th>
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">ZID</th>
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Admitted</th>
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Level</th>
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Type</th>
										<th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-gray-400">Photo</th>
										<th className="px-4 py-2.5 pr-5 text-right text-[11px] font-bold uppercase tracking-widest text-gray-400">Poster</th>
									</tr>
								</thead>
								<tbody>
									{rows.map((s) => {
										const level = s.level ? (LEVEL_LABELS[s.level] ?? `Level ${s.level}`) : null;
										const isDownloading = downloadingId === s.id;
										const hasPhoto = Boolean(s.profilePic);

										return (
											<tr key={s.id} className="border-b border-gray-100 transition-colors hover:bg-slate-50">
												<td className="py-3.5 pl-5 pr-4">
													<div className="flex items-center gap-3 min-w-0">
														<div className="h-8 w-8 shrink-0 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700 select-none">
															{(s.name ?? s.zid)[0]?.toUpperCase()}
														</div>
														<div className="min-w-0">
															<Link to={`/students/${s.id}`} className="block font-bold text-teal-700 hover:underline text-sm leading-tight truncate">
																{s.name ?? s.zid.toUpperCase()}
															</Link>
															{s.phone ? <p className="text-[11px] text-gray-400 leading-snug">{s.phone}</p> : null}
														</div>
													</div>
												</td>

												<td className="px-4 py-3.5">
													<span className="inline-flex rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold text-teal-700">
														{s.zid.toUpperCase()}
													</span>
												</td>

												<td className="px-4 py-3.5">
													<span className="text-sm text-gray-700">{fmtDate(s.admittedAt)}</span>
												</td>

												<td className="px-4 py-3.5">
													{level ? (
														<span className="text-sm text-gray-700">{level}</span>
													) : (
														<span className="text-xs text-gray-400">—</span>
													)}
												</td>

												<td className="px-4 py-3.5">
													<span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${s.courseType === "GROUP" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
														{s.courseType === "GROUP" ? "Group" : "Individual"}
													</span>
												</td>

												<td className="px-4 py-3.5">
													{hasPhoto ? (
														<span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
															<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
															Ready
														</span>
													) : (
														<span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
															<span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
															No photo
														</span>
													)}
												</td>

												<td className="px-4 py-3.5 pr-5 text-right">
													<button
														type="button"
														onClick={() => handleDownload(s)}
														disabled={!hasPhoto || downloadingId !== null}
														title={!hasPhoto ? "Student has no profile picture" : "Download welcome poster"}
														className="inline-flex items-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-100 disabled:opacity-40 disabled:cursor-not-allowed"
													>
														{isDownloading ? (
															<>
																<span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
																Generating…
															</>
														) : (
															<>
																<HiArrowDownTray className="h-3.5 w-3.5" />
																Download
															</>
														)}
													</button>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						<div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
							<p className="text-xs text-gray-400">
								{totalCount > 0 ? `${(page - 1) * limit + 1}–${Math.min(page * limit, totalCount)} of ${totalCount}` : "0 results"}
							</p>
							<div className="flex items-center gap-2">
								<select
									value={String(limit)}
									onChange={(e) => setQueryParam("limit", e.target.value)}
									className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
								>
									<option value="25">25</option>
									<option value="50">50</option>
									<option value="100">100</option>
									<option value="200">200</option>
								</select>
								<button
									onClick={() => setQueryParam("page", String(Math.max(1, page - 1)))}
									disabled={page <= 1}
									className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium disabled:opacity-40 hover:bg-gray-50"
								>
									Prev
								</button>
								<button
									onClick={() => setQueryParam("page", String(page + 1))}
									disabled={page >= totalPages}
									className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium disabled:opacity-40 hover:bg-gray-50"
								>
									Next
								</button>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
};
