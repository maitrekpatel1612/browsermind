import { appendFile, createFile, emptyFile, fileExists, readFile, resolveSafePath } from "@/utils/fsUtils"
import { UserData } from "@/app/types/user-types";
import path from "path";
import { nowTimeString, todayDateString } from "@/utils/dateUtils";

export class MemoryHandler {
    private memoryRoot;
    private userData: UserData;

    constructor(memoryRoot: string, userData: UserData) {
        this.memoryRoot = path.resolve(memoryRoot);
        this.userData = userData;
    }


    async init() {
        await this.ensureCoreFiles();
    }

    async ensureCoreFiles() {
        const defaults = [
            {
                path: `${this.memoryRoot}/MEMORY-${this.userData.userId}.md`,
                content: `# LONGTERM MEMORY\n\n`
            },
            {
                path: this.dailyLogArchivePath(),
                content: `# DAILY_LOG_ARCHIVE\n\n`
            },
            {
                path: `${this.memoryRoot}/${todayDateString()}-${this.userData.userId}.md`,
                content: `# Daily notes\n\n`
            },
            {
                path: `${this.memoryRoot}/SYSTEM-${this.userData.userId}.md`,
                content: `# SYSTEM PROMPT\n\n
                        Follow the policy and be helpful.`
            }
        ]

        await this.ensureTodayLog();

        for (const file of defaults) {
            const fullPath = resolveSafePath(this.memoryRoot, file.path);
            if (!await fileExists(fullPath)) {
                await createFile(this.memoryRoot, file.path, file.content);
            }
        }
    }

    async ensureTodayLog(now = new Date()) {
        const relativePath = this.todayLogPath()
        const fullPath = resolveSafePath(this.memoryRoot, relativePath)
        if (!await fileExists(fullPath)) {
            await createFile(this.memoryRoot, relativePath, `# Daily log ${todayDateString(now)}\n\n`);
        }

        return relativePath;
    }

    async logInteraction(role: string, content: string, now = new Date()) {
        const logPath = await this.ensureTodayLog(now);
        const chunk = `## [Time: ${nowTimeString(now)}] Role: ${role}\n${content}\n\n`;
        await appendFile(this.memoryRoot, logPath, chunk);
        return logPath;
    }

    async logToArchive(role: string, content: string, now = new Date()) {
        const archivePath = this.dailyLogArchivePath(now);
        const chunk = `## [Time: ${nowTimeString(now)}] Role: ${role}\n${content}\n\n`;
        await appendFile(this.memoryRoot, archivePath, chunk);
        return archivePath;
    }

    /**
     * Empty working memory file content
     */

    async emptyFileContent() {
        await emptyFile(this.memoryRoot, this.todayLogPath());
    }

    todayLogPath(now = new Date()) {
        return `${todayDateString(now)}-${this.userData.userId}.md`;
    }

    dailyLogArchivePath(now = new Date()) {
        return `DAILY_LOG_ARCHIVE-${todayDateString(now)}-${this.userData.userId}.md`;
    }

    async readArchiveFile() {
        try {
            const data = await readFile(this.memoryRoot, this.dailyLogArchivePath());
            return { data, exist: true };
        }
        catch (err) {
            return { exist: false };
        }
    }


    async readToday(now = new Date()) {
        const logPath = await this.ensureTodayLog(now);
        return readFile(this.memoryRoot, logPath);
    }

    async readMemoryFiles(name: string) {
        const relativePath = `${this.memoryRoot}/${name}`;
        const fullPath = resolveSafePath(this.memoryRoot, relativePath);
        if (!await fileExists(fullPath)) {
            await createFile(this.memoryRoot, relativePath, "");
        }
        return readFile(this.memoryRoot, relativePath);
    }

}