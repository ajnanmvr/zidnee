import type { Area } from "react-easy-crop";

const createImage = async (url: string): Promise<HTMLImageElement> => {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.addEventListener("load", () => resolve(image));
		image.addEventListener("error", () => reject(new Error("Failed to load image")));
		image.src = url;
	});
};

export const cropImageToBlob = async (
	imageSrc: string,
	pixelCrop: Area,
	mimeType = "image/jpeg",
	quality = 0.92,
): Promise<Blob> => {
	const image = await createImage(imageSrc);
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(pixelCrop.width));
	canvas.height = Math.max(1, Math.round(pixelCrop.height));

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get canvas context");
	}

	ctx.drawImage(
		image,
		pixelCrop.x,
		pixelCrop.y,
		pixelCrop.width,
		pixelCrop.height,
		0,
		0,
		canvas.width,
		canvas.height,
	);

	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
					return;
				}

				reject(new Error("Failed to create cropped image"));
			},
			mimeType,
			quality,
		);
	});
};
