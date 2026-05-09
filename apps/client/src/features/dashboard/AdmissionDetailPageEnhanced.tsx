import { ConfirmAdmissionPayloadSchema } from "@repo/schema";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { HiAcademicCap, HiPlus } from "react-icons/hi2";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Panel, TextAreaField, Modal } from "@/components/dashboard-ui";
import { getLatestLeadDemo } from "@/features/dashboard/lead-demo-utils";
import { useConfirmAdmissionMutation } from "@/features/leads/use-lead-mutations";
import { useLeadDetailQuery } from "@/features/leads/leads.queries";
import { useUsersQuery } from "@/features/users/users.queries";
import { useBatchesByMentorQuery } from "@/features/batches/batches.queries";
import { useCoursesQuery } from "@/features/courses/courses.queries";
import type { ConfirmAdmissionForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

const isMentorRole = (roleType: string) => roleType === "mentor";
const isCounsellorRole = (roleType: string) => roleType === "counsellor";
const formatUserName = (userName?: string | null) => userName?.trim() || "-";

export const AdmissionDetailPageEnhanced = () => {
	const { leadId } = useParams<{ leadId: string }>();
	const { token } = useSession();
	const navigate = useNavigate();
	const leadQuery = useLeadDetailQuery(token, leadId ?? "");
	const usersQuery = useUsersQuery(token);
	const coursesQuery = useCoursesQuery(token);
	const confirmAdmissionMutation = useConfirmAdmissionMutation();

	const { control, handleSubmit, setError, reset, setValue, watch } = useForm<
		ConfirmAdmissionForm & {
			programType?: "ONLINE_SCHOOL" | "COURSES";
			batchType?: "1_TO_1" | "GROUP";
			mentorId?: string;
			batchId?: string;
			courseId?: string;
		}
	>({
		defaultValues: {
			counsellorId: undefined,
			programType: undefined,
			batchType: undefined,
			mentorId: undefined,
			batchId: undefined,
			courseId: undefined,
			note: "",
		},
	});

	const selectedMentorId = watch("mentorId");
	const selectedProgramType = watch("programType");
	const selectedBatchType = watch("batchType");

	const batchesQuery = useBatchesByMentorQuery(token, selectedMentorId ?? "");
	const allUsers = usersQuery.data?.users ?? [];
	const courses = coursesQuery.data?.courses ?? [];

	const mentors = useMemo(
		() => allUsers.filter((user) => user.roles?.some((role) => isMentorRole(role.type ?? "general"))),
		[allUsers],
	);

	const counsellors = useMemo(
		() => allUsers.filter((user) => user.roles?.some((role) => isCounsellorRole(role.type ?? "general"))),
		[allUsers],
	);

	const userNameById = useMemo(
		() => new Map(allUsers.map((user) => [user.id, formatUserName(user.name ?? user.username)])),
		[allUsers],
	);

	const selectedMentor = useMemo(
		() => allUsers.find((u) => u.id === selectedMentorId),
		[selectedMentorId, allUsers],
	);

	const mentorHasCounsellor = selectedMentor?.counsellorId;
	const mentorCounsellorId = mentorHasCounsellor ? selectedMentor.counsellorId : null;

	const lead = leadQuery.data?.lead;
	const latestDemo = lead ? getLatestLeadDemo(lead) : null;

	// Auto-select counsellor when mentor is selected
	useEffect(() => {
		if (selectedMentorId && selectedProgramType === "ONLINE_SCHOOL") {
			const mentor = allUsers.find((u) => u.id === selectedMentorId);
			if (mentor?.counsellorId) {
				setValue("counsellorId", mentor.counsellorId);
			}
		}
	}, [selectedMentorId, selectedProgramType, allUsers, setValue]);

	const onSubmit = async (
		form: ConfirmAdmissionForm & {
			programType?: "ONLINE_SCHOOL" | "COURSES";
			batchType?: "1_TO_1" | "GROUP";
			mentorId?: string;
			batchId?: string;
			courseId?: string;
		},
	) => {
		if (!leadId) {
			return;
		}

		const validation = ConfirmAdmissionPayloadSchema.safeParse({
			counsellorId: form.counsellorId,
			programType: form.programType,
			batchType: form.batchType,
			mentorId: form.mentorId,
			batchId: form.batchId,
			courseId: form.courseId,
			note: form.note,
		});

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
			reset();
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
					className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
				>
					Back to admissions
				</Link>
			</div>

			<div className="mb-6 grid gap-3 rounded-3xl border border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
				<p>Lead: {lead.name ?? "Unnamed lead"} ({lead.phone})</p>
				<p>
					Demo mentor:{" "}
					{latestDemo?.mentorId ? userNameById.get(latestDemo.mentorId) ?? "-" : "-"}
				</p>
				<div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-gray-700">
					<p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Form preferences</p>
					<div className="grid gap-2 md:grid-cols-3">
						<p><span className="font-medium text-gray-900">Start class:</span> {lead.startClassWhen || "-"}</p>
						<p><span className="font-medium text-gray-900">Schedule:</span> {lead.preferredSchedule || "-"}</p>
						<p><span className="font-medium text-gray-900">Demo availability:</span> {lead.demoAvailability || "-"}</p>
						<p><span className="font-medium text-gray-900">Time slots:</span> {lead.preferredTimeslots?.length ? lead.preferredTimeslots.map((timeslot) => typeof timeslot === "string" ? timeslot : `${timeslot.label} • ${timeslot.timesPerWeek}/week • ${timeslot.durationMinutes} min`).join(", ") : "-"}</p>
					</div>
				</div>
				<p>
					Student ID will be generated automatically on confirmation in the format
					`ZID###`.
				</p>
			</div>

			<form className="grid gap-6" onSubmit={handleSubmit(onSubmit)}>
				{/* Program Type Selection */}
				<div className="rounded-2xl border border-gray-300 bg-white p-6">
					<h3 className="mb-4 text-sm font-semibold text-gray-900">Select Program</h3>
					<div className="grid gap-3 md:grid-cols-2">
						<Controller
							name="programType"
							control={control}
							render={({ field }) => (
								<button
									type="button"
									onClick={() => field.onChange("ONLINE_SCHOOL")}
									className={`rounded-2xl border-2 p-4 text-left transition ${
										field.value === "ONLINE_SCHOOL"
											? "border-blue-600 bg-blue-50"
											: "border-gray-300 bg-white hover:border-gray-400"
									}`}
								>
									<div className="font-semibold text-gray-900">Online School</div>
									<div className="text-sm text-gray-600">
										1-to-1 or Group learning with mentors
									</div>
								</button>
							)}
						/>
						<Controller
							name="programType"
							control={control}
							render={({ field }) => (
								<button
									type="button"
									onClick={() => field.onChange("COURSES")}
									className={`rounded-2xl border-2 p-4 text-left transition ${
										field.value === "COURSES"
											? "border-blue-600 bg-blue-50"
											: "border-gray-300 bg-white hover:border-gray-400"
									}`}
								>
									<div className="font-semibold text-gray-900">Courses</div>
									<div className="text-sm text-gray-600">Structured course enrollment</div>
								</button>
							)}
						/>
					</div>
				</div>

				{/* Online School Workflow */}
				{selectedProgramType === "ONLINE_SCHOOL" && (
					<div className="space-y-4 rounded-2xl border border-gray-300 bg-white p-6">
						<h3 className="text-sm font-semibold text-gray-900">Online School Setup</h3>

						{/* Mentor Selection */}
						<Controller
							name="mentorId"
							control={control}
							render={({ field, fieldState }) => (
								<label className="grid gap-2 text-sm font-medium text-gray-600">
									<span>Select Mentor</span>
									<select
										className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
										value={field.value ?? ""}
										onChange={(e) => field.onChange(e.target.value || undefined)}
									>
										<option value="">Choose a mentor...</option>
										{mentors.map((mentor) => (
											<option key={mentor.id} value={mentor.id}>
												{formatUserName(mentor.name ?? mentor.username)}
											</option>
										))}
									</select>
									{fieldState.error?.message && (
										<span className="text-xs text-red-600">{fieldState.error.message}</span>
									)}
								</label>
							)}
						/>

						{selectedMentorId && (
							<>
								{/* Batch Type Selection */}
								<div className="grid gap-2">
									<span className="text-sm font-medium text-gray-600">Batch Type</span>
									<div className="grid gap-2 md:grid-cols-2">
										<Controller
											name="batchType"
											control={control}
											render={({ field }) => (
												<button
													type="button"
													onClick={() => field.onChange("1_TO_1")}
													className={`rounded-2xl border-2 p-3 text-left transition ${
														field.value === "1_TO_1"
															? "border-blue-600 bg-blue-50"
															: "border-gray-300 bg-white"
													}`}
												>
													<div className="font-semibold text-gray-900">1-to-1</div>
													<div className="text-xs text-gray-600">Personal tutoring</div>
												</button>
											)}
										/>
										<Controller
											name="batchType"
											control={control}
											render={({ field }) => (
												<button
													type="button"
													onClick={() => field.onChange("GROUP")}
													className={`rounded-2xl border-2 p-3 text-left transition ${
														field.value === "GROUP"
															? "border-blue-600 bg-blue-50"
															: "border-gray-300 bg-white"
													}`}
												>
													<div className="font-semibold text-gray-900">Group</div>
													<div className="text-xs text-gray-600">Group learning</div>
												</button>
											)}
										/>
									</div>
								</div>

								{/* Batch Selection for Group */}
								{selectedBatchType === "GROUP" && (
									<Controller
										name="batchId"
										control={control}
										render={({ field, fieldState }) => (
											<label className="grid gap-2 text-sm font-medium text-gray-600">
												<span>Select or Create Group</span>
												<select
													className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
													value={field.value ?? ""}
													onChange={(e) => field.onChange(e.target.value || undefined)}
												>
													<option value="">Choose a group...</option>
													{batchesQuery.data?.batches
														?.filter((b) => b.type === "GROUP")
														?.map((batch) => (
															<option key={batch.id} value={batch.id}>
																{batch.name}
															</option>
														))}
												</select>
												{fieldState.error?.message && (
													<span className="text-xs text-red-600">
														{fieldState.error.message}
													</span>
												)}
											</label>
										)}
									/>
								)}
							</>
						)}
					</div>
				)}

				{/* Courses Workflow */}
				{selectedProgramType === "COURSES" && (
					<div className="space-y-4 rounded-2xl border border-gray-300 bg-white p-6">
						<h3 className="text-sm font-semibold text-gray-900">Course Enrollment</h3>

						<Controller
							name="courseId"
							control={control}
							render={({ field, fieldState }) => (
								<label className="grid gap-2 text-sm font-medium text-gray-600">
									<span>Select Course</span>
									<select
										className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
										value={field.value ?? ""}
										onChange={(e) => field.onChange(e.target.value || undefined)}
									>
										<option value="">Choose a course...</option>
										{courses.map((course) => (
											<option key={course.id} value={course.id}>
												{course.name} - Level {course.level}
											</option>
										))}
									</select>
									{fieldState.error?.message && (
										<span className="text-xs text-red-600">{fieldState.error.message}</span>
									)}
								</label>
							)}
						/>
					</div>
				)}

				{/* Counsellor Selection */}
				<div className="rounded-2xl border border-gray-300 bg-white p-6">
					<Controller
						name="counsellorId"
						control={control}
						render={({ field, fieldState }) => (
							<label className="grid gap-2 text-sm font-medium text-gray-600">
								<span>Counsellor</span>
								{mentorHasCounsellor ? (
									<div className="flex flex-col gap-2">
										<div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
											<span className="font-medium text-gray-900">
												Auto-assigned: {userNameById.get(mentorCounsellorId!)}
											</span>
											<p className="mt-1 text-xs text-gray-600">
												The selected mentor already has a counsellor assigned
											</p>
										</div>
										<input type="hidden" value={field.value ?? ""} onChange={field.onChange} />
									</div>
								) : (
									<select
										className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
										value={field.value ?? ""}
										onChange={(e) => field.onChange(e.target.value || undefined)}
									>
										<option value="">Select counsellor</option>
										{counsellors.map((counsellor) => (
											<option key={counsellor.id} value={counsellor.id}>
												{formatUserName(counsellor.name ?? counsellor.username)}
											</option>
										))}
									</select>
								)}
								{fieldState.error?.message && (
									<span className="text-xs text-red-600">{fieldState.error.message}</span>
								)}
							</label>
						)}
					/>
				</div>

				{/* Notes */}
				<Controller
					name="note"
					control={control}
					render={({ field, fieldState }) => (
						<TextAreaField
							label="Notes"
							value={field.value ?? ""}
							onChange={field.onChange}
							error={fieldState.error?.message}
							placeholder="Add any notes about this admission..."
						/>
					)}
				/>

				{/* Submit Button */}
				<div className="flex gap-2">
					<button
						type="submit"
						disabled={confirmAdmissionMutation.isPending}
						className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
					>
						<HiAcademicCap className="h-4 w-4" aria-hidden="true" />
						{confirmAdmissionMutation.isPending ? "Confirming..." : "Confirm Admission"}
					</button>
					<Link
						to="/admissions"
						className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
					>
						Cancel
					</Link>
				</div>
			</form>
		</Panel>
	);
};
