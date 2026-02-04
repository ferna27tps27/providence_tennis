import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FileLock } from "../../lib/utils/file-lock";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

describe("FileLock", () => {
  let testFile: string;
  let lock: FileLock;

  beforeEach(() => {
    // Create a temporary file for testing
    testFile = path.join(os.tmpdir(), `test-lock-${Date.now()}.json`);
    lock = new FileLock(testFile, 2000, 50); // 2 second timeout, 50ms retry
  });

  afterEach(async () => {
    // Cleanup: remove lock file if it exists
    try {
      await fs.unlink(`${testFile}.lock`);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe("lock acquisition", () => {
    it("should acquire lock successfully", async () => {
      const release = await lock.acquire();
      expect(release).toBeDefined();
      expect(typeof release).toBe("function");
      
      // Verify lock file exists
      const lockExists = await lock.isLocked();
      expect(lockExists).toBe(true);
      
      // Release lock
      await release();
      
      // Verify lock file is removed
      const lockExistsAfter = await lock.isLocked();
      expect(lockExistsAfter).toBe(false);
    });

    it("should release lock properly", async () => {
      const release = await lock.acquire();
      await release();
      
      // Should be able to acquire again immediately
      const release2 = await lock.acquire();
      await release2();
    });

    it("should handle multiple acquire-release cycles", async () => {
      for (let i = 0; i < 5; i++) {
        const release = await lock.acquire();
        await release();
      }
      
      // Should still work after multiple cycles
      const release = await lock.acquire();
      await release();
    });
  });

  describe("concurrent locks", () => {
    it("should prevent concurrent access", async () => {
      const lock1 = new FileLock(testFile, 1000, 50);
      const lock2 = new FileLock(testFile, 1000, 50);
      
      // Acquire first lock
      const release1 = await lock1.acquire();
      
      // Second lock should wait
      let lock2Acquired = false;
      const lock2Promise = lock2.acquire().then((release) => {
        lock2Acquired = true;
        return release();
      });
      
      // Give it a moment to try
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(lock2Acquired).toBe(false);
      
      // Release first lock
      await release1();
      
      // Now second lock should acquire
      await lock2Promise;
      expect(lock2Acquired).toBe(true);
    }, 10000); // Increase timeout for this test

    it("should timeout if lock cannot be acquired", async () => {
      const lock1 = new FileLock(testFile, 500, 50); // Short timeout
      const lock2 = new FileLock(testFile, 500, 50);
      
      // Acquire first lock
      const release1 = await lock1.acquire();
      
      // Second lock should timeout
      await expect(lock2.acquire()).rejects.toThrow();
      
      // Cleanup
      await release1();
    }, 10000);
  });

  describe("isLocked", () => {
    it("should return false when no lock exists", async () => {
      const isLocked = await lock.isLocked();
      expect(isLocked).toBe(false);
    });

    it("should return true when lock exists", async () => {
      const release = await lock.acquire();
      const isLocked = await lock.isLocked();
      expect(isLocked).toBe(true);
      await release();
    });
  });
});
