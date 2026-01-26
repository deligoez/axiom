import type { FileService } from "./FileService.js";

export class MockFileService implements FileService {
	private files: Map<string, string> = new Map();
	private throwOnRead = false;
	private throwOnWrite = false;
	private throwOnDelete = false;
	private throwError: Error | null = null;

	deleteCalls: string[] = [];
	writeCalls: Array<{ path: string; content: string }> = [];

	setFile(path: string, content: string): void {
		this.files.set(path, content);
	}

	setThrowOnRead(error: Error): void {
		this.throwOnRead = true;
		this.throwError = error;
	}

	setThrowOnWrite(error: Error): void {
		this.throwOnWrite = true;
		this.throwError = error;
	}

	setThrowOnDelete(error: Error): void {
		this.throwOnDelete = true;
		this.throwError = error;
	}

	async read(path: string): Promise<string> {
		if (this.throwOnRead && this.throwError) {
			throw this.throwError;
		}
		const content = this.files.get(path);
		if (content === undefined) {
			throw new Error(`File not found: ${path}`);
		}
		return content;
	}

	async write(path: string, content: string): Promise<void> {
		if (this.throwOnWrite && this.throwError) {
			throw this.throwError;
		}
		this.writeCalls.push({ path, content });
		this.files.set(path, content);
	}

	async delete(path: string): Promise<void> {
		if (this.throwOnDelete && this.throwError) {
			throw this.throwError;
		}
		this.deleteCalls.push(path);
		this.files.delete(path);
	}

	reset(): void {
		this.files.clear();
		this.deleteCalls = [];
		this.writeCalls = [];
		this.throwOnRead = false;
		this.throwOnWrite = false;
		this.throwOnDelete = false;
		this.throwError = null;
	}
}
