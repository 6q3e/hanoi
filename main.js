const DISK_COUNT = 4;

const pegs = {
    pegA: document.getElementById('pegA'),
    pegB: document.getElementById('pegB'),
    pegC: document.getElementById('pegC'),
};

if (!sessionStorage.getItem('scoreResetDone')) {
    localStorage.removeItem('lastResult'); // ベストスコアを削除
    sessionStorage.setItem('scoreResetDone', 'true'); // 初回リセット済みマーク
}

const dragSound = new Audio('drag.mp3');
const dropSound = new Audio('drop.mp3');
const errorSound = new Audio('bb.mp3');
const perfectSound = new Audio('perfect.mp3');
const mybestSound = new Audio('mybest.mp3');
const clearSound = new Audio('clear.mp3');
const playagainSound = new Audio('playagain.mp3');
const buttonSound = new Audio('button.mp3');

// プリロード（遅延対策）
dragSound.load();
dropSound.load();
errorSound.load();
perfectSound.load();
mybestSound.load();
clearSound.load();
playagainSound.load();
buttonSound.load();


let disks = [];

let moveCount = 0;

function updateCounter() {
    moveCount++;
    document.getElementById('moveCount').textContent = moveCount;
}

function createDisks(num) {
    for (let i = num; i >= 1; i--) {
        const disk = document.createElement('div');
        disk.classList.add('disk');
        disk.dataset.size = i;

        disk.setAttribute('draggable', true);

        // 高さと下端位置
        disk.style.bottom = `${(num - i) * 22}px`;

        // 幅（サイズに応じて段階的に広くする）
        const minWidth = 60;
        const maxWidth = 120;
        const width = minWidth + (maxWidth - minWidth) * (i - 1) / (num - 1 || 1);
        disk.style.width = `${width}px`;

        // 色（HSLでサイズに応じて変える：カラフルに）
        const hue = (i - 1) * 360 / num;
        disk.style.backgroundColor = `hsl(${hue}, 70%, 60%)`;

        pegs.pegA.appendChild(disk);
        disks.push(disk);
    }
}

let currentLang = 'ja';

const last_lang = localStorage.setItem('lang', currentLang);
if (last_lang) {
    currentLang = last_lang;
}

const last = localStorage.getItem('lastResult');
if (last) {
    const infoBox = document.createElement('div');
    infoBox.id = 'last-result';
    infoBox.textContent = `自己ベスト: ${last} 手`;
    infoBox.classList.add('last-result');
    document.body.appendChild(infoBox);
}

function getTopDisk(peg) {
    const pegDisks = Array.from(peg.querySelectorAll('.disk'));
    return pegDisks.sort((a, b) => parseInt(b.style.bottom) - parseInt(a.style.bottom))[0];
}

function allowDrop(e) {
    e.preventDefault();
}

function showMessage(text) {
    const box = document.getElementById('messageBox');
    box.textContent = text;
    box.style.opacity = '1';

    // 一度 display:none を解除（必要なら）
    box.style.display = 'block';

    // 1.5秒後にフェードアウト
    setTimeout(() => {
        box.style.opacity = '0';
    }, 1500);

    // 完全に消えたら display:none に戻す（500ms後）
    setTimeout(() => {
        box.style.display = 'none';
    }, 2000);
}

function dragStart(e) {
    const disk = e.target;
    const parentPeg = disk.parentElement;
    const topDisk = getTopDisk(parentPeg);

    if (disk !== topDisk) {
        e.preventDefault(); // ほかのディスクはドラッグさせない
        return;
    }

    dragSound.currentTime = 0;
    dragSound.play().catch(err => console.log('ドラッグ音エラー:', err));

    disk.classList.add('dragging');
    e.dataTransfer.setDragImage(disk, 0, 0);

    e.dataTransfer.setData("text/plain", disk.dataset.size);
    e.dataTransfer.setData("fromPeg", parentPeg.id);

    document.querySelectorAll('.peg').forEach(peg => {
        const top = getTopDisk(peg);
        const size = parseInt(disk.dataset.size);
        if (!top || parseInt(top.dataset.size) > size) {
            peg.classList.add('valid-drop');
        }
    });
}

