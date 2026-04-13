import { writeFile, chmod, stat } from 'fs/promises'
import { resolve } from 'path'

const SECURE_FILE_MODE = 0o600

export async function writeSecureFile(filePath: string, content: string): Promise<void> {
  const absolutePath = resolve(filePath)

  await writeFile(absolutePath, content, 'utf-8')

  try {
    await chmod(absolutePath, SECURE_FILE_MODE)
  } catch (err: any) {
    throw new Error(`Failed to set secure permissions on ${filePath}: ${err.message}`)
  }
}

export async function ensureSecurePermissions(filePath: string): Promise<boolean> {
  const absolutePath = resolve(filePath)

  try {
    const s = await stat(absolutePath)
    const mode = s.mode & 0o777

    if (mode !== SECURE_FILE_MODE) {
      await chmod(absolutePath, SECURE_FILE_MODE)
    }
    return true
  } catch {
    return false
  }
}

export async function verifySecureFile(filePath: string): Promise<{ secure: boolean; mode?: number }> {
  const absolutePath = resolve(filePath)

  try {
    const s = await stat(absolutePath)
    const mode = s.mode & 0o777

    return {
      secure: mode === SECURE_FILE_MODE,
      mode
    }
  } catch {
    return { secure: false }
  }
}