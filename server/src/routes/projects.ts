import Router from '@koa/router'
import { readdir, stat, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve, join } from 'path'
import { homedir } from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface Project {
  name: string
  path: string
  is_git: boolean
  branch?: string
  dirty: boolean
  activity: 'active' | 'inactive'
  last_modified?: number
}

// Get projects directory from config or use home directory as default
async function getProjectsDir(): Promise<string> {
  // Check for custom projects directory in config
  const configPath = resolve(homedir(), '.hermes/config.yaml')
  try {
    if (existsSync(configPath)) {
      const raw = await readFile(configPath, 'utf-8')
      // Look for projects_dir in config
      const match = raw.match(/projects_dir:\s*(\S+)/)
      if (match && match[1]) {
        // Expand ~ to home directory
        return match[1].replace(/^~/, homedir())
      }
    }
  } catch {
    // Config not found or unreadable, use default
  }
  return homedir()
}

// Check if directory is a git repository
function isGitRepo(dirPath: string): boolean {
  const gitPath = join(dirPath, '.git')
  return existsSync(gitPath)
}

// Get git branch name
async function getGitBranch(dirPath: string): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync('git branch --show-current', {
      cwd: dirPath,
      timeout: 5000
    })
    return stdout.trim() || undefined
  } catch {
    return undefined
  }
}

// Check if git repo has uncommitted changes
async function isGitDirty(dirPath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync('git status --porcelain', {
      cwd: dirPath,
      timeout: 5000
    })
    return stdout.trim().length > 0
  } catch {
    return false
  }
}

// Get the most recent modification time in a directory
async function getLastModified(dirPath: string): Promise<number> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    let maxTime = 0

    for (const entry of entries) {
      // Skip .git directory for activity calculation
      if (entry.name === '.git') continue

      const fullPath = join(dirPath, entry.name)
      try {
        const stats = await stat(fullPath)
        const time = stats.mtimeMs

        if (entry.isDirectory() && entry.name !== '.git') {
          // Recursively check subdirectories (limit depth to avoid performance issues)
          try {
            const subEntries = await readdir(fullPath, { withFileTypes: true })
            for (const subEntry of subEntries) {
              if (subEntry.name === '.git') continue
              const subPath = join(fullPath, subEntry.name)
              try {
                const subStats = await stat(subPath)
                if (subStats.mtimeMs > maxTime) {
                  maxTime = subStats.mtimeMs
                }
              } catch {
                // Skip files we can't access
              }
            }
          } catch {
            // Skip directories we can't read
          }
        }

        if (time > maxTime) {
          maxTime = time
        }
      } catch {
        // Skip files we can't access
      }
    }

    return maxTime
  } catch {
    return 0
  }
}

// Determine if project is active (modified within last 7 days)
function isProjectActive(lastModified: number): 'active' | 'inactive' {
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  const now = Date.now()
  return (now - lastModified) < sevenDaysMs ? 'active' : 'inactive'
}

export const projectsRoutes = new Router()

// GET /api/projects - list all projects with git status
projectsRoutes.get('/api/projects', async (ctx) => {
  try {
    const projectsDir = await getProjectsDir()
    const entries = await readdir(projectsDir, { withFileTypes: true })
    const projects: Project[] = []

    // Filter directories only
    const directories = entries.filter(e => e.isDirectory())

    // Process each directory
    for (const dir of directories) {
      // Skip hidden directories (except special ones)
      if (dir.name.startsWith('.') && dir.name !== '.hermes') continue

      const dirPath = join(projectsDir, dir.name)
      const is_git = isGitRepo(dirPath)

      let branch: string | undefined
      let dirty = false

      if (is_git) {
        branch = await getGitBranch(dirPath)
        dirty = await isGitDirty(dirPath)
      }

      const last_modified = await getLastModified(dirPath)
      const activity = isProjectActive(last_modified)

      projects.push({
        name: dir.name,
        path: dirPath,
        is_git,
        branch,
        dirty,
        activity,
        last_modified
      })
    }

    // Sort by last modified time (most recent first)
    projects.sort((a, b) => (b.last_modified || 0) - (a.last_modified || 0))

    ctx.body = { projects }
  } catch (err: any) {
    ctx.status = 500
    ctx.body = { error: err.message }
  }
})