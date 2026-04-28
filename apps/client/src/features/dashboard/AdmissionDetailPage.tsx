import { ConfirmAdmissionPayloadSchema } from "@repo/schema";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { HiAcademicCap } from "react-icons/hi2";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Panel, TextAreaField } from "@/components/dashboard-ui";
import { getLatestLeadDemo } from "@/features/dashboard/lead-demo-utils";
import { useConfirmAdmissionMutation } from "@/features/leads/use-lead-mutations";
import { useLeadDetailQuery } from "@/features/leads/leads.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import type { ConfirmAdmissionForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

const isCounsellorRole = (roleName: string) => roleName.toLowerCase() === "counsellor";
const formatUserName = (userName?: string | null) => userName?.trim() || "-";

export const AdmissionDetailPage = () => {
	const { leadId } = useParams<{ leadId: string }>();
	const { token } = useSession();
	const navigate = useNavigate();
	const leadQuery = useLeadDetailQuery(token, leadId ?? "");
	const usersQuery = useUsersQuery(token);
	const confirmAdmissionMutation = useConfirmAdmissionMutation();
	const { control, handleSubmit, setError, reset, setValue } = useForm<ConfirmAdmissionForm>({
		defaultValues: { counsellorId: undefined, note: "" },
	});
	const allUsers = usersQuery.data?.users ?? [];

	const counsellors = useMemo(() => {
		return allUsers.filter((user) => user.roles.some((role) => isCounsellorRole(role.name)));
	}, [allUsers]);

	const userNameById = useMemo(
		() =>
			new Map(
				allUsers.map((user) => [user.id, formatUserName(user.name ?? user.username)]),
			),
		[allUsers],
	);

	const lead = leadQuery.data?.lead;
	const latestDemo = lead ? getLatestLeadDemo(lead) : null;
	const defaultCounsellorId = latestDemo?.admissionCounsellorId
		?? (latestDemo?.mentorId
			? allUsers.find((user) => user.id === latestDemo.mentorId)?.counsellorId
			: undefined);

	useEffect(() => {
		if (defaultCounsellorId) {
			setValue("counsellorId", defaultCounsellorId);
		}
	}, [defaultCounsellorId, setValue]);

	const onSubmit = async (form: ConfirmAdmissionForm) => {
		if (!leadId) {
			return;
		}

		const validation = ConfirmAdmissionPayloadSchema.safeParse(form);
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.counsellorId?.[0]) {
				setError("counsellorId", { type: "manual", message: errors.counsellorId[0] });
			}
			if (errors.note?.[0]) {
				setError("note", { type: "manual", message: errors.note[0] });
			}
			return;
		}

		try {
			const response = await confirmAdmissionMutation.mutateAsync({
				leadId,
				payload: validation.data,
			});
			toast.success(`Admission confirmed. Student ID ${response.student.zid} created.`);
			reset({ counsellorId: undefined, note: "" });
			navigate("/students");
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to confirm admission");
				return;
			}

			toast.error(error instanceof Error ? error.message : "Unable to confirm admission");
		}
	};

	if (!leadId) {
		return <Panel title="Admission" description="Lead not found">Lead not found.</Panel>;
	}

	if (leadQuery.isLoading) {
		return <Panel title="Admission" description="Loading lead...">Loading lead...</Panel>;
	}

	if (!lead) {
		return <Panel title="Admission" description="Lead not found">Lead not found.</Panel>;
	}

	return (
		<Panel
			title={`Admission: ${lead.name ?? lead.phone}`}
			description="Confirm the admission process and create the student record"
		>
			<div className="mb-4 flex flex-wrap gap-2">
				<Link
					to="/admissions"
					className="rounded-2xl border border-border px-4 py-2 text-sm font-semibold text-ink"
				>
					Back to for admission
				</Link>
			</div>

			<div className="mb-6 grid gap-3 rounded-3xl border border-border bg-surface-muted p-4 text-sm text-ink-soft">
				<p>Lead: {lead.name ?? "Unnamed lead"} ({lead.phone})</p>
				<p>Demo mentor: {latestDemo?.mentorId ? userNameById.get(latestDemo.mentorId) ?? "-" : "-"}</p>
				<p>Selected counsellor will handle form sending, details collection, and final admission confirmation.</p>
				<p>Student ID will be generated automatically on confirmation in the format `ZID001`.</p>
			</div>

			<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
				<Controller
					name="counsellorId"
					control={control}
					render={({ field, fieldState }) => (
						<label className="grid gap-2 text-sm font-medium text-ink-soft">
							<span>Counsellor</span>
							<select
								className="rounded-2xl border border-border bg-surface px-4 py-3 text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
								value={field.value ?? defaultCounsellorId ?? ""}
								onChange={(event) => field.onChange(event.target.value || undefined)}
							>
								<option value="">Select counsellor</option>
								{counsellors.map((counsellor) => (
									<option key={counsellor.id} value={counsellor.id}>
										{formatUserName(counsellor.name ?? counsellor.username)}
									</option>
								))}
							</select>
							{fieldState.error?.message ? (
								<span className="text-xs text-danger">{fieldState.error.message}</span>
							) : null}
						</label>
					)}
				/>

				<Controller
					name="note"
					control={control}
					render={({ field, fieldState }) => (
						<TextAreaField
							label="Admission note"
							value={field.value ?? ""}
							onChange={field.onChange}
							placeholder="Form sent, details collected, admission confirmed"
							error={fieldState.error?.message}
						/>
					)}
				/>

				<div className="flex flex-wrap gap-2">
					<button
						type="submit"
						className="inline-flex items-center gap-2 rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-surface disabled:cursor-not-allowed disabled:opacity-70"
						disabled={confirmAdmissionMutation.isPending}
					>
						<HiAcademicCap className="h-4 w-4" aria-hidden="true" />
						{confirmAdmissionMutation.isPending ? "Confirming..." : "Confirm admission"}
					</button>
				</div>
			</form>
		</Panel>
	);
};
