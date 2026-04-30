import { CreateCounsellorPayloadSchema } from "@repo/schema";
import { Controller, useForm } from "react-hook-form";
import { HiUserPlus } from "react-icons/hi2";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "@/api/request";
import { Field, Panel } from "@/components/dashboard-ui";
import { useCreateCounsellorMutation } from "@/features/users/use-create-counsellor-mutation";
import type { CreateCounsellorForm } from "@/lib/dashboard-types";

export const CreateCounsellorPage = () => {
	const navigate = useNavigate();
	const createCounsellorMutation = useCreateCounsellorMutation();
	const { control, handleSubmit, setError, reset } = useForm<CreateCounsellorForm>({
		defaultValues: { name: "" },
	});

	const onSubmit = async (form: CreateCounsellorForm) => {
		const validation = CreateCounsellorPayloadSchema.safeParse(form);
		if (!validation.success) {
			const nameError = validation.error.flatten().fieldErrors.name?.[0];
			if (nameError) {
				setError("name", { type: "manual", message: nameError });
			}
			return;
		}

		try {
			await createCounsellorMutation.mutateAsync(validation.data);
			toast.success("Counsellor created successfully.");
			reset({ name: "" });
			navigate("/counsellors");
		} catch (error) {
			if (error instanceof ApiError) {
				toast.error(error.payload.message ?? "Unable to create counsellor");
				return;
			}

			toast.error(error instanceof Error ? error.message : "Unable to create counsellor");
		}
	};

	return (
		<Panel title="Create counsellor" description="Add a new counsellor">
			<form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
				<Controller
					name="name"
					control={control}
					render={({ field, fieldState }) => (
						<Field
							label="Full name"
							value={field.value}
							onChange={field.onChange}
							placeholder="Ajnan"
							error={fieldState.error?.message}
						/>
					)}
				/>

				<div className="flex flex-wrap gap-2">
					<button
						type="submit"
						className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
						disabled={createCounsellorMutation.isPending}
					>
						<HiUserPlus className="h-4 w-4" aria-hidden="true" />
						{createCounsellorMutation.isPending ? "Creating..." : "Create counsellor"}
					</button>
					<Link
						to="/counsellors"
						className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900"
					>
						Cancel
					</Link>
				</div>
			</form>
		</Panel>
	);
};




