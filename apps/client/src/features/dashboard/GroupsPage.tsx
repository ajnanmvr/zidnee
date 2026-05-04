import { useState } from "react";
import { HiPlus } from "react-icons/hi2";
import toast from "react-hot-toast";
import { Panel, Modal, Field } from "@/components/dashboard-ui";
import { useSession } from "@/lib/session";
import { useBatchesQuery } from "@/features/batches/batches.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { Controller, useForm } from "react-hook-form";
import { useCreateBatchMutation } from "@/features/batches/use-create-batch-mutation";
import type { CreateBatchPayload } from "@repo/schema";

export const GroupsPage = () => {
  const { token } = useSession();
  const batchesQuery = useBatchesQuery(token);
  const usersQuery = useUsersQuery(token);
  const createBatch = useCreateBatchMutation();
  const groups = (batchesQuery.data?.batches ?? []).filter((b) => b.type === "GROUP");
  const mentors = (usersQuery.data?.users ?? []).filter((u) => u.roles.some((r) => r.type === "mentor"));
  const [open, setOpen] = useState(false);

  const { control, handleSubmit, reset } = useForm<CreateBatchPayload>({
    defaultValues: { name: "", type: "GROUP", level: "", mentorId: "", description: undefined },
  });

  const onSubmit = async (form: CreateBatchPayload) => {
    try {
      await createBatch.mutateAsync(form as any);
      toast.success("Group created");
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create group");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Groups</h2>
        <button className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => setOpen(true)}>
          <HiPlus className="h-4 w-4" /> Add group
        </button>
      </div>

      <Panel title="Groups">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Level</th>
                <th className="px-4 py-3 text-left">Mentor</th>
                <th className="px-4 py-3 text-left">Description</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {groups.map((g) => (
                <tr key={g.id} className="border-t">
                  <td className="px-4 py-3">{g.name}</td>
                  <td className="px-4 py-3">{g.level}</td>
                  <td className="px-4 py-3">{mentors.find((m) => m.id === g.mentorId)?.name ?? g.mentorId}</td>
                  <td className="px-4 py-3">{g.description ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Modal open={open} title="Create group" onClose={() => setOpen(false)}>
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <Controller name="name" control={control} render={({ field }) => <Field label="Group name" value={field.value} onChange={field.onChange} />} />
          <div className="grid gap-4 md:grid-cols-2">
            <Controller name="level" control={control} render={({ field }) => <Field label="Level" value={field.value} onChange={field.onChange} />} />
            <Controller name="mentorId" control={control} render={({ field }) => (
              <label className="grid gap-2 text-sm font-medium text-gray-600">
                <span>Mentor</span>
                <select value={field.value} onChange={(e) => field.onChange(e.target.value)} className="rounded-2xl border border-gray-300 px-4 py-3 text-gray-900">
                  <option value="">Select mentor</option>
                  {mentors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </label>
            )} />
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Create</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default GroupsPage;
