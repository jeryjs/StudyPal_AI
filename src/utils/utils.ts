export const baseAppUrl = (() => {
	const isGHPages = (typeof process !== 'undefined' && process.env.GH_DEPLOY) || (typeof window !== 'undefined' && window.location.hostname.includes("github.io"))
	// For GitHub Pages
	if (isGHPages) {
		return "/StudyPal_AI";
	}

	// For local development (localhost or 127.0.0.1)
	return "/";
})();

// Helper function to generate a unique color based on a string
export const generateColorFromString = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const baseColor = hash & 0x00FFFFFF;
    const hexColor = '#' + baseColor.toString(16).toUpperCase().padStart(6, '0');
    
    // Darken the color in dark mode without using hooks
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const color = isDarkMode ? darkenColor(hexColor) : hexColor;
    return color.substring(0, 7);
};

// Function to darken a color
const darkenColor = (hexColor: string, factor: number = 0.2): string => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const newR = Math.max(0, Math.floor(r * (1 - factor)));
    const newG = Math.max(0, Math.floor(g * (1 - factor)));
    const newB = Math.max(0, Math.floor(b * (1 - factor)));

    const newHexR = newR.toString(16).padStart(2, '0');
    const newHexG = newG.toString(16).padStart(2, '0');
    const newHexB = newB.toString(16).padStart(2, '0');

    return `#${newHexR}${newHexG}${newHexB}`;
};