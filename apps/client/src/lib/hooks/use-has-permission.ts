import { useMeQuery } from "@/features/auth/auth.queries";
import { useSession } from "@/lib/session";

export const useHasPermission = (permissionKey: string): boolean => {
	const { token } = useSession();
	const meQuery = useMeQuery(token);

	return meQuery.data?.permissions?.some((permission) => permission.key === permissionKey) ?? false;
};

export const usePermissionMap = (): Record<string, boolean> => {
	const { token } = useSession();
	const meQuery = useMeQuery(token);

	return (meQuery.data?.permissions ?? []).reduce<Record<string, boolean>>(
		(accumulator, permission) => {
			accumulator[permission.key] = true;
			return accumulator;
		},
		{},
	);
};