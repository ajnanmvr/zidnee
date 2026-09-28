import { exactZidPattern, ZidService, zidPattern } from "../zid/zid.service.js";
import { BatchModel } from "./batch.model.js";

const GROUP_ID_PREFIX = "ZG";

const groupIdOptions = {
	prefix: GROUP_ID_PREFIX,
	field: "groupId",
	findLastId: async () => {
		const last = await BatchModel.findOne({ groupId: zidPattern(GROUP_ID_PREFIX) })
			.sort({ createdAt: -1, _id: -1 })
			.select({ groupId: 1 })
			.lean<{ groupId?: string } | null>();
		return last?.groupId;
	},
	exists: async (id: string) =>
		Boolean(await BatchModel.exists({ groupId: exactZidPattern(id) })),
};

export const BatchIdentityService = {
	/** ZG id for a new group: `manual` if given, else next after the last created. */
	resolveGroupId: (manual?: string) =>
		ZidService.resolve({ ...groupIdOptions, manual }),

	conflict: (groupId: string) => ZidService.conflict(groupIdOptions, groupId),
};
