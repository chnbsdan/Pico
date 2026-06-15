// .github/scripts/sync-history.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ======================== 配置区 ========================
const HISTORY_FILE = 'upload_history.json';
const WATCH_FOLDERS = ['sh', 'sd', 'wallpaper', 'cover'];
const EXCLUDE_FILES = ['.keep', '.gitkeep', '.DS_Store', 'Thumbs.db'];
// =======================================================

function getFileCommitTime(filePath) {
    try {
        const cmd = `git log -1 --format=%aI -- "${filePath}"`;
        const output = execSync(cmd, { encoding: 'utf-8' }).trim();
        return output || new Date().toISOString();
    } catch (error) {
        console.warn(`无法获取文件 ${filePath} 的提交时间，使用当前时间。`);
        return new Date().toISOString();
    }
}

function scanImages() {
    const images = [];
    for (const folder of WATCH_FOLDERS) {
        if (!fs.existsSync(folder)) continue;

        const files = fs.readdirSync(folder);
        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(ext);
            const isExcluded = EXCLUDE_FILES.includes(file);

            if (isImage && !isExcluded) {
                const filePath = `${folder}/${file}`;
                const commitTime = getFileCommitTime(filePath);
                const fullUrl = `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY}/main/${filePath}`;
                // 使用毫秒级时间戳 + 文件名，确保ID唯一性
                const imageId = `${new Date(commitTime).getTime()}-${file}`;

                images.push({
                    id: imageId,
                    filename: file,
                    url: fullUrl,
                    folder: folder,
                    time: commitTime
                });
            }
        }
    }
    images.sort((a, b) => new Date(b.time) - new Date(a.time));
    return images;
}

function loadHistory() {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    } catch (error) {
        console.error('读取历史记录文件失败，将创建新文件。', error);
        return [];
    }
}

function saveHistory(history) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
    console.log(`✅ 已保存 ${history.length} 条记录到 ${HISTORY_FILE}`);
}

function mergeHistory(existingHistory, newImages) {
    const historyMap = new Map();
    // 用 "文件夹/文件名" 作为唯一键
    for (const record of existingHistory) {
        const key = `${record.folder}/${record.filename}`;
        historyMap.set(key, record);
    }

    let newCount = 0;
    for (const image of newImages) {
        const key = `${image.folder}/${image.filename}`;
        if (!historyMap.has(key)) {
            historyMap.set(key, image);
            console.log(`✨ 新增记录: ${key}`);
            newCount++;
        }
    }

    if (newCount === 0) {
        console.log('📭 未发现新图片，历史记录无需更新。');
        return null;
    }

    const mergedHistory = Array.from(historyMap.values());
    mergedHistory.sort((a, b) => new Date(b.time) - new Date(a.time));
    // 只保留最近 2000 条，避免文件过大
    return mergedHistory.slice(0, 2000);
}

function commitAndPush() {
    try {
        execSync(`git config user.name "github-actions[bot]"`);
        execSync(`git config user.email "github-actions[bot]@users.noreply.github.com"`);
        execSync(`git add ${HISTORY_FILE}`);
        execSync(`git commit -m "chore: 自动同步上传历史记录 [skip ci]"`);
        execSync(`git push`);
        console.log('🚀 更改已成功推送到远程仓库！');
    } catch (error) {
        console.error('⚠️ 提交或推送失败，可能没有新文件需要提交。', error.message);
    }
}

async function main() {
    console.log('🚀 开始同步上传历史记录...');
    console.log(`📁 监听文件夹: ${WATCH_FOLDERS.join(', ')}`);

    const currentImages = scanImages();
    console.log(`🖼️  扫描到 ${currentImages.length} 张图片`);

    const existingHistory = loadHistory();
    console.log(`📜 现有记录: ${existingHistory.length} 条`);

    const newHistory = mergeHistory(existingHistory, currentImages);
    if (newHistory === null) {
        console.log('🎉 没有新图片需要同步，任务结束。');
        return;
    }

    console.log(`📝 合并后记录: ${newHistory.length} 条`);
    saveHistory(newHistory);
    commitAndPush();
}

main().catch(error => {
    console.error('💥 脚本运行出错:', error);
    process.exit(1);
});
