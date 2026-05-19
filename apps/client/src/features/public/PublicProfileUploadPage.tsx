import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, "");
  }
  return "http://localhost:3001";
};

const PublicProfileUploadPage = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const validate = async () => {
      if (!leadId || !token) {
        setIsValid(false);
        setIsValidating(false);
        return;
      }
      try {
        const res = await fetch(`${getApiBaseUrl()}/form/${leadId}/validate?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          setIsValid(false);
          return;
        }
        const payload = await res.json();
        setIsValid(Boolean(payload?.isValid));
      } catch (e) {
        console.error(e);
        setIsValid(false);
      } finally {
        setIsValidating(false);
      }
    };
    void validate();
  }, [leadId, token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId || !token) {
      toast.error("Missing form link token");
      return;
    }
    if (!file) {
      toast.error("Please choose an image to upload");
      return;
    }
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("profilePic", file);
      form.append("token", token);
      const res = await fetch(`${getApiBaseUrl()}/form/${leadId}/profile-upload?token=${encodeURIComponent(token)}`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const msg = payload?.error || payload?.message || "Upload failed";
        toast.error(msg);
        return;
      }
      toast.success("Profile image uploaded successfully");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  if (isValidating) return <div className="p-8 text-center">Validating link...</div>;
  if (!isValid) return <div className="p-8 text-center">This upload link is invalid or expired.</div>;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Upload profile image</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <input type="file" accept="image/*" onChange={(ev) => setFile(ev.target.files?.[0] ?? null)} />
          </div>
          <div>
            <button type="submit" disabled={isUploading} className="rounded-xl bg-emerald-600 px-4 py-2 text-white">
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublicProfileUploadPage;
