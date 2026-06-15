const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HISTORY_FILE = 'upload_history.json';
const WATCH_FOLDERS = ['sh', 'sd', 'wallpaper', 'cover'];
const EXCLUDE_FILES = ['.keep', '.gitkeep', '.DS_Store', 'Thumbs.db'];

function getFileCommitTime(filePath) {
    try {
        const cmd = `git log -1 --format=%aI -- "${filePath}"`;
        const output = execSync(cmd, { encoding: 'utf-8' }).trim();
        return output || new Date().toISOString();
    } catch (error) {
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
                images.push({
                    id: `${new Date(commitTime).getTime()}-${file}`,
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
        return [];
    }
}

function saveHistory(history) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
    console.log(`✅ 已保存 ${history.length} 条记录`);
}

function mergeHistory(existingHistory, newImages) {
    const historyMap = new Map();
    for (const record of existingHistory) {
        const key = `${record.folder}/${record.filename}`;
        historyMap.set(key, record);
    }
    let newCount = 0;
    for (const image of newImages) {
        const key = `${image.folder}/${image.filename}`;
        if (!historyMap.has(key)) {
            historyMap.set(key, image);
            console.log(`✨ 新增: ${key}`);
            newCount++;
        }
    }
    if (newCount === 0) return null;
    const mergedHistory = Array.from(historyMap.values());
    mergedHistory.sort((a, b) => new Date(b.time) - new Date(a.time));
    return mergedHistory.slice(0, 2000);
}

function commitAndPush() {
    try {
        execSync(`git config user.name "github-actions[bot]"`);
        execSync(`git config user.email "github-actions[bot]@users.noreply.github.com"`);
        execSync(`git add ${HISTORY_FILE}`);
        execSync(`git commit -m "chore: 自动同步上传历史记录 [skip ci]"`);
        execSync(`git push`);
        console.log('✅ 已推送到仓库');
    } catch (error) {
        console.log('没有新文件需要提交');
    }
}

function main() {
    console.log('开始同步上传历史记录...');
    const currentImages = scanImages();
    console.log(`扫描到 ${currentImages.length} 张图片`);
    const existingHistory = loadHistory();
    console.log(`现有记录: ${existingHistory.length} 条`);
    const newHistory = mergeHistory(existingHistory, currentImages);
    if (newHistory === null) {
        console.log('没有新图片');
        return;
    }
    saveHistory(newHistory);
    commitAndPush();
}

main();
