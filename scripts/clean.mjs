#!/usr/bin/env node
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const includeNodeModules = process.argv.includes("--all");

const fixedTargets = [
	".turbo",
	"apps/client/dist",
	"apps/server/dist",
	"packages/schema/dist",
];

const removableDirs = new Set(["dist", ".turbo", ".cache", "coverage"]);
const removableFiles = new Set(["tsconfig.tsbuildinfo"]);

function removeTarget(relativePath) {
	const absolutePath = join(rootDir, relativePath);
	if (!existsSync(absolutePath)) {
		return;
	}

	rmSync(absolutePath, { recursive: true, force: true });
	console.log(`removed ${relativePath}`);
}

function walkAndClean(dir) {
	const entries = readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const absolutePath = join(dir, entry.name);
		const relativePath = absolutePath
			.slice(rootDir.length + 1)
			.replace(/\\/g, "/");

		if (entry.isDirectory()) {
			if (entry.name === ".git") {
				continue;
			}

			if (entry.name === "node_modules") {
				if (includeNodeModules) {
					removeTarget(relativePath);
				}
				continue;
			}

			if (removableDirs.has(entry.name)) {
				removeTarget(relativePath);
				continue;
			}

			walkAndClean(absolutePath);
			continue;
		}

		if (removableFiles.has(entry.name) || entry.name.endsWith(".tsbuildinfo")) {
			removeTarget(relativePath);
		}
	}
}

for (const target of fixedTargets) {
	removeTarget(target);
}

walkAndClean(rootDir);

console.log(includeNodeModules ? "clean:all completed" : "clean completed");