function drop(e) {
    e.preventDefault();
    const toPeg = e.currentTarget;
    const fromPegId = e.dataTransfer.getData("fromPeg");
    const size = parseInt(e.dataTransfer.getData("text/plain"));
    const disk = document.querySelector(`.disk.dragging`);

    const topDisk = getTopDisk(toPeg);
    if (toPeg.id === fromPegId) {
        dropSound.currentTime = 0;
        dropSound.play().catch(err => console.log('ドロップ音エラー:', err));
    } else if (!topDisk || parseInt(topDisk.dataset.size) > size) {
        // 移動可能：ディスクを新しい棒の上に置く
        dropSound.currentTime = 0;
        dropSound.play().catch(err => console.log('ドロップ音エラー:', err));

        moveHistory.push({ disk, fromPeg: document.getElementById(fromPegId) });
        const count = toPeg.querySelectorAll('.disk').length;
        disk.style.bottom = `${count * 22}px`;
        toPeg.appendChild(disk);
    } else {
        // 置けないときにエラー音を鳴らす
        errorSound.currentTime = 0;
        errorSound.play().catch(err => console.log('エラー音エラー:', err));

        showMessage(translations[currentLang].invalidMove);
    }

    disk.classList.remove('dragging');
    dragEnd({ target: disk });
    updateCounter();
    checkClear();
}

function setupEvents() {
    Object.values(pegs).forEach(peg => {
        peg.addEventListener('dragover', allowDrop);
        peg.addEventListener('drop', drop);
    });

    disks.forEach(disk => {
        disk.addEventListener('dragstart', dragStart);
        disk.addEventListener('dragend', dragEnd);
    });

}

function dragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.peg').forEach(peg => {
        peg.classList.remove('valid-drop'); // 点線枠を消す
    });
}

function resetGame() {
    // ディスク削除
    Object.values(pegs).forEach(peg => {
        peg.innerHTML = '';
    });

    // 状態初期化
    disks = [];
    moveHistory.length = 0;
    moveCount = 0;
    document.getElementById('moveCount').textContent = '0';

    buttonSound.currentTime = 0;
    buttonSound.play().catch(err => console.log('ボタン音エラー:', err));

    // 再生成＆再設定
    createDisks(DISK_COUNT);
    setupEvents();
}

createDisks(DISK_COUNT); // ディスク3枚から開始
setTimeout(setupEvents, 100); // DOM構築後にイベント設定

const moveHistory = [];

document.getElementById('resetBtn').addEventListener('click', resetGame);

document.getElementById('undoBtn').addEventListener('click', () => {
    if (moveHistory.length === 0) return;
    buttonSound.currentTime = 0;
    buttonSound.play().catch(err => console.log('ボタン音エラー:', err));
    const { disk, fromPeg } = moveHistory.pop();
    const count = fromPeg.querySelectorAll('.disk').length;
    disk.style.bottom = `${count * 22}px`;
    fromPeg.appendChild(disk);
    updateCounter();
});

function checkClear() {
    const pegCDisks = pegs.pegC.querySelectorAll('.disk');
    if (pegCDisks.length === DISK_COUNT) {
        // ディスクが大きい順に正しく並んでいるか確認
        const sizes = Array.from(pegCDisks).map(d => Number(d.dataset.size));
        const expected = Array.from({ length: DISK_COUNT }, (_, i) => DISK_COUNT - i);
        const isCorrectOrder = JSON.stringify(sizes) === JSON.stringify(expected);
        if (isCorrectOrder) {
            showClearScreen();
        }
    }
}

function showClearScreen() {
    const previousBest = localStorage.getItem('lastResult');
    const isNewBest = !previousBest || moveCount < Number(previousBest);
    if (isNewBest) {
        localStorage.setItem('lastResult', moveCount); // より小さいスコアを保存
    }

    const best = localStorage.getItem('lastResult');
    const minMoves = Math.pow(2, disks.length) - 1;
    const isPerfect = moveCount === minMoves;

    const t = translations[currentLang];

    if (isPerfect) {
        perfectSound.currentTime = 0;
        perfectSound.play().catch(err => console.log('パーフェクト音エラー:', err));
    } else if (isNewBest) {
        mybestSound.currentTime = 0;
        mybestSound.play().catch(err => console.log('マイベスト音エラー:', err));
    } else {
        clearSound.currentTime = 0;
        clearSound.play().catch(err => console.log('クリア音エラー:', err));
    }

    document.body.innerHTML = `
        <div style="text-align:center; padding: 20px;">
            <h1 style="font-size: 60px; color: red;">${t.clearTitle}</h1>
            <p style="font-size: 24px;">${t.clearSteps(moveCount)}</p>
            ${isPerfect ? `<p style="font-size: 24px; color: red;">${t.clearPerfect}</p>` : ''}
            ${isNewBest ? `<p style="font-size: 24px; color: green;">${t.newBest}</p>` : ''}
            <p style="font-size: 20px;">${t.bestScore(best)}</p>
            <button id="playAgainBtn" style="margin-top: 30px; padding: 10px 20px; font-size: 20px;">${t.playAgain}</button>
        </div>
    `;
    localStorage.setItem('lang', currentLang);
    document.getElementById('playAgainBtn').addEventListener('click', () => {
        playagainSound.currentTime = 0;
        playagainSound.play().catch(err => console.log('もう一度遊ぶ音エラー:', err));
        setTimeout(() => {
            location.reload();
        }, 1000);
    });
}

const translations = {
    ja: {
        langBtn: 'EN',
        title: 'ハノイの塔',
        undo: '1つもどる',
        reset: 'リセット',
        moveCount: '移動回数: ',
        description: '板を操作して、一番右へ同じ形になるように移そう<br>ただし、小さい板の上に大きな板はおけないよ',
        clearTitle: 'クリア',
        clearSteps: (count) => `要したステップ：${count}手`,
        clearPerfect: '最短手です！',
        playAgain: 'もう一度遊ぶ',
        bestScore: (score) => `自己ベスト: ${score} 手`,
        newBest: '自己ベスト更新！',
        invalidMove: 'そこにはおけません'
    },
    en: {
        langBtn: '日本語',
        title: 'Tower of Hanoi',
        undo: 'Undo',
        reset: 'Reset',
        moveCount: 'Steps: ',
        description: 'Move the disks to the right peg in the same order.<br>Bigger disks cannot be placed on smaller ones.',
        clearTitle: 'Clear',
        clearSteps: (count) => `Steps taken: ${count}`,
        clearPerfect: 'Perfect move!',
        playAgain: 'Play Again',
        bestScore: (score) => `Personal Best: ${score} steps`,
        newBest: 'New personal best!',
        invalidMove: 'You cannot place it there.'
    }
};

function switchLanguage() {
    currentLang = currentLang === 'ja' ? 'en' : 'ja';
    const t = translations[currentLang];

    document.getElementById('langToggleBtn').textContent = t.langBtn;
    document.title = t.title;
    document.querySelector('h1').textContent = t.title;
    document.getElementById('undoBtn').textContent = t.undo;
    document.getElementById('resetBtn').textContent = t.reset;
    document.getElementById('counter').innerHTML = `${t.moveCount}<span id="moveCount">${moveCount}</span>`;
    document.getElementById('description').innerHTML = t.description;
    document.getElementById('last-result').textContent = t.bestScore(last);
}

document.getElementById('langToggleBtn').addEventListener('click', switchLanguage);