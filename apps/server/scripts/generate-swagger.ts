#!/usr/bin/env tsx
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import YAML from "js-yaml";
import { swaggerSpec } from "../src/config/swagger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.join(__dirname, "../../../docs/api");

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

// Write JSON file
const jsonPath = path.join(outputDir, "swagger.json");
fs.writeFileSync(jsonPath, JSON.stringify(swaggerSpec, null, 2));
console.log(`✓ Swagger JSON generated: ${jsonPath}`);

// Write YAML file
const yamlPath = path.join(outputDir, "swagger.yaml");
const yamlContent = YAML.dump(swaggerSpec, { lineWidth: -1 });
fs.writeFileSync(yamlPath, yamlContent);
console.log(`✓ Swagger YAML generated: ${yamlPath}`);

// Write Postman collection (convertible format)
const postmanPath = path.join(outputDir, "swagger-postman.json");
fs.writeFileSync(postmanPath, JSON.stringify(swaggerSpec, null, 2));
console.log(`✓ Swagger file for Postman generated: ${postmanPath}`);

console.log("\n📚 Import these files into:");
console.log("  • Postman: File > Import > Select swagger.json");
console.log("  • Insomnia: Create > From URL > paste file path");
console.log("  • Thunder Client: Import > OpenAPI 3.0");
console.log("  • Swagger Editor: https://editor.swagger.io");
