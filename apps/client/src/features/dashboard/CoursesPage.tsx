import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { HiPlus } from "react-icons/hi2";
import { Field, Modal, Panel, TextAreaField } from "@/components/dashboard-ui";
import { useCoursesQuery } from "@/features/courses/courses.queries";
import { useCreateCourseMutation } from "@/features/courses/use-create-course-mutation";
import type { CreateCourseForm } from "@/lib/dashboard-types";
import { useSession } from "@/lib/session";

export const CoursesPage = () => {
	const { token } = useSession();
	const { data } = useCoursesQuery(token);
	const courses = data?.courses ?? [];
	const createCourse = useCreateCourseMutation();
	const [open, setOpen] = useState(false);

	const { control, handleSubmit, reset } = useForm<CreateCourseForm>({
		defaultValues: { name: "", level: "", prefix: "", description: undefined },
	});

	const onSubmit = async (form: CreateCourseForm) => {
		try {
			await createCourse.mutateAsync(form);
			toast.success("Course created");
			reset();
			setOpen(false);
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Unable to create course",
			);
		}
	};

	return (
		<div>
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg font-semibold">Courses</h2>
				<button
					type="button"
					className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
					onClick={() => setOpen(true)}
				>
					<HiPlus className="h-4 w-4" /> Add course
				</button>
			</div>

			<Panel title="Course catalog">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50 text-xs text-gray-600 uppercase">
							<tr>
								<th className="px-4 py-3 text-left">Name</th>
								<th className="px-4 py-3 text-left">Level</th>
								<th className="px-4 py-3 text-left">Prefix</th>
								<th className="px-4 py-3 text-left">Description</th>
							</tr>
						</thead>
						<tbody className="bg-white">
							{courses.map((c) => (
								<tr key={c.id} className="border-t">
									<td className="px-4 py-3">{c.name}</td>
									<td className="px-4 py-3">{c.level}</td>
									<td className="px-4 py-3">{c.prefix}</td>
									<td className="px-4 py-3">{c.description ?? "-"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Panel>

			<Modal open={open} title="Create course" onClose={() => setOpen(false)}>
				<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
					<Controller
						name="name"
						control={control}
						render={({ field }) => (
							<Field
								label="Course name"
								value={field.value}
								onChange={field.onChange}
							/>
						)}
					/>
					<div className="grid gap-4 md:grid-cols-2">
						<Controller
							name="level"
							control={control}
							render={({ field }) => (
								<Field
									label="Level"
									value={field.value}
									onChange={field.onChange}
								/>
							)}
						/>
						<Controller
							name="prefix"
							control={control}
							render={({ field }) => (
								<Field
									label="Prefix"
									value={field.value}
									onChange={field.onChange}
								/>
							)}
						/>
					</div>
					<Controller
						name="description"
						control={control}
						render={({ field }) => (
							<TextAreaField
								label="Description"
								value={field.value ?? ""}
								onChange={field.onChange}
							/>
						)}
					/>
					<div className="mt-4 flex justify-end">
						<button
							type="submit"
							className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
						>
							Create
						</button>
					</div>
				</form>
			</Modal>
		</div>
	);
};

export default CoursesPage;
