import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Panel } from "@/components/dashboard-ui";
import { useStudentsQuery } from "./students.queries";
import { useUpdateStudentMutation } from "./use-update-student-mutation";
import { useSession } from "@/lib/session";
import { useUsersQuery } from "@/features/users/users.queries";
import { useBatchesQuery } from "@/features/batches/batches.queries";
import { API_BASE_URL } from "@/api/client";
import { ApiError } from "@/api/request";

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

  const [form, setForm] = useState<Record<string, any>>({});

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Edit student</h2>
        <div>
          <button
            onClick={() => navigate(-1)}
            className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              try {
                await updateStudentMutation.mutateAsync({ studentId, payload: form });
                toast.success("Student updated");
                navigate(`/students/${studentId}`);
              } catch (e) {
                toast.error("Failed to update student");
              }
            }}
            className="ml-3 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Save
          </button>
        </div>
      </div>

      <Panel title="Student details">
        <div className="grid grid-cols-1 gap-4">
          <label className="grid gap-2 text-sm font-medium text-gray-600">
            <span>Name</span>
            <input
              type="text"
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-2xl border border-gray-300 px-4 py-3"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-medium text-gray-600">
              <span>Phone</span>
              <input
                type="tel"
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="rounded-2xl border border-gray-300 px-4 py-3"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-gray-600">
              <span>Email</span>
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-2xl border border-gray-300 px-4 py-3"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-gray-600">
            <span>Level</span>
            <input
              type="text"
              value={form.level ?? ""}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              className="rounded-2xl border border-gray-300 px-4 py-3"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-medium text-gray-600">
              <span>Mentor</span>
              <select
                value={form.mentorId ?? ""}
                onChange={(e) => setForm({ ...form, mentorId: e.target.value })}
                className="rounded-2xl border border-gray-300 px-4 py-3"
              >
                <option value="">Unassigned</option>
                {usersQuery.data?.users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.username}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-gray-600">
              <span>Batch</span>
              <select
                value={form.batchId ?? ""}
                onChange={(e) => setForm({ ...form, batchId: e.target.value || null })}
                className="rounded-2xl border border-gray-300 px-4 py-3"
              >
                <option value="">Unassigned</option>
                {batchesQuery.data?.batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-gray-600">
            <span>Notes</span>
            <textarea
              value={form.studentInfo ?? ""}
              onChange={(e) => setForm({ ...form, studentInfo: e.target.value })}
              className="rounded-2xl border border-gray-300 px-4 py-3"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-medium text-gray-600">
              <span>Classes / week</span>
              <input
                type="number"
                min={0}
                value={(form.timeslot?.classesPerWeek ?? "") as any}
                onChange={(e) => setForm({ ...form, timeslot: { ...(form.timeslot ?? {}), classesPerWeek: Number(e.target.value) } })}
                className="rounded-2xl border border-gray-300 px-4 py-3"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-gray-600">
              <span>Class duration (minutes)</span>
              <input
                type="number"
                min={0}
                value={(form.timeslot?.durationMinutes ?? "") as any}
                onChange={(e) => setForm({ ...form, timeslot: { ...(form.timeslot ?? {}), durationMinutes: Number(e.target.value) } })}
                className="rounded-2xl border border-gray-300 px-4 py-3"
              />
            </label>
          </div>

          <div>
            <span className="text-sm font-medium text-gray-700">Preferred days</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
                <label key={d} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(form.preferredDays ?? []).includes(d)}
                    onChange={(e) => {
                      const days = new Set(form.preferredDays ?? []);
                      if (e.target.checked) days.add(d); else days.delete(d);
                      setForm({ ...form, preferredDays: Array.from(days) });
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">{d}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-medium text-gray-600">
              <span>Price</span>
              <input
                type="number"
                min={0}
                value={form.price ?? ""}
                onChange={(e) => setForm({ ...form, price: e.target.value ? Number(e.target.value) : undefined })}
                className="rounded-2xl border border-gray-300 px-4 py-3"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-gray-600">
              <span>Status</span>
              <select
                value={form.status ?? "STUDENT"}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="rounded-2xl border border-gray-300 px-4 py-3"
              >
                <option value="STUDENT">STUDENT</option>
                <option value="BREAK">BREAK</option>
                <option value="DROPPED">DROPPED</option>
              </select>
            </label>
          </div>

          <div>
            <span className="text-sm font-medium text-gray-700">Profile picture</span>
            <div className="mt-2 flex items-center gap-3">
              {student.profilePic ? (
                <img src={student.profilePic} alt="profile" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-gray-100" />
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
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
                  // refetch student list
                  // Note: useStudentsQuery will refresh on mutation via cache invalidation
                } catch (err) {
                  toast.error("Failed to upload profile picture");
                }
              }} />
              <button onClick={() => fileInputRef.current?.click()} className="rounded-2xl border px-3 py-1 text-sm font-semibold">Upload</button>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
};

export default EditStudentPage;
