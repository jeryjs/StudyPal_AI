export const baseAppUrl = (() => {
	const isGHPages = (typeof process !== 'undefined' && process.env.GH_DEPLOY) || (typeof window !== 'undefined' && window.location.hostname.includes("github.io"))
	// For GitHub Pages
	if (isGHPages) {
		return "/StudyPal_AI";
	}

	// For local development (localhost or 127.0.0.1)
	return "/";
})();
