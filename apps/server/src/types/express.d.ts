export interface IUser {
	userId: string;
	roleId: string;
	permissions: string[];
}

declare global {
	namespace Express {
		interface Request {
			user?: IUser;
		}
	}
}