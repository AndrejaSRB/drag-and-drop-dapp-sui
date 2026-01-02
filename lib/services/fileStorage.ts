const STORAGE_KEY = "myFiles";

export interface StoredFile {
  id: string;
  name: string;
  size: number;
  blobId: string;
  isPublic: boolean;
  createdAt: number;
}

/**
 * Get all stored files from localStorage
 */
export function getStoredFiles(): StoredFile[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

/**
 * Get a single file by ID
 */
export function getStoredFileById(id: string): StoredFile | null {
  const files = getStoredFiles();
  return files.find((f) => f.id === id) || null;
}

/**
 * Save a new file to localStorage
 */
export function saveFile(file: StoredFile): void {
  const files = getStoredFiles();
  files.push(file);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

/**
 * Remove a file from localStorage
 */
export function removeFile(id: string): void {
  const files = getStoredFiles();
  const filtered = files.filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Update a file in localStorage
 */
export function updateFile(id: string, updates: Partial<StoredFile>): void {
  const files = getStoredFiles();
  const index = files.findIndex((f) => f.id === id);
  if (index !== -1) {
    files[index] = { ...files[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  }
}
