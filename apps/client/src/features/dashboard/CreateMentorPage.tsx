import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Panel } from "@/components/dashboard-ui";
import { useCreateMentorMutation } from "@/features/users/use-create-mentor-mutation";
import { useHasPermission } from "@/lib/hooks/use-has-permission";
import { useSession } from "@/lib/session";
import { useUsersQuery } from "@/features/users/users.queries";
import { useMemo, useEffect } from "react";
import { useMeQuery } from "@/features/auth/auth.queries";

type FormValues = {
	name: string;
	gender: "male" | "female";
	counsellorId?: string;
};

export const CreateMentorPage = () => {
	const navigate = useNavigate();
	const createMentor = useCreateMentorMutation();
	const { token } = useSession();
	const canCreateUser = useHasPermission("USER_CREATE");
	const usersQuery = useUsersQuery(token);

	const counsellors = useMemo(() => {
		const all = usersQuery.data?.users ?? [];
		return all.filter((u: any) => u.roles.some((r: any) => r.type === "counsellor"));
	}, [usersQuery.data]);

	const { register, handleSubmit, setValue, getValues, watch } = useForm<FormValues>({
		defaultValues: { gender: "male", name: "" },
	});
	const selectedCounsellorId = watch("counsellorId");

	const meQuery = useMeQuery(token);

	useEffect(() => {
		const me = meQuery.data;
		if (!me) return;
		const isCounsellor = me.roles?.some((r: any) => r.type === "counsellor");
		if (isCounsellor && getValues("counsellorId") !== me.id) {
			setValue("counsellorId", me.id);
		}
	}, [getValues, meQuery.data, setValue]);

	const onSubmit = async (data: FormValues) => {
		try {
			await createMentor.mutateAsync({
				name: data.name,
				gender: data.gender,
			});
			toast.success("Mentor created");
			navigate("/mentors");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to create mentor");
		}
	};

	return (
		<div className="grid gap-6">
			{!canCreateUser ? (
				<Panel title="Access denied" description="You do not have permission to create mentors.">
					<p className="text-sm text-gray-600">Ask an administrator to grant USER_CREATE.</p>
				</Panel>
			) : null}
			{canCreateUser ? (
			<Panel title="Quick create mentor" description="Create a mentor quickly (username and password are auto-generated)">
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700">Full name</label>
						<input {...register("name", { required: true })} className="mt-1 w-full rounded-2xl border border-gray-300 px-4 py-2" />
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">Gender</label>
						<div className="mt-2 flex gap-4">
							<label className="inline-flex items-center gap-2">
								<input type="radio" value="male" {...register("gender") } defaultChecked />
								<span>Male</span>
							</label>
							<label className="inline-flex items-center gap-2">
								<input type="radio" value="female" {...register("gender") } />
								<span>Female</span>
							</label>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">Assign counsellor (optional)</label>
						<select {...register("counsellorId")} value={selectedCounsellorId ?? ""} className="mt-1 w-full rounded-2xl border border-gray-300 px-4 py-2">
							<option value="">— none —</option>
							{counsellors.map((c: any) => (
								<option key={c.id} value={c.id}>
									{c.name ?? c.username} {c.zids?.counsellor ? `· ${c.zids.counsellor}` : ""}
								</option>
							))}
						</select>
					</div>

					<div className="flex gap-3">
						<button type="button" onClick={() => navigate(-1)} className="flex-1 rounded-2xl border border-gray-300 px-4 py-2">Cancel</button>
						<button type="submit" className="flex-1 rounded-2xl bg-emerald-600 px-4 py-2 text-white">Create mentor</button>
					</div>
				</form>
			</Panel>
			) : null}
		</div>
	);
};
