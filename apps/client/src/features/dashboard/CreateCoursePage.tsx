import { CreateCoursePayloadSchema } from "@repo/schema";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { HiAcademicCap } from "react-icons/hi2";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Field, Panel, TextAreaField } from "@/components/dashboard-ui";
import { useCreateCourseMutation } from "@/features/courses/use-create-course-mutation";
import type { CreateCourseForm } from "@/lib/dashboard-types";

export const CreateCoursePage = () => {
	const navigate = useNavigate();
	const createCourseMutation = useCreateCourseMutation();
	const { control, handleSubmit, setError, reset } = useForm<CreateCourseForm>({
		defaultValues: { name: "", level: "", prefix: "", description: undefined },
	});

	const onSubmit = async (form: CreateCourseForm) => {
		const validation = CreateCoursePayloadSchema.safeParse(form);
		if (!validation.success) {
			const errors = validation.error.flatten().fieldErrors;
			if (errors.name?.[0]) {
				setError("name", { type: "manual", message: errors.name[0] });
			}
			if (errors.level?.[0]) {
				setError("level", { type: "manual", message: errors.level[0] });
			}
			if (errors.prefix?.[0]) {
				setError("prefix", { type: "manual", message: errors.prefix[0] });
			}
			if (errors.description?.[0]) {
				setError("description", {
					type: "manual",
					message: errors.description[0],
				});
			}
			return;
		}

		try {
			await createCourseMutation.mutateAsync(validation.data);
			toast.success("Course created successfully.");
			reset({ name: "", level: "", prefix: "", description: undefined });
			navigate("/courses/create");
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to create course");
				return;
			}

			toast.error(
				error instanceof Error ? error.message : "Unable to create course",
			);
		}
	};

	return (
		<Panel title="Create course" description="Add a new course">
			<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
				<Controller
					name="name"
					control={control}
					render={({ field, fieldState }) => (
						<Field
							label="Course name"
							value={field.value}
							onChange={field.onChange}
							placeholder="Foundation English"
							error={fieldState.error?.message}
						/>
					)}
				/>

				<div className="grid gap-4 md:grid-cols-2">
					<Controller
						name="level"
						control={control}
						render={({ field, fieldState }) => (
							<Field
								label="Level"
								value={field.value}
								onChange={field.onChange}
								placeholder="Beginner"
								error={fieldState.error?.message}
							/>
						)}
					/>

					<Controller
						name="prefix"
						control={control}
						render={({ field, fieldState }) => (
							<Field
								label="Prefix"
								value={field.value}
								onChange={field.onChange}
								placeholder="ZID"
								error={fieldState.error?.message}
							/>
						)}
					/>
				</div>

				<Controller
					name="description"
					control={control}
					render={({ field, fieldState }) => (
						<TextAreaField
							label="Description (Optional)"
							value={field.value ?? ""}
							onChange={field.onChange}
							placeholder="Describe the course structure"
							error={fieldState.error?.message}
						/>
					)}
				/>

				<div className="flex flex-wrap gap-2">
					<button
						type="submit"
						className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
						disabled={createCourseMutation.isPending}
					>
						<HiAcademicCap className="h-4 w-4" aria-hidden="true" />
						{createCourseMutation.isPending ? "Creating..." : "Create course"}
					</button>
					<Link
						to="/"
						className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
					>
						Cancel
					</Link>
				</div>
			</form>
		</Panel>
	);
};
