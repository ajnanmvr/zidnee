import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  HiAcademicCap,
  HiArrowLeft,
  HiCalendarDays,
  HiCamera,
  HiChatBubbleLeftRight,
  HiCurrencyRupee,
  HiEnvelope,
  HiGlobeAlt,
  HiIdentification,
  HiLanguage,
  HiPhone,
  HiUserCircle,
  HiUserGroup,
} from "react-icons/hi2";
import { useStudentsQuery } from "./students.queries";
import { useUpdateStudentMutation } from "./use-update-student-mutation";
import { useSession } from "@/lib/session";
import { useUsersQuery } from "@/features/users/users.queries";
import { useBatchesQuery } from "@/features/batches/batches.queries";
import { API_BASE_URL } from "@/api/client";
import { ApiError } from "@/api/request";
import { getStudentStatusLabel } from "./student-table";

const AVATAR_GRADIENTS = [
  "from-teal-500 to-emerald-600",
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-500",
];
function avatarGradient(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length] ?? AVATAR_GRADIENTS[0];
}

const STATUS_BADGE: Record<string, string> = {
  STUDENT: "bg-emerald-100 text-emerald-700",
  BREAK: "bg-amber-100 text-amber-700",
  DROPPED: "bg-gray-100 text-gray-600",
};

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-50";

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="mb-1.5 block text-xs font-semibold text-gray-500">{children}</span>
);

const SectionCard = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
        {icon}
      </span>
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h3>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">{children}</div>
  </div>
);

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LANGUAGES = ["Malayalam Only", "English Only", "Malayalam - English Mixed"];

