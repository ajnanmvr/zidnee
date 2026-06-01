import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

export type MobileImageCropModalProps = {
	open: boolean;
	imageSrc: string;
	title: string;
	description: string;
	zoom: number;
	crop: { x: number; y: number };
	confirmLabel: string;
	confirmDisabled?: boolean;
	onClose: () => void;
	onConfirm: () => void;
	onCropChange: (crop: { x: number; y: number }) => void;
	onZoomChange: (zoom: number) => void;
	onCropComplete: (_croppedArea: Area, croppedAreaPixels: Area) => void;
};

export const MobileImageCropModal = ({
	open,
	imageSrc,
	title,
	description,
	zoom,
	crop,
	confirmLabel,
	confirmDisabled,
	onClose,
	onConfirm,
	onCropChange,
	onZoomChange,
	onCropComplete,
}: MobileImageCropModalProps) => {
	if (!open) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4 text-white backdrop-blur-sm">
			<button
				type="button"
				onClick={onClose}
				className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
				aria-label="Close crop modal"
			>
				<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>

			<div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 pt-10">
				<div className="w-full max-w-md text-center">
					<h2 className="text-lg font-semibold">{title}</h2>
					<p className="mt-1 text-sm text-white/70">{description}</p>
				</div>

				<div className="relative h-[58vh] w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
					<Cropper
						image={imageSrc}
						crop={crop}
						zoom={zoom}
						aspect={1}
						cropShape="rect"
						showGrid={false}
						restrictPosition={false}
						onCropChange={onCropChange}
						onCropComplete={onCropComplete}
						onZoomChange={onZoomChange}
						objectFit="contain"
					/>
				</div>

				<div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-4">
					<div className="mb-3 flex items-center justify-between gap-3 text-sm">
						<span className="font-medium text-white/90">Zoom</span>
						<span className="text-white/60">Use pinch or slider</span>
					</div>
					<input
						type="range"
						min={1}
						max={3}
						step={0.01}
						value={zoom}
						onChange={(event) => onZoomChange(Number(event.target.value))}
						className="w-full accent-teal-400"
					/>
				</div>
			</div>

			<div className="flex w-full gap-3 pt-4 sm:mx-auto sm:max-w-md">
				<button
					type="button"
					onClick={onClose}
					className="flex-1 rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={onConfirm}
					disabled={confirmDisabled}
					className="flex-1 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	);
};
