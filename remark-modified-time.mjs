import { execSync } from 'child_process';

export function remarkModifiedTime() {
	return function (_tree, file) {
		const filepath = file.history[0];
		if (!filepath) return;
		try {
			const result = execSync(
				`git log -1 --pretty="format:%cI" "${filepath}"`,
				{ stdio: ['pipe', 'pipe', 'pipe'], timeout: 5000 }
			);
			const lastModified = result.toString().trim();
			if (lastModified) {
				file.data.astro ??= {};
				file.data.astro.frontmatter ??= {};
				file.data.astro.frontmatter.lastModified = lastModified;
			}
		} catch {
			// Fails for uncommitted files or shallow clones — silently skip
		}
	};
}
