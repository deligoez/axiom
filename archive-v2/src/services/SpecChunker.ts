export interface Chunk {
	startLine: number;
	endLine: number;
	content: string;
}

const DEFAULT_CHUNK_SIZE = 500;

export class SpecChunker {
	private chunks: Chunk[] = [];

	/**
	 * Split content into chunks, preserving section boundaries
	 */
	chunk(content: string, size: number = DEFAULT_CHUNK_SIZE): Chunk[] {
		const lines = content.split("\n");
		this.chunks = [];

		if (lines.length <= size) {
			this.chunks.push({
				startLine: 1,
				endLine: lines.length,
				content,
			});
			return this.chunks;
		}

		let currentChunkStart = 0;

		while (currentChunkStart < lines.length) {
			let chunkEnd = Math.min(currentChunkStart + size, lines.length);

			// Look for section boundary (markdown header) near the chunk end
			// to avoid splitting content from its header
			if (chunkEnd < lines.length) {
				// Search backwards for a header line that could be a better break point
				for (
					let i = chunkEnd;
					i > currentChunkStart + size - 50 && i > currentChunkStart;
					i--
				) {
					if (this.isHeaderLine(lines[i])) {
						// Break before the header so it stays with its content
						chunkEnd = i;
						break;
					}
				}
			}

			const chunkLines = lines.slice(currentChunkStart, chunkEnd);
			this.chunks.push({
				startLine: currentChunkStart + 1, // 1-indexed
				endLine: chunkEnd, // endLine is inclusive and 1-indexed
				content: chunkLines.join("\n"),
			});

			currentChunkStart = chunkEnd;
		}

		return this.chunks;
	}

	/**
	 * Get processing progress as a percentage
	 */
	getProgress(chunkIndex: number): number {
		if (this.chunks.length === 0) {
			return 0;
		}
		return Math.round(((chunkIndex + 1) / this.chunks.length) * 100);
	}

	/**
	 * Check if a line is a markdown header
	 */
	private isHeaderLine(line: string): boolean {
		return /^#{1,6}\s/.test(line);
	}
}