export const EditStudentPage = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { token } = useSession();
  const studentsQuery = useStudentsQuery(token);
  const updateStudentMutation = useUpdateStudentMutation();

  const student = studentsQuery.data?.students.find((s) => s.id === studentId);
  const usersQuery = useUsersQuery(token);
  const batchesQuery = useBatchesQuery(token);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState<Record<string, any>>({});

  const buildUpdatePayload = () => {
    const nextPayload: Record<string, unknown> = {
      name: form.name?.trim() ?? undefined,
      phone: form.phone?.trim() ?? undefined,
      email: form.email?.trim() ?? undefined,
      courseType: form.courseType || undefined,
      level: form.level?.trim() ?? undefined,
      dateOfBirth: form.dateOfBirth ? form.dateOfBirth : undefined,
      residingCountry: form.residingCountry?.trim() ?? undefined,
      gender: form.gender || undefined,
      primaryWhatsappNumber: form.primaryWhatsappNumber?.trim() ?? undefined,
      alternateWhatsappNumber: form.alternateWhatsappNumber?.trim() ?? undefined,
      studentInfo: form.studentInfo?.trim() ?? undefined,
      preferredLanguage: form.preferredLanguage || undefined,
      preferredSchedule: form.preferredSchedule?.trim() ?? undefined,
      preferredDays: Array.isArray(form.preferredDays) ? form.preferredDays : undefined,
      price: form.price === "" || form.price == null ? undefined : form.price,
      hearAboutUs: form.hearAboutUs?.trim() ?? undefined,
      mentorId: form.mentorId || undefined,
      batchId: form.batchId === "" ? null : form.batchId ?? null,
      status: form.status || undefined,
      profilePic: form.profilePic === "" ? null : form.profilePic ?? undefined,
      timeslot: form.timeslot
        ? {
            classesPerWeek: form.timeslot.classesPerWeek,
            durationMinutes: form.timeslot.durationMinutes,
          }
        : undefined,
    };

    return Object.fromEntries(
      Object.entries(nextPayload).filter(([, value]) => value !== undefined),
    );
  };

  useEffect(() => {
    if (!student) return;
    setForm({
      name: student.name ?? "",
      phone: student.phone ?? "",
      email: student.email ?? "",
      courseType: student.courseType ?? "",
      level: student.level ?? "",
      dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().slice(0, 10) : "",
      residingCountry: student.residingCountry ?? "",
      gender: student.gender ?? "",
      primaryWhatsappNumber: student.primaryWhatsappNumber ?? "",
      alternateWhatsappNumber: student.alternateWhatsappNumber ?? "",
      studentInfo: student.studentInfo ?? "",
      preferredLanguage: student.preferredLanguage ?? "",
      preferredSchedule: student.preferredSchedule ?? "",
      price: student.price ?? "",
      hearAboutUs: student.hearAboutUs ?? "",
      mentorId: student.mentorId ?? "",
      batchId: student.batchId ?? null,
      status: student.status ?? "STUDENT",
      profilePic: student.profilePic ?? "",
      timeslot: student.timeslot ?? undefined,
      preferredDays: student.preferredDays ?? [],
    });
  }, [student]);

  if (!studentId) {
    return <div className="p-6">Student id missing</div>;
  }

  if (!student) {
    return <div className="p-6">Student not found</div>;
  }

  const initials = (form.name || student.name || student.zid || "?")
    .split(" ")
    .map((p: string) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const gradientCls = avatarGradient(student.id);
  const statusCls = STATUS_BADGE[form.status] ?? "bg-gray-100 text-gray-600";

  const handleProfilePicUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE_URL}/students/${studentId}/profile-pic`, {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new ApiError(res.status, json);
      toast.success("Profile picture updated");
    } catch {
      toast.error("Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateStudentMutation.mutateAsync({
        studentId,
        payload: buildUpdatePayload(),
      });
      toast.success("Student updated");
      navigate(`/students/${studentId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update student");
    }
  };

  return (
    <div className="space-y-4 pb-10">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
        >
          <HiArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={updateStudentMutation.isPending}
            className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
          >
            {updateStudentMutation.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* Hero card */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className={`h-20 bg-linear-to-r ${gradientCls}`} />
        <div className="px-6 pb-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="group relative -mt-10 shrink-0">
                {form.profilePic ? (
                  <img
                    src={form.profilePic}
                    alt={student.name ?? student.zid}
                    className="h-20 w-20 rounded-2xl object-cover shadow-lg ring-4 ring-white"
                  />
                ) : (
                  <div
                    className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br ${gradientCls} text-2xl font-bold text-white shadow-lg ring-4 ring-white`}
                  >
                    {initials || <HiUserCircle className="h-10 w-10" />}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title="Change profile picture"
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-900 text-white shadow-sm transition hover:bg-gray-700 disabled:opacity-60"
                >
                  <HiCamera className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await handleProfilePicUpload(file);
                  }}
                />
              </div>
              <div className="pb-1">
                <h1 className="text-xl font-bold text-gray-900">{student.name || student.zid}</h1>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                  <HiIdentification className="h-4 w-4 text-gray-400" />
                  {student.zid.toUpperCase()}
                </p>
              </div>
            </div>

            <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ${statusCls}`}>
              {getStudentStatusLabel(form.status || student.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Form sections */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard icon={<HiUserCircle className="h-4 w-4" />} title="Personal information">
          <label className="block sm:col-span-2">
            <FieldLabel>Name</FieldLabel>
            <input
              type="text"
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
            />
          </label>

          <label className="block">
            <FieldLabel>Date of birth</FieldLabel>
            <div className="relative">
              <HiCalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={form.dateOfBirth ?? ""}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                className={`${inputCls} pl-9`}
              />
            </div>
          </label>

          <label className="block">
            <FieldLabel>Gender</FieldLabel>
            <select
              value={form.gender ?? ""}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className={inputCls}
            >
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>

          <label className="block sm:col-span-2">
            <FieldLabel>Residing country</FieldLabel>
            <div className="relative">
              <HiGlobeAlt className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={form.residingCountry ?? ""}
                onChange={(e) => setForm({ ...form, residingCountry: e.target.value })}
                placeholder="e.g. India"
                className={`${inputCls} pl-9`}
              />
            </div>
          </label>
        </SectionCard>

        <SectionCard icon={<HiPhone className="h-4 w-4" />} title="Contact details">
          <label className="block">
            <FieldLabel>Phone</FieldLabel>
            <div className="relative">
              <HiPhone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={`${inputCls} pl-9`}
              />
            </div>
          </label>

          <label className="block">
            <FieldLabel>Email</FieldLabel>
            <div className="relative">
              <HiEnvelope className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`${inputCls} pl-9`}
              />
            </div>
          </label>

          <label className="block">
            <FieldLabel>Primary WhatsApp</FieldLabel>
            <div className="relative">
              <HiChatBubbleLeftRight className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={form.primaryWhatsappNumber ?? ""}
                onChange={(e) => setForm({ ...form, primaryWhatsappNumber: e.target.value })}
                placeholder="+91…"
                className={`${inputCls} pl-9`}
              />
            </div>
          </label>

          <label className="block">
            <FieldLabel>Alternate WhatsApp</FieldLabel>
            <div className="relative">
              <HiChatBubbleLeftRight className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={form.alternateWhatsappNumber ?? ""}
                onChange={(e) => setForm({ ...form, alternateWhatsappNumber: e.target.value })}
                placeholder="+91… (optional)"
                className={`${inputCls} pl-9`}
              />
            </div>
          </label>
        </SectionCard>

        <SectionCard icon={<HiAcademicCap className="h-4 w-4" />} title="Course & mentorship">
          <label className="block">
            <FieldLabel>Course type</FieldLabel>
            <select
              value={form.courseType ?? ""}
              onChange={(e) => setForm({ ...form, courseType: e.target.value })}
              className={inputCls}
            >
              <option value="">Not set</option>
              <option value="GROUP">Group</option>
              <option value="INDIVIDUAL">Individual</option>
            </select>
          </label>

          <label className="block">
            <FieldLabel>Level</FieldLabel>
            <input
              type="text"
              value={form.level ?? ""}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              className={inputCls}
            />
          </label>

          <label className="block">
            <FieldLabel>Mentor</FieldLabel>
            <div className="relative">
              <HiUserGroup className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={form.mentorId ?? ""}
                onChange={(e) => setForm({ ...form, mentorId: e.target.value })}
                className={`${inputCls} pl-9`}
              >
                <option value="">Unassigned</option>
                {usersQuery.data?.users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.username}</option>
                ))}
              </select>
            </div>
          </label>

          <label className="block">
            <FieldLabel>Batch / group</FieldLabel>
            <select
              value={form.batchId ?? ""}
              onChange={(e) => setForm({ ...form, batchId: e.target.value || null })}
              className={inputCls}
            >
              <option value="">Unassigned</option>
              {batchesQuery.data?.batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <FieldLabel>Status</FieldLabel>
            <select
              value={form.status ?? "STUDENT"}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className={inputCls}
            >
              <option value="STUDENT">Active</option>
              <option value="BREAK">On break</option>
              <option value="DROPPED">Dropped</option>
            </select>
          </label>
        </SectionCard>

        <SectionCard icon={<HiCalendarDays className="h-4 w-4" />} title="Schedule & preferences">
          <label className="block">
            <FieldLabel>Preferred language</FieldLabel>
            <div className="relative">
              <HiLanguage className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={form.preferredLanguage ?? ""}
                onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}
                className={`${inputCls} pl-9`}
              >
                <option value="">Not specified</option>
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </label>

          <label className="block">
            <FieldLabel>Preferred schedule</FieldLabel>
            <input
              type="text"
              value={form.preferredSchedule ?? ""}
              onChange={(e) => setForm({ ...form, preferredSchedule: e.target.value })}
              placeholder="e.g. Weekday evenings"
              className={inputCls}
            />
          </label>

          <label className="block">
            <FieldLabel>Classes / week</FieldLabel>
            <input
              type="number"
              min={0}
              value={(form.timeslot?.classesPerWeek ?? "") as any}
              onChange={(e) => setForm({ ...form, timeslot: { ...(form.timeslot ?? {}), classesPerWeek: Number(e.target.value) } })}
              className={inputCls}
            />
          </label>

          <label className="block">
            <FieldLabel>Class duration (minutes)</FieldLabel>
            <input
              type="number"
              min={0}
              value={(form.timeslot?.durationMinutes ?? "") as any}
              onChange={(e) => setForm({ ...form, timeslot: { ...(form.timeslot ?? {}), durationMinutes: Number(e.target.value) } })}
              className={inputCls}
            />
          </label>

          <div className="sm:col-span-2">
            <FieldLabel>Preferred days</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const checked = (form.preferredDays ?? []).includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      const days = new Set(form.preferredDays ?? []);
                      if (checked) days.delete(d); else days.add(d);
                      setForm({ ...form, preferredDays: Array.from(days) });
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      checked
                        ? "bg-teal-600 text-white shadow-sm"
                        : "border border-gray-200 bg-white text-gray-500 hover:border-teal-300 hover:text-teal-700"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={<HiCurrencyRupee className="h-4 w-4" />} title="Billing & source">
          <label className="block">
            <FieldLabel>Price</FieldLabel>
            <input
              type="number"
              min={0}
              value={form.price ?? ""}
              onChange={(e) => setForm({ ...form, price: e.target.value ? Number(e.target.value) : undefined })}
              className={inputCls}
            />
          </label>

          <label className="block">
            <FieldLabel>How did they hear about us?</FieldLabel>
            <input
              type="text"
              value={form.hearAboutUs ?? ""}
              onChange={(e) => setForm({ ...form, hearAboutUs: e.target.value })}
              className={inputCls}
            />
          </label>
        </SectionCard>

        <SectionCard icon={<HiChatBubbleLeftRight className="h-4 w-4" />} title="Notes">
          <label className="block sm:col-span-2">
            <FieldLabel>Internal notes</FieldLabel>
            <textarea
              rows={5}
              value={form.studentInfo ?? ""}
              onChange={(e) => setForm({ ...form, studentInfo: e.target.value })}
              placeholder="Anything worth remembering about this student…"
              className={`${inputCls} resize-none`}
            />
          </label>
        </SectionCard>
      </div>
    </div>
  );
};

export default EditStudentPage;
