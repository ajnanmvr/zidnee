module.exports = {
	apps: [
		{
			name: "zidnee-api",
			script: "./apps/server/dist/src/index.js",
			env: {
				NODE_ENV: "production",
			},
		},
	],
};
