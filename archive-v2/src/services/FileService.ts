import * as fs from "node:fs/promises";

export interface FileService {
	read(path: string): Promise<string>;
	write(path: string, content: string): Promise<void>;
	delete(path: string): Promise<void>;
}

export class RealFileService implements FileService {
	async read(path: string): Promise<string> {
		return fs.readFile(path, "utf-8");
	}

	async write(path: string, content: string): Promise<void> {
		await fs.writeFile(path, content, "utf-8");
	}

	async delete(path: string): Promise<void> {
		await fs.unlink(path);
	}
}
