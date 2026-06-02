import { type ChangeEvent, useEffect, useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import { MobileImageCropModal } from "@/components/MobileImageCropModal";
import { cropImageToBlob } from "@/lib/image-crop";

type StudentProfileStatus = {
  id: string;
  zid: string;
  name: string | null;
  residingCountry?: string | null;
  profilePic: string | null;
  submitted: boolean;
  admittedAt?: string | null;
  classStartConfirmedAt?: string | null;
};

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, "");
  }
  return "http://localhost:3001";
};

export function PublicStudentFormPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<StudentProfileStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedClassDate, setSelectedClassDate] = useState<string | null>(null);
  const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null);
  const [croppedImagePreview, setCroppedImagePreview] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchStudentStatus = async () => {
      if (!studentId) {
        setError("Invalid student link");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await fetch(`${getApiBaseUrl()}/form/student/${studentId}/profile-status`);
        const json = await res.json();

        if (!res.ok || !json?.ok) {
          setError(json?.error ?? "Unable to load student profile status");
          setStudent(null);
          return;
        }

        setStudent(json.student as StudentProfileStatus);
        setError(null);
      } catch (e) {
        console.error(e);
        setError("Unable to load student profile status");
      } finally {
        setLoading(false);
      }
    };

    void fetchStudentStatus();
  }, [studentId]);

  const submitForm = async () => {
    if (!studentId) return;
    try {
      if (!croppedImageBlob) {
        toast.error("Please select an image");
        return;
      }
      if (!selectedClassDate) {
        toast.error("Please select a class start date");
        return;
      }

      setSubmitting(true);

      // Upload image
      const croppedFile = new File([croppedImageBlob], "profile.jpg", {
        type: "image/jpeg",
      });
      const formData = new FormData();
      formData.append("profilePic", croppedFile);

      const uploadRes = await fetch(`${getApiBaseUrl()}/form/student/${studentId}/profile-upload`, {
        method: "POST",
        body: formData,
      });
      const uploadJson = await uploadRes.json();

      if (!uploadRes.ok || !uploadJson?.ok) {
        throw new Error(uploadJson?.error ?? "Failed to upload profile image");
      }

      // Save class start date
      const dateRes = await fetch(`${getApiBaseUrl()}/form/student/${studentId}/confirm-class-start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedClassDate }),
      });
      const dateJson = await dateRes.json();
      if (!dateRes.ok || !dateJson?.ok) {
        throw new Error(dateJson?.error ?? "Failed to save class start date");
      }

      // Update student state
      setStudent((prev) =>
        prev
          ? {
            ...prev,
            profilePic: uploadJson.profilePic as string,
            submitted: true,
            classStartConfirmedAt: dateJson.classStartConfirmedAt ?? new Date().toISOString(),
          }
          : prev,
      );
      toast.success("Profile submitted successfully!");
      setCroppedImageBlob(null);
      setCroppedImagePreview(null);
      setSelectedClassDate(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to submit form";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const openCropForFile = (file: File) => {
    if (selectedImageUrl) {
      URL.revokeObjectURL(selectedImageUrl);
    }

    setSelectedImageFile(file);
    setSelectedImageUrl(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropModalOpen(true);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    openCropForFile(file);
  };

  const closeCropModal = () => {
    setCropModalOpen(false);
    setSelectedImageFile(null);
    if (selectedImageUrl) {
      URL.revokeObjectURL(selectedImageUrl);
      setSelectedImageUrl(null);
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const confirmCrop = async () => {
    if (!selectedImageUrl || !selectedImageFile || !studentId || !croppedAreaPixels) return;

    try {
      const croppedBlob = await cropImageToBlob(selectedImageUrl, croppedAreaPixels);
      setCroppedImageBlob(croppedBlob);
      setCroppedImagePreview(URL.createObjectURL(croppedBlob));
      closeCropModal();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast.success("Image ready for submission");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to crop image";
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(32,111,89,0.12),transparent_34%),linear-gradient(135deg,#f8fbfa,#eef5f9)] px-4">
        <div className="inline-flex flex-col items-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 bg-white/90 shadow-lg">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
          <p className="mt-4 text-sm font-medium tracking-wide text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(32,111,89,0.12),transparent_34%),linear-gradient(135deg,#f8fbfa,#eef5f9)] px-4">
        <div className="max-w-md rounded-4xl border border-white/70 bg-white/95 p-8 text-center shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Student Not Found</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{error ?? "Unable to load student profile. Please check your link and try again."}</p>
        </div>
      </div>
    );
  }

  const downloadCombinedImage = async () => {
    if (!student.profilePic) {
      toast.error("Profile picture not available");
      return;
    }

    try {
      setSubmitting(true);

      const loadImage = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();

          image.onload = () => resolve(image);
          image.onerror = () =>
            reject(new Error(`Failed to load image: ${src}`));

          image.src = src;
        });

      const profileImageRes = await fetch(
        `${getApiBaseUrl()}/form/student/${studentId}/profile-image`,
      );

      if (!profileImageRes.ok) {
        throw new Error("Failed to load profile image");
      }

      const profileBlob = await profileImageRes.blob();
      const profileImageUrl = URL.createObjectURL(profileBlob);

      const canvas = document.createElement("canvas");

      // 4:5 aspect ratio
      canvas.width = 1080;
      canvas.height = 1350;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      try {
        const [welcomeImage, profileImage] = await Promise.all([
          loadImage("/welcome/1.jpg"),
          loadImage(profileImageUrl),
        ]);

        // Background image
        ctx.drawImage(welcomeImage, 0, 0, canvas.width, canvas.height);

        /**
         * PROFILE IMAGE POSITION
         */
        const imageX = 206;
        const imageY = 538;

        /**
         * PROFILE IMAGE SIZE
         */
        const imageSize = 254;

        /**
         * SMALL BORDER RADIUS
         */
        const borderRadius = 60;

        // Object-cover crop
        const imgW = profileImage.naturalWidth || profileImage.width;
        const imgH = profileImage.naturalHeight || profileImage.height;

        let srcX = 0;
        let srcY = 0;
        let srcSize = Math.min(imgW, imgH);

        if (imgW > imgH) {
          srcX = Math.round((imgW - imgH) / 2);
          srcSize = imgH;
        } else if (imgH > imgW) {
          srcY = Math.round((imgH - imgW) / 2);
          srcSize = imgW;
        }

        /**
         * Rounded rectangle helper
         */
        const roundRect = (
          ctx: CanvasRenderingContext2D,
          x: number,
          y: number,
          width: number,
          height: number,
          radius: number,
        ) => {
          ctx.beginPath();

          ctx.moveTo(x + radius, y);

          ctx.lineTo(x + width - radius, y);
          ctx.quadraticCurveTo(x + width, y, x + width, y + radius);

          ctx.lineTo(x + width, y + height - radius);
          ctx.quadraticCurveTo(
            x + width,
            y + height,
            x + width - radius,
            y + height,
          );

          ctx.lineTo(x + radius, y + height);
          ctx.quadraticCurveTo(x, y + height, x, y + height - radius);

          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);

          ctx.closePath();
        };

        // Clip rounded square
        ctx.save();

        roundRect(
          ctx,
          imageX,
          imageY,
          imageSize,
          imageSize,
          borderRadius,
        );

        ctx.clip();

        // Draw profile image
        ctx.drawImage(
          profileImage,
          srcX,
          srcY,
          srcSize,
          srcSize,
          imageX,
          imageY,
          imageSize,
          imageSize,
        );

        ctx.restore();
        // Draw student name and county/country below the profile image
        try {
          const name = student.name ?? "";
          if (name) {
            const centerX = imageX + imageSize / 2;
            const padding = Math.round(canvas.height * 0.02); // spacing below image
            const textY = imageY + imageSize + padding;

            const fontSize = Math.round(canvas.width * 0.02);
            ctx.font = `500 ${fontSize}px Inter, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";

            ctx.fillStyle = "#000";
            ctx.fillText(name, centerX, textY);

            // Draw residingCountry (fallback to country or county) beneath the name
            const county = (student as any).residingCountry ?? (student as any).country ?? (student as any).county ?? "";
            if (county) {
              const smallFont = Math.round(fontSize * 0.65);
              const countyY = textY + fontSize + Math.round(canvas.height * 0.005);

              ctx.font = `300 ${smallFont}px Inter, sans-serif`;
              ctx.lineWidth = Math.max(1, Math.round(smallFont * 0.12));

              ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
              ctx.fillText(county, centerX, countyY);
            }
          }
        } catch (err) {
          // ignore drawing errors so download still works
        }
      } finally {
        URL.revokeObjectURL(profileImageUrl);
      }

      // Convert canvas to image
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), "image/jpeg", 0.95);
      });

      if (!blob) {
        throw new Error("Failed to create image");
      }

      // Download image
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `zidnee-welcome-poster-${student.zid}.jpg`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      toast.success("Welcome poster downloaded successfully!");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to download image";

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (student.submitted && student.profilePic) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(32,111,89,0.16),transparent_34%),linear-gradient(135deg,#f7fbfa,#eef5f9)] px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center">
          <div className="w-full overflow-hidden rounded-4xl border border-white/80 bg-white/92 shadow-[0_24px_90px_rgba(15,23,42,0.14)] backdrop-blur">
            <div className="h-2 bg-[linear-gradient(90deg,#206f59,#7dc7a7,#206f59)]" />

            <div className="px-6 py-8 sm:px-10 sm:py-10">
              <div className="flex flex-col items-center text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand shadow-[0_10px_30px_rgba(32,111,89,0.15)]">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-brand">
                  Submitted successfully
                </div>

                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  Your profile is ready
                </h1>
                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
                  We have received your details and profile picture. You can review your details below and download the final image anytime.
                </p>

                <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4 text-left">
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Name</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">{student.name ?? "Student"}</div>
                  </div>
                  <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4 text-left">
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">ZID</div>
                    <div className="mt-2 text-lg font-semibold text-brand">{student.zid}</div>
                  </div>
                  <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4 text-left">
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Residing Country</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">
                      {student.residingCountry ?? "Not provided"}
                    </div>
                  </div>
                  {student.admittedAt && (
                    <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4 text-left">
                      <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Class Starts On</div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">
                        {student.classStartConfirmedAt
                          ? new Date(student.classStartConfirmedAt).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "Not yet confirmed"}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => void downloadCombinedImage()}
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:bg-[#1a5d4a] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Welcome Poster
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(32,111,89,0.12),transparent_32%),linear-gradient(135deg,#f8fbfa,#eef5f9)] px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-center">
            <img src="/zidnee-typography.png" alt="Zidnee" className="h-12 w-auto sm:h-16" />
          </div>

          {/* Main Card */}
          <div className="rounded-4xl border border-white/70 bg-white/95 shadow-[0_18px_60px_rgba(15,23,42,0.14)] backdrop-blur">
            {/* Card Header */}
            <div className="border-b border-slate-100 px-8 py-6">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Complete Your Profile</h1>
              <p className="mt-1 text-sm text-slate-600">Upload your profile picture and confirm your class start date</p>
            </div>

            {/* Card Content */}
            <div className="space-y-8 px-8 py-8">
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Image Preview or Upload */}
              {croppedImagePreview ? (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-900">Profile Picture</h2>
                  <div className="rounded-3xl border border-slate-200 overflow-hidden">
                    <img src={croppedImagePreview} alt="Profile preview" className="w-full h-auto" />
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Change Image
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-900">Profile Picture</h2>
                  <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center transition hover:border-brand hover:bg-brand/5">
                    <input
                      ref={fileInputRef}
                      id="profilePic"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={submitting}
                      className="hidden"
                    />
                    <label htmlFor="profilePic" className="flex cursor-pointer flex-col items-center gap-2">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
                        <svg className="h-6 w-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-brand">Click to upload</div>
                        <div className="text-xs text-slate-600">or drag and drop</div>
                      </div>
                      <div className="text-xs text-slate-500">PNG, JPG, JPEG up to 10MB</div>
                    </label>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3 text-xs text-slate-600">
                    💡 <strong>Tip:</strong> Your photo will be cropped to a square. Make sure your face is centered.
                  </div>
                </div>
              )}

              {/* Class Start Section */}
              {student.admittedAt && (
                <div className="space-y-4 border-t border-slate-100 pt-8">
                  <h2 className="text-lg font-semibold text-slate-900">When does your class start?</h2>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <input
                      type="date"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-400 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10"
                      value={selectedClassDate ?? ""}
                      onChange={(e) => setSelectedClassDate(e.target.value)}
                      min={(() => {
                        const d = new Date();
                        const pad = (n: number) => n.toString().padStart(2, "0");
                        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                      })()}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={() => void submitForm()}
                disabled={!croppedImagePreview || !selectedClassDate || submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition hover:bg-[#1a5d4a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Submit
                  </>
                )}
              </button>

              {/* Student Info */}
              <div className="border-t border-slate-100 pt-4 text-center text-sm text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/50 px-3 py-1">
                  <span className="font-medium">ZID:</span>
                  <span className="font-semibold text-brand">{student.zid}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-6 text-center text-xs text-slate-600">
            <p>All information is secure and encrypted</p>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {cropModalOpen && selectedImageUrl ? (
        <MobileImageCropModal
          open={cropModalOpen}
          imageSrc={selectedImageUrl}
          title="Adjust your profile picture"
          description="Pinch to zoom and drag the image so your face fits inside the square."
          crop={crop}
          zoom={zoom}
          confirmLabel={submitting ? "Processing..." : "Crop & Save"}
          confirmDisabled={submitting || !croppedAreaPixels}
          onClose={closeCropModal}
          onConfirm={() => void confirmCrop()}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
        />
      ) : null}
    </>
  );
}

export default PublicStudentFormPage;
