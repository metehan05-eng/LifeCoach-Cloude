/**
 * Code Sandbox — Docker-based code execution.
 * 
 * Prerequisites:
 * 1. Install Docker on the server
 * 2. Pull sandbox images: docker pull python:3.11-alpine node:20-alpine
 * 3. Ensure the Node.js process has access to the Docker socket
 *    (or use a Docker-in-Docker setup)
 * 
 * Security:
 * - Each execution runs in an isolated Docker container
 * - Network access disabled (--network none)
 * - CPU/memory limits enforced
 * - 10-second execution timeout
 * - No persistent filesystem (container removed after execution)
 * 
 * Usage:
 * POST /api/code-sandbox
 * { "language": "python", "code": "print('hello')" }
 * 
 * Response:
 * { "output": "hello\n", "error": null, "executionTime": 0.234 }
 */

import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const DOCKER_IMAGES = {
  python: 'python:3.11-slim',
  javascript: 'node:20-alpine',
  typescript: 'node:20-alpine',
  bash: 'alpine:latest',
};

const TIMEOUT = 10; // seconds

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { language, code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });

  const image = DOCKER_IMAGES[language];
  if (!image) return res.status(400).json({ error: `Unsupported language: ${language}` });

  const sandboxId = randomUUID().slice(0, 8);
  const tmpDir = join(tmpdir(), `sandbox-${sandboxId}`);
  
  try {
    mkdirSync(tmpDir, { recursive: true });

    const filename = language === 'python' ? 'script.py' 
      : language === 'typescript' ? 'script.ts'
      : 'script.js';
    const filepath = join(tmpDir, filename);
    writeFileSync(filepath, code);

    const runCmd = language === 'python' ? `python ${filename}`
      : language === 'typescript' ? `npx tsx ${filename}`
      : `node ${filename}`;

    const start = Date.now();
    const output = execSync(
      `docker run --rm --network none ` +
      `--memory=256m --cpus=1 ` +
      `--stop-timeout=${TIMEOUT} ` +
      `-v ${tmpDir}:/sandbox -w /sandbox ` +
      `${image} sh -c "${runCmd}"`,
      { timeout: TIMEOUT * 1000, encoding: 'utf8' }
    );
    const executionTime = (Date.now() - start) / 1000;

    return res.status(200).json({
      output: output.trim(),
      error: null,
      executionTime,
    });
  } catch (err) {
    const error = err.stderr || err.stdout || err.message || 'Execution failed';
    return res.status(200).json({
      output: err.stdout || '',
      error: error.trim(),
      executionTime: 0,
    });
  } finally {
    try {
      const fs = await import('fs/promises');
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}
