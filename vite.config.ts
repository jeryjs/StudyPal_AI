import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

import { baseAppUrl } from "./src/utils/utils.ts";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	base: baseAppUrl,	// base URL for gh-pages
	resolve: {
		alias: {
			"@components": path.resolve(__dirname, "./src/components"),
			"@pages": path.resolve(__dirname, "./src/pages"),
			"@contexts": path.resolve(__dirname, "./src/contexts"),
			"@hooks": path.resolve(__dirname, "./src/hooks"),
			"@store": path.resolve(__dirname, "./src/store"),
			"@type": path.resolve(__dirname, "./src/types"),
			"@utils": path.resolve(__dirname, "./src/utils"),
			"@db": path.resolve(__dirname, "./src/db.ts"),
		},
	},
});
