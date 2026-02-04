import { promises as fs } from 'fs';
import path from 'path';

/**
 * File-based locking mechanism to prevent race conditions
 * 
 * Uses advisory file locks by creating a lock file. This works well
 * for single-server deployments and prevents concurrent modifications.
 */
export class FileLock {
  private lockFilePath: string;
  private lockHandle: fs.FileHandle | null = null;
  private readonly timeout: number;
  private readonly retryInterval: number;

  /**
   * @param filePath Path to the file that needs to be locked
   * @param timeout Maximum time to wait for lock acquisition (ms)
   * @param retryInterval Time between retry attempts (ms)
   */
  constructor(
    filePath: string,
    timeout: number = 5000,
    retryInterval: number = 100
  ) {
    this.lockFilePath = `${filePath}.lock`;
    this.timeout = timeout;
    this.retryInterval = retryInterval;
  }

  /**
   * Acquires an exclusive lock on the file
   * 
   * @returns Release function to call when done with the critical section
   * @throws Error if lock cannot be acquired within timeout
   * 
   * @example
   * const lock = new FileLock('/path/to/file.json');
   * const release = await lock.acquire();
   * try {
   *   // Critical section - modify file
   * } finally {
   *   await release();
   * }
   */
  async acquire(): Promise<() => Promise<void>> {
    const startTime = Date.now();

    while (Date.now() - startTime < this.timeout) {
      try {
        // Try to create lock file with exclusive flag (O_EXCL)
        // This will fail if the file already exists
        this.lockHandle = await fs.open(this.lockFilePath, 'wx');
        
        // Write process ID to lock file for debugging
        await fs.writeFile(
          this.lockFilePath,
          `${process.pid}\n${new Date().toISOString()}`,
          'utf-8'
        );

        // Return release function
        return async () => {
          if (this.lockHandle) {
            await this.lockHandle.close();
            this.lockHandle = null;
          }
          try {
            await fs.unlink(this.lockFilePath);
          } catch (error: any) {
            // Lock file might already be deleted by another process
            // or if the process crashed. This is okay.
            if (error.code !== 'ENOENT') {
              console.warn(`Warning: Could not delete lock file: ${error.message}`);
            }
          }
        };
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          // Lock file exists, another process has the lock
          // Wait and retry
          await new Promise(resolve => 
            setTimeout(resolve, this.retryInterval)
          );
          continue;
        }
        // Other error (permissions, etc.)
        throw new Error(
          `Could not acquire lock on ${this.lockFilePath}: ${error.message}`
        );
      }
    }

    // Timeout reached
    throw new Error(
      `Could not acquire lock on ${this.lockFilePath} within ${this.timeout}ms. ` +
      `Another process may be holding the lock.`
    );
  }

  /**
   * Check if a lock file exists (for debugging/monitoring)
   */
  async isLocked(): Promise<boolean> {
    try {
      await fs.access(this.lockFilePath);
      return true;
    } catch {
      return false;
    }
  }
}
