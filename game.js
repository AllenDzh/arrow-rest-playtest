/* Local prototype. Generated from shared TypeScript; no network or third-party runtime. */
(function(){
'use strict';
const modules={"main.mjs": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const session_js_1 = require("src/core/session.js");
const GameController_js_1 = require("src/view/GameController.js");
const canvas_renderer_mjs_1 = require("canvas-renderer.mjs");
const SAVE = 'arrow-prototype-save-v1', PREFS = 'arrow-prototype-prefs-v1', CLOCK = 'arrow-prototype-clock-v1';
const canvas = document.getElementById('game'), controls = document.getElementById('controls');
const errorPanel = document.getElementById('storage-error'), errorDetail = document.getElementById('error-detail');
const status = document.getElementById('status');
document.getElementById('loading').hidden = true;
let controller, session, preferences, clock, audioContext, lastRevision = -1, controlSignature = '';
const defaults = () => ({ sound: false, vibration: true, reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches });
function read(key) { const value = localStorage.getItem(key); return value === null ? undefined : JSON.parse(value); }
function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function feedback(kind) {
    if (preferences.vibration && typeof navigator.vibrate === 'function')
        navigator.vibrate(kind === 'blocked' ? 24 : kind === 'win' ? [15, 35, 15] : 10);
    if (!preferences.sound)
        return;
    try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio)
            return;
        audioContext ?? (audioContext = new Audio());
        if (audioContext.state === 'suspended')
            void audioContext.resume();
        const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = kind === 'blocked' ? 180 : kind === 'win' ? 740 : 520;
        const t = audioContext.currentTime;
        gain.gain.setValueAtTime(.0001, t);
        gain.gain.exponentialRampToValueAtTime(.055, t + .012);
        gain.gain.exponentialRampToValueAtTime(.0001, t + .13);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(t + .14);
    }
    catch { /* Sound is optional and must never interrupt gameplay. */ }
}
function makeSession(save) { return new session_js_1.GameSession({ save, onChange: state => write(SAVE, state) }); }
function resetSession() {
    const raw = localStorage.getItem(SAVE);
    if (raw !== null)
        localStorage.setItem(`${SAVE}-backup-${Date.now()}`, raw);
    const next = makeSession();
    write(SAVE, next.snapshot());
    session = next;
    return next;
}
function start() {
    try {
        const raw = read(SAVE);
        session = makeSession(raw);
        const p = read(PREFS);
        preferences = p && typeof p.sound === 'boolean' && typeof p.vibration === 'boolean' && typeof p.reducedMotion === 'boolean' ? p : defaults();
        const c = read(CLOCK);
        clock = c && typeof c.playedSeconds === 'number' && Number.isFinite(c.playedSeconds) && c.playedSeconds >= 0 && typeof c.restUntil === 'number' && Number.isFinite(c.restUntil) && typeof c.reminderShown === 'boolean' ? c : { playedSeconds: 0, restUntil: 0, reminderShown: false };
        // Verify writes are possible before offering a play session with promised autosave.
        if (raw === undefined)
            write(SAVE, session.snapshot());
        controller = new GameController_js_1.GameController({ session, preferences, clockState: clock,
            onPreferences: p => { write(PREFS, p); preferences = p; }, onClockState: c => { write(CLOCK, c); clock = c; },
            onReset: resetSession, onFeedback: feedback,
            capabilities: { sound: !!(window.AudioContext || window.webkitAudioContext), vibration: typeof navigator.vibrate === 'function' } });
        errorPanel.hidden = true;
        lastRevision = -1;
        controlSignature = '';
        draw();
        if (new URLSearchParams(location.search).get('test') === '1') {
            window.__arrowTest = { get controller() { return controller; }, get session() { return session; }, get state() { return controller.currentSession.getState(); }, getFrame: () => controller.frame() };
        }
    }
    catch (error) {
        controller = undefined;
        controls.replaceChildren();
        errorPanel.hidden = false;
        errorDetail.textContent = `读取状态：${error instanceof Error ? error.message : '不可用'}`;
    }
}
function draw() {
    if (!controller)
        return;
    const frame = controller.frame();
    (0, canvas_renderer_mjs_1.renderCanvas)(canvas, frame);
    lastRevision = controller.revision;
    const signature = JSON.stringify(frame.hits.map(h => [h.id, h.enabled, h.label, h.action]));
    if (signature !== controlSignature) {
        const focused = document.activeElement?.dataset?.hit;
        controls.replaceChildren();
        for (const hit of frame.hits) {
            const button = document.createElement('button');
            button.type = 'button';
            button.setAttribute('aria-label', hit.label);
            button.title = hit.label;
            button.dataset.hit = hit.id;
            button.disabled = !hit.enabled;
            button.style.left = `${hit.x / frame.width * 100}%`;
            button.style.top = `${hit.y / frame.height * 100}%`;
            button.style.width = `${hit.w / frame.width * 100}%`;
            button.style.height = `${hit.h / frame.height * 100}%`;
            button.addEventListener('click', () => { controller.action(hit.action); draw(); });
            controls.appendChild(button);
        }
        if (focused) {
            const element = [...controls.children].find(n => n.dataset.hit === focused);
            element?.focus({ preventScroll: true });
        }
        controlSignature = signature;
        const s = controller.snapshot();
        status.textContent = s.page === 'play' ? `第${s.state.current?.levelId}关，剩余${s.state.current?.remaining.length}支箭头，${s.state.coins}金币` : s.page === 'levels' ? '选择关卡' : '箭头小憩首页';
    }
}
canvas.addEventListener('pointerup', event => { if (!controller)
    return; const bounds = canvas.getBoundingClientRect(); controller.tap((event.clientX - bounds.left) * 390 / bounds.width, (event.clientY - bounds.top) * 844 / bounds.height); draw(); });
document.getElementById('retry-storage').addEventListener('click', start);
document.getElementById('reset-storage').addEventListener('click', () => {
    if (!confirm('将备份无法读取的原始记录，再清除当前进度。确定重新开始吗？'))
        return;
    try {
        // A failed backup stops recovery, preserving the original record.
        for (const key of [SAVE, PREFS, CLOCK]) {
            const raw = localStorage.getItem(key);
            if (raw !== null)
                localStorage.setItem(`${key}-backup-${Date.now()}`, raw);
        }
        const fresh = makeSession();
        write(SAVE, fresh.snapshot());
        write(PREFS, defaults());
        write(CLOCK, { playedSeconds: 0, restUntil: 0, reminderShown: false });
        start();
    }
    catch {
        errorDetail.textContent = '恢复未完成，请检查浏览器存储权限。';
    }
});
document.addEventListener('visibilitychange', () => controller?.setVisible(!document.hidden));
window.addEventListener('resize', draw);
let lastTime = performance.now();
function loop(now) { const dt = (now - lastTime) / 1000; lastTime = now; controller?.update(dt); if (controller && controller.revision !== lastRevision)
    draw(); requestAnimationFrame(loop); }
start();
requestAnimationFrame(loop);

},
"src/core/session.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameSession = exports.ECONOMY = void 0;
exports.validateSave = validateSave;
const levels_1 = require("src/core/levels.js");
const rules_1 = require("src/core/rules.js");
exports.ECONOMY = { initialCoins: 60, firstClear: 20, unassistedBonus: 5, hint: 20, revive: 40 };
const clone = (value) => JSON.parse(JSON.stringify(value));
const object = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v, min, max = 1000000000) => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const rejected = (message) => ({ ok: false, kind: 'rejected', message });
/** Reject invalid saves, preserving the caller's raw data for explicit recovery. */
function validateSave(value) {
    if (!object(value))
        throw new Error('SAVE_CORRUPT');
    if (value.schemaVersion !== 1)
        throw new Error('SAVE_VERSION_UNSUPPORTED');
    const fail = () => { throw new Error('SAVE_CORRUPT'); };
    if (!integer(value.coins, 0) || !integer(value.unlockedLevel, 1, levels_1.LEVELS.length) || !integer(value.runSerial, 0) || !Array.isArray(value.completed))
        fail();
    const completed = value.completed;
    if (completed.length > levels_1.LEVELS.length || completed.some((id, i) => id !== i + 1))
        fail();
    if (value.unlockedLevel !== Math.min(levels_1.LEVELS.length, completed.length + 1))
        fail();
    const run = value.current;
    if (run !== null) {
        if (!object(run) || !integer(run.levelId, 1, value.unlockedLevel) ||
            typeof run.runId !== 'string' || !/^run-[1-9]\d*-[0-9]+$/.test(run.runId) ||
            !integer(run.startedAt, 0, Number.MAX_SAFE_INTEGER) ||
            !integer(run.hearts, 0, 3) || !integer(run.moves, 0, 48) || !integer(run.collisions, 0) ||
            typeof run.usedHint !== 'boolean' || typeof run.revived !== 'boolean' ||
            !Array.isArray(run.remaining) || !Array.isArray(run.claimedRewardIds) ||
            !['playing', 'failed', 'won'].includes(String(run.status)) ||
            ![0, exports.ECONOMY.firstClear, exports.ECONOMY.firstClear + exports.ECONOMY.unassistedBonus].includes(run.earnedCoins))
            fail();
        const current = run;
        const level = (0, levels_1.getLevel)(current.levelId);
        if (current.runId !== `run-${value.runSerial}-${current.startedAt}` || value.runSerial === 0)
            fail();
        if (new Set(current.remaining).size !== current.remaining.length || current.remaining.some(id => typeof id !== 'string' || !level.arrows.some(a => a.id === id)))
            fail();
        if (current.moves !== level.arrows.length - current.remaining.length || (0, rules_1.solveLevel)(level, current.remaining) === null)
            fail();
        if (current.claimedRewardIds.length > 1 || current.claimedRewardIds.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)))
            fail();
        if (level.tutorial) {
            if (current.hearts !== 3 || current.revived)
                fail();
        }
        else {
            if (current.revived && current.collisions < 3)
                fail();
            if (current.hearts !== (current.revived ? 6 : 3) - current.collisions)
                fail();
        }
        if (current.status === 'won') {
            if (current.remaining.length !== 0 || current.hearts === 0 || !completed.includes(current.levelId) || current.hintId !== null)
                fail();
            if (current.earnedCoins === 25 && (current.usedHint || current.revived))
                fail();
        }
        else {
            if (!current.remaining.length || current.earnedCoins !== 0)
                fail();
            if (current.status === 'failed' && (level.tutorial || current.hearts !== 0))
                fail();
            if (current.status === 'playing' && current.hearts === 0)
                fail();
        }
        if (current.hintId !== null && (typeof current.hintId !== 'string' || !current.usedHint || !(0, rules_1.legalArrows)(level, current.remaining).some(a => a.id === current.hintId)))
            fail();
    }
    return clone(value);
}
class GameSession {
    constructor(options = {}) {
        this.inputLocked = false;
        this.state = options.save === undefined ? {
            schemaVersion: 1, coins: exports.ECONOMY.initialCoins, unlockedLevel: 1, completed: [], current: null, runSerial: 0,
        } : validateSave(options.save);
        this.now = options.now ?? Date.now;
        this.onChange = options.onChange;
    }
    getState() { return clone(this.state); }
    snapshot() { return this.getState(); }
    setInputLocked(locked) { this.inputLocked = locked; }
    commit(next, result) {
        // One persisted record contains both economy changes and reward receipts.
        // Persistence is synchronous, so a failed write cannot spend coins in memory.
        try {
            this.onChange?.(clone(next));
        }
        catch {
            return rejected('SAVE_WRITE_FAILED');
        }
        this.state = next;
        return result;
    }
    gate(status) {
        if (this.inputLocked)
            return rejected('BUSY');
        if (!this.state.current)
            return rejected('NO_ACTIVE_RUN');
        if (status && this.state.current.status !== status)
            return rejected('INVALID_RUN_STATE');
        return null;
    }
    startLevel(id) {
        if (this.inputLocked)
            return rejected('BUSY');
        if (!Number.isInteger(id) || id < 1 || id > this.state.unlockedLevel || id > levels_1.LEVELS.length)
            return rejected('LEVEL_LOCKED');
        const level = (0, levels_1.getLevel)(id);
        const next = clone(this.state);
        const startedAt = Math.max(0, Math.floor(this.now()));
        if (!Number.isSafeInteger(startedAt) || next.runSerial >= 1000000000)
            return rejected('INVALID_CLOCK');
        next.runSerial++;
        next.current = {
            runId: `run-${next.runSerial}-${startedAt}`, levelId: id, remaining: level.arrows.map(a => a.id), hearts: 3,
            status: 'playing', hintId: null, usedHint: false, revived: false, moves: 0, collisions: 0,
            startedAt, earnedCoins: 0, claimedRewardIds: [],
        };
        return this.commit(next, { ok: true, kind: 'start' });
    }
    restart() {
        if (!this.state.current)
            return this.startLevel(1);
        return this.startLevel(this.state.current.levelId);
    }
    nextLevel() {
        const stopped = this.gate('won');
        if (stopped)
            return stopped;
        const id = this.state.current.levelId + 1;
        if (id > levels_1.LEVELS.length)
            return rejected('ALL_LEVELS_COMPLETE');
        return this.startLevel(id);
    }
    tapArrow(id) {
        const stopped = this.gate('playing');
        if (stopped)
            return stopped;
        const run = this.state.current;
        if (!run.remaining.includes(id))
            return { ok: false, kind: 'noop', message: 'ARROW_NOT_PRESENT' };
        const level = (0, levels_1.getLevel)(run.levelId);
        const blocker = (0, rules_1.blockingArrow)(level, run.remaining, id);
        const next = clone(this.state);
        const current = next.current;
        if (blocker) {
            current.collisions++;
            if (!level.tutorial)
                current.hearts--;
            if (current.hearts <= 0)
                current.status = 'failed';
            return this.commit(next, { ok: false, kind: current.status === 'failed' ? 'failed' : 'blocked', arrowId: id, blockerId: blocker });
        }
        current.remaining = current.remaining.filter(arrowId => arrowId !== id);
        current.moves++;
        if (current.hintId === id)
            current.hintId = null;
        if (current.remaining.length)
            return this.commit(next, { ok: true, kind: 'removed', arrowId: id });
        current.status = 'won';
        current.hintId = null;
        const firstClear = !next.completed.includes(level.id);
        const earned = firstClear ? exports.ECONOMY.firstClear + (!current.usedHint && !current.revived ? exports.ECONOMY.unassistedBonus : 0) : 0;
        if (firstClear)
            next.completed.push(level.id);
        next.completed.sort((a, b) => a - b);
        next.unlockedLevel = Math.min(levels_1.LEVELS.length, next.completed.length + 1);
        next.coins += earned;
        current.earnedCoins = earned;
        return this.commit(next, { ok: true, kind: 'won', arrowId: id, coinsDelta: earned, firstClear });
    }
    hint() {
        const stopped = this.gate('playing');
        if (stopped)
            return stopped;
        const run = this.state.current;
        if (run.hintId)
            return { ok: true, kind: 'noop', arrowId: run.hintId, message: 'HINT_ALREADY_VISIBLE' };
        if (this.state.coins < exports.ECONOMY.hint)
            return rejected('NOT_ENOUGH_COINS');
        const next = clone(this.state);
        const arrow = (0, rules_1.legalArrows)((0, levels_1.getLevel)(run.levelId), run.remaining)[0];
        if (!arrow)
            return rejected('NO_LEGAL_MOVE');
        next.current.hintId = arrow.id;
        next.current.usedHint = true;
        next.coins -= exports.ECONOMY.hint;
        return this.commit(next, { ok: true, kind: 'hint', arrowId: arrow.id, coinsDelta: -exports.ECONOMY.hint });
    }
    clearHint() {
        const stopped = this.gate();
        if (stopped)
            return stopped;
        if (!this.state.current.hintId)
            return { ok: true, kind: 'noop' };
        const next = clone(this.state);
        next.current.hintId = null;
        return this.commit(next, { ok: true, kind: 'noop' });
    }
    revive() {
        const stopped = this.gate('failed');
        if (stopped)
            return stopped;
        if (this.state.current.revived)
            return rejected('REVIVE_ALREADY_USED');
        if (this.state.coins < exports.ECONOMY.revive)
            return rejected('NOT_ENOUGH_COINS');
        const next = clone(this.state);
        next.coins -= exports.ECONOMY.revive;
        next.current.hearts = 3;
        next.current.status = 'playing';
        next.current.revived = true;
        return this.commit(next, { ok: true, kind: 'revived', coinsDelta: -exports.ECONOMY.revive });
    }
    /** Internal hook for a verified platform completion. The prototype never calls it.
     * External adapter MUST enforce consent, compliance and session/time ad policy.
     */
    applyRewardedHelp(runId, attemptId, placement) {
        const stopped = this.gate();
        if (stopped)
            return stopped;
        const run = this.state.current;
        if (run.runId !== runId)
            return rejected('STALE_REWARD');
        if (!/^[a-zA-Z0-9_-]{1,100}$/.test(attemptId))
            return rejected('INVALID_REWARD_ID');
        if (run.claimedRewardIds.includes(attemptId))
            return rejected('REWARD_ALREADY_CLAIMED');
        if (run.claimedRewardIds.length)
            return rejected('ROUND_AD_LIMIT');
        if (placement !== 'hint' && placement !== 'revive')
            return rejected('INVALID_PLACEMENT');
        const next = clone(this.state);
        const current = next.current;
        let result;
        if (placement === 'hint') {
            if (current.status !== 'playing' || current.hintId)
                return rejected('INVALID_RUN_STATE');
            const arrow = (0, rules_1.legalArrows)((0, levels_1.getLevel)(current.levelId), current.remaining)[0];
            if (!arrow)
                return rejected('NO_LEGAL_MOVE');
            current.usedHint = true;
            current.hintId = arrow.id;
            result = { ok: true, kind: 'hint', arrowId: arrow.id, coinsDelta: 0 };
        }
        else {
            if (current.status !== 'failed' || current.revived)
                return rejected('INVALID_RUN_STATE');
            current.revived = true;
            current.hearts = 3;
            current.status = 'playing';
            result = { ok: true, kind: 'revived', coinsDelta: 0 };
        }
        current.claimedRewardIds.push(attemptId);
        return this.commit(next, result);
    }
}
exports.GameSession = GameSession;

},
"src/core/levels.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEVELS = void 0;
exports.getLevel = getLevel;
// Fixed, original boards constructed by reverse removal and checked by the solver.
// Positions are authored data: nothing random is generated during game startup.
exports.LEVELS = [
    { "id": 1, "title": "向外一步", "tip": "点击箭头，前方没有阻挡就能离开。", "width": 6, "height": 6, "arrows": [{ "id": "a1", "x": 2, "y": 2, "dir": "E", "length": 2 }, { "id": "a2", "x": 4, "y": 2, "dir": "N", "length": 2 }, { "id": "a3", "x": 1, "y": 4, "dir": "S", "length": 2 }, { "id": "a4", "x": 3, "y": 5, "dir": "E", "length": 2 }], "tutorial": true },
    { "id": 2, "title": "找到挡路者", "tip": "前两关点错不扣爱心，红色闪动会指出挡路者。", "width": 6, "height": 6, "arrows": [{ "id": "a1", "x": 1, "y": 1, "dir": "N", "length": 2 }, { "id": "a2", "x": 1, "y": 0, "dir": "E", "length": 2 }, { "id": "a3", "x": 4, "y": 1, "dir": "S", "length": 2 }, { "id": "a4", "x": 4, "y": 4, "dir": "E", "length": 2 }, { "id": "a5", "x": 5, "y": 4, "dir": "N", "length": 2 }, { "id": "a6", "x": 5, "y": 3, "dir": "E", "length": 2 }], "tutorial": true },
    { "id": 3, "title": "三颗爱心", "tip": "从这关开始，点到被挡住的箭头会失去一颗爱心。", "width": 6, "height": 6, "arrows": [{ "id": "a1", "x": 4, "y": 4, "dir": "W", "length": 2 }, { "id": "a2", "x": 2, "y": 3, "dir": "N", "length": 2 }, { "id": "a3", "x": 1, "y": 1, "dir": "W", "length": 2 }, { "id": "a4", "x": 0, "y": 2, "dir": "S", "length": 2 }, { "id": "a5", "x": 0, "y": 4, "dir": "S", "length": 2 }, { "id": "a6", "x": 2, "y": 5, "dir": "E", "length": 3 }, { "id": "a7", "x": 3, "y": 3, "dir": "N", "length": 3 }, { "id": "a8", "x": 3, "y": 0, "dir": "W", "length": 2 }], "tutorial": false },
    { "id": 4, "title": "顺着方向", "tip": "先看箭头尖端，再沿着它的方向找到边界。", "width": 6, "height": 6, "arrows": [{ "id": "a1", "x": 3, "y": 1, "dir": "S", "length": 2 }, { "id": "a2", "x": 2, "y": 3, "dir": "W", "length": 2 }, { "id": "a3", "x": 1, "y": 2, "dir": "N", "length": 3 }, { "id": "a4", "x": 1, "y": 1, "dir": "W", "length": 2 }, { "id": "a5", "x": 0, "y": 2, "dir": "S", "length": 2 }, { "id": "a6", "x": 2, "y": 5, "dir": "E", "length": 3 }, { "id": "a7", "x": 4, "y": 5, "dir": "E", "length": 2 }, { "id": "a8", "x": 5, "y": 5, "dir": "S", "length": 3 }, { "id": "a9", "x": 5, "y": 1, "dir": "N", "length": 2 }], "tutorial": false },
    { "id": 5, "title": "让出通道", "tip": "移走一支箭头，可能会让另一支箭头获得出口。", "width": 6, "height": 6, "arrows": [{ "id": "a1", "x": 3, "y": 3, "dir": "N", "length": 2 }, { "id": "a2", "x": 3, "y": 1, "dir": "N", "length": 2 }, { "id": "a3", "x": 3, "y": 0, "dir": "E", "length": 2 }, { "id": "a4", "x": 4, "y": 1, "dir": "S", "length": 2 }, { "id": "a5", "x": 4, "y": 5, "dir": "E", "length": 2 }, { "id": "a6", "x": 5, "y": 5, "dir": "S", "length": 3 }, { "id": "a7", "x": 1, "y": 1, "dir": "S", "length": 2 }, { "id": "a8", "x": 1, "y": 5, "dir": "W", "length": 2 }, { "id": "a9", "x": 0, "y": 3, "dir": "N", "length": 3 }, { "id": "a10", "x": 0, "y": 0, "dir": "W", "length": 1 }], "tutorial": false },
    { "id": 6, "title": "长短之间", "tip": "箭头的整个身体都会挡路，不只是箭头尖端。", "width": 6, "height": 6, "arrows": [{ "id": "a1", "x": 4, "y": 4, "dir": "W", "length": 2 }, { "id": "a2", "x": 3, "y": 4, "dir": "S", "length": 2 }, { "id": "a3", "x": 3, "y": 5, "dir": "W", "length": 2 }, { "id": "a4", "x": 2, "y": 4, "dir": "N", "length": 2 }, { "id": "a5", "x": 2, "y": 1, "dir": "W", "length": 2 }, { "id": "a6", "x": 1, "y": 1, "dir": "N", "length": 2 }, { "id": "a7", "x": 0, "y": 0, "dir": "W", "length": 2 }, { "id": "a8", "x": 0, "y": 4, "dir": "S", "length": 2 }, { "id": "a9", "x": 3, "y": 0, "dir": "E", "length": 2 }, { "id": "a10", "x": 4, "y": 0, "dir": "N", "length": 1 }, { "id": "a11", "x": 0, "y": 5, "dir": "W", "length": 2 }], "tutorial": false },
    { "id": 7, "title": "换个角度", "tip": "从四周找出口，再回头看中间的箭头。", "width": 6, "height": 6, "arrows": [{ "id": "a1", "x": 4, "y": 3, "dir": "E", "length": 2 }, { "id": "a2", "x": 5, "y": 3, "dir": "N", "length": 2 }, { "id": "a3", "x": 4, "y": 2, "dir": "W", "length": 2 }, { "id": "a4", "x": 2, "y": 2, "dir": "S", "length": 2 }, { "id": "a5", "x": 1, "y": 3, "dir": "W", "length": 2 }, { "id": "a6", "x": 0, "y": 4, "dir": "S", "length": 2 }, { "id": "a7", "x": 2, "y": 5, "dir": "E", "length": 3 }, { "id": "a8", "x": 4, "y": 5, "dir": "S", "length": 2 }, { "id": "a9", "x": 2, "y": 0, "dir": "E", "length": 2 }, { "id": "a10", "x": 4, "y": 0, "dir": "N", "length": 2 }, { "id": "a11", "x": 0, "y": 2, "dir": "W", "length": 2 }, { "id": "a12", "x": 5, "y": 0, "dir": "N", "length": 2 }], "tutorial": false },
    { "id": 8, "title": "一格之差", "tip": "留意长箭头的尾部，那里也可能挡住邻居。", "width": 6, "height": 6, "arrows": [{ "id": "a1", "x": 2, "y": 4, "dir": "N", "length": 2 }, { "id": "a2", "x": 2, "y": 1, "dir": "E", "length": 2 }, { "id": "a3", "x": 3, "y": 2, "dir": "S", "length": 2 }, { "id": "a4", "x": 4, "y": 5, "dir": "E", "length": 2 }, { "id": "a5", "x": 5, "y": 4, "dir": "N", "length": 2 }, { "id": "a6", "x": 5, "y": 1, "dir": "N", "length": 2 }, { "id": "a7", "x": 4, "y": 0, "dir": "W", "length": 2 }, { "id": "a8", "x": 0, "y": 0, "dir": "N", "length": 3 }, { "id": "a9", "x": 3, "y": 3, "dir": "E", "length": 2 }, { "id": "a10", "x": 4, "y": 3, "dir": "E", "length": 1 }, { "id": "a11", "x": 0, "y": 3, "dir": "W", "length": 2 }, { "id": "a12", "x": 1, "y": 5, "dir": "S", "length": 2 }, { "id": "a13", "x": 5, "y": 3, "dir": "E", "length": 1 }], "tutorial": false },
    { "id": 9, "title": "安静观察", "tip": "没有倒计时，想清楚再点也来得及。", "width": 6, "height": 6, "arrows": [{ "id": "a1", "x": 4, "y": 5, "dir": "E", "length": 2 }, { "id": "a2", "x": 5, "y": 3, "dir": "N", "length": 3 }, { "id": "a3", "x": 4, "y": 0, "dir": "W", "length": 2 }, { "id": "a4", "x": 2, "y": 0, "dir": "W", "length": 2 }, { "id": "a5", "x": 1, "y": 1, "dir": "S", "length": 2 }, { "id": "a6", "x": 1, "y": 2, "dir": "E", "length": 2 }, { "id": "a7", "x": 3, "y": 2, "dir": "E", "length": 2 }, { "id": "a8", "x": 5, "y": 2, "dir": "E", "length": 2 }, { "id": "a9", "x": 1, "y": 3, "dir": "W", "length": 2 }, { "id": "a10", "x": 0, "y": 0, "dir": "N", "length": 2 }, { "id": "a11", "x": 0, "y": 5, "dir": "S", "length": 3 }, { "id": "a12", "x": 2, "y": 5, "dir": "S", "length": 2 }, { "id": "a13", "x": 5, "y": 1, "dir": "E", "length": 2 }, { "id": "a14", "x": 1, "y": 5, "dir": "S", "length": 2 }], "tutorial": false },
    { "id": 10, "title": "半程小歇", "tip": "一次只移走一支，慢慢把棋盘变清爽。", "width": 6, "height": 6, "arrows": [{ "id": "a1", "x": 3, "y": 0, "dir": "N", "length": 2 }, { "id": "a2", "x": 2, "y": 4, "dir": "N", "length": 2 }, { "id": "a3", "x": 2, "y": 1, "dir": "N", "length": 2 }, { "id": "a4", "x": 1, "y": 0, "dir": "W", "length": 2 }, { "id": "a5", "x": 3, "y": 4, "dir": "S", "length": 2 }, { "id": "a6", "x": 0, "y": 2, "dir": "S", "length": 3 }, { "id": "a7", "x": 0, "y": 5, "dir": "W", "length": 2 }, { "id": "a8", "x": 4, "y": 2, "dir": "E", "length": 2 }, { "id": "a9", "x": 5, "y": 1, "dir": "N", "length": 3 }, { "id": "a10", "x": 5, "y": 0, "dir": "E", "length": 2 }, { "id": "a11", "x": 5, "y": 5, "dir": "E", "length": 3 }, { "id": "a12", "x": 0, "y": 4, "dir": "W", "length": 2 }, { "id": "a13", "x": 1, "y": 3, "dir": "W", "length": 2 }, { "id": "a14", "x": 5, "y": 4, "dir": "E", "length": 2 }], "tutorial": false },
    { "id": 11, "title": "交错的线", "tip": "箭头不会转弯，只能沿着尖端方向离开。", "width": 6, "height": 6, "arrows": [{ "id": "a1", "x": 4, "y": 3, "dir": "E", "length": 2 }, { "id": "a2", "x": 5, "y": 4, "dir": "S", "length": 2 }, { "id": "a3", "x": 5, "y": 5, "dir": "E", "length": 2 }, { "id": "a4", "x": 1, "y": 1, "dir": "W", "length": 2 }, { "id": "a5", "x": 0, "y": 1, "dir": "S", "length": 2 }, { "id": "a6", "x": 0, "y": 4, "dir": "S", "length": 2 }, { "id": "a7", "x": 0, "y": 5, "dir": "W", "length": 2 }, { "id": "a8", "x": 1, "y": 2, "dir": "E", "length": 2 }, { "id": "a9", "x": 3, "y": 2, "dir": "E", "length": 2 }, { "id": "a10", "x": 4, "y": 1, "dir": "N", "length": 2 }, { "id": "a11", "x": 4, "y": 0, "dir": "E", "length": 3 }, { "id": "a12", "x": 5, "y": 0, "dir": "N", "length": 3 }, { "id": "a13", "x": 3, "y": 5, "dir": "S", "length": 2 }, { "id": "a14", "x": 2, "y": 5, "dir": "S", "length": 2 }, { "id": "a15", "x": 1, "y": 0, "dir": "N", "length": 1 }], "tutorial": false },
    { "id": 12, "title": "留一点空白", "tip": "先处理能出界的箭头，中间会逐渐变得清楚。", "width": 6, "height": 6, "arrows": [{ "id": "a1", "x": 4, "y": 2, "dir": "E", "length": 2 }, { "id": "a2", "x": 5, "y": 3, "dir": "S", "length": 2 }, { "id": "a3", "x": 5, "y": 4, "dir": "E", "length": 2 }, { "id": "a4", "x": 1, "y": 3, "dir": "W", "length": 2 }, { "id": "a5", "x": 0, "y": 4, "dir": "S", "length": 2 }, { "id": "a6", "x": 1, "y": 5, "dir": "E", "length": 2 }, { "id": "a7", "x": 2, "y": 5, "dir": "S", "length": 2 }, { "id": "a8", "x": 4, "y": 0, "dir": "W", "length": 2 }, { "id": "a9", "x": 2, "y": 0, "dir": "W", "length": 2 }, { "id": "a10", "x": 0, "y": 0, "dir": "W", "length": 2 }, { "id": "a11", "x": 4, "y": 1, "dir": "E", "length": 2 }, { "id": "a12", "x": 5, "y": 1, "dir": "E", "length": 1 }, { "id": "a13", "x": 3, "y": 4, "dir": "S", "length": 2 }, { "id": "a14", "x": 5, "y": 5, "dir": "E", "length": 3 }, { "id": "a15", "x": 0, "y": 2, "dir": "W", "length": 2 }], "tutorial": false },
    { "id": 13, "title": "再看一行", "tip": "棋盘变高了，别漏掉最下方的通道。", "width": 6, "height": 7, "arrows": [{ "id": "a1", "x": 2, "y": 4, "dir": "S", "length": 2 }, { "id": "a2", "x": 2, "y": 6, "dir": "E", "length": 2 }, { "id": "a3", "x": 3, "y": 5, "dir": "N", "length": 2 }, { "id": "a4", "x": 4, "y": 4, "dir": "E", "length": 2 }, { "id": "a5", "x": 5, "y": 5, "dir": "S", "length": 3 }, { "id": "a6", "x": 5, "y": 6, "dir": "E", "length": 1 }, { "id": "a7", "x": 1, "y": 4, "dir": "N", "length": 2 }, { "id": "a8", "x": 1, "y": 1, "dir": "W", "length": 2 }, { "id": "a9", "x": 0, "y": 1, "dir": "S", "length": 2 }, { "id": "a10", "x": 0, "y": 4, "dir": "S", "length": 2 }, { "id": "a11", "x": 0, "y": 6, "dir": "S", "length": 2 }, { "id": "a12", "x": 4, "y": 0, "dir": "E", "length": 2 }, { "id": "a13", "x": 5, "y": 0, "dir": "N", "length": 2 }, { "id": "a14", "x": 1, "y": 2, "dir": "W", "length": 2 }, { "id": "a15", "x": 0, "y": 2, "dir": "W", "length": 1 }, { "id": "a16", "x": 5, "y": 2, "dir": "E", "length": 3 }], "tutorial": false },
    { "id": 14, "title": "错落有序", "tip": "被挡住的箭头不需要硬点，先移开挡路者。", "width": 6, "height": 7, "arrows": [{ "id": "a1", "x": 0, "y": 4, "dir": "N", "length": 2 }, { "id": "a2", "x": 0, "y": 2, "dir": "W", "length": 2 }, { "id": "a3", "x": 4, "y": 1, "dir": "N", "length": 2 }, { "id": "a4", "x": 4, "y": 0, "dir": "W", "length": 2 }, { "id": "a5", "x": 2, "y": 0, "dir": "W", "length": 2 }, { "id": "a6", "x": 4, "y": 3, "dir": "E", "length": 2 }, { "id": "a7", "x": 0, "y": 0, "dir": "N", "length": 1 }, { "id": "a8", "x": 5, "y": 4, "dir": "S", "length": 3 }, { "id": "a9", "x": 5, "y": 6, "dir": "S", "length": 2 }, { "id": "a10", "x": 1, "y": 1, "dir": "W", "length": 2 }, { "id": "a11", "x": 1, "y": 3, "dir": "W", "length": 2 }, { "id": "a12", "x": 0, "y": 1, "dir": "W", "length": 1 }, { "id": "a13", "x": 4, "y": 5, "dir": "S", "length": 2 }, { "id": "a14", "x": 0, "y": 3, "dir": "W", "length": 1 }, { "id": "a15", "x": 2, "y": 6, "dir": "W", "length": 3 }, { "id": "a16", "x": 1, "y": 6, "dir": "S", "length": 3 }, { "id": "a17", "x": 1, "y": 0, "dir": "N", "length": 1 }], "tutorial": false },
    { "id": 15, "title": "细看尾端", "tip": "长箭头占据多格，仔细观察它的每一段。", "width": 6, "height": 7, "arrows": [{ "id": "a1", "x": 1, "y": 3, "dir": "N", "length": 2 }, { "id": "a2", "x": 2, "y": 2, "dir": "E", "length": 2 }, { "id": "a3", "x": 4, "y": 2, "dir": "E", "length": 2 }, { "id": "a4", "x": 5, "y": 0, "dir": "N", "length": 3 }, { "id": "a5", "x": 4, "y": 5, "dir": "W", "length": 2 }, { "id": "a6", "x": 2, "y": 5, "dir": "S", "length": 3 }, { "id": "a7", "x": 2, "y": 6, "dir": "E", "length": 2 }, { "id": "a8", "x": 3, "y": 6, "dir": "S", "length": 2 }, { "id": "a9", "x": 1, "y": 1, "dir": "W", "length": 2 }, { "id": "a10", "x": 0, "y": 1, "dir": "N", "length": 2 }, { "id": "a11", "x": 0, "y": 0, "dir": "W", "length": 2 }, { "id": "a12", "x": 3, "y": 0, "dir": "N", "length": 2 }, { "id": "a13", "x": 0, "y": 6, "dir": "S", "length": 2 }, { "id": "a14", "x": 4, "y": 3, "dir": "E", "length": 2 }, { "id": "a15", "x": 4, "y": 4, "dir": "E", "length": 2 }, { "id": "a16", "x": 5, "y": 3, "dir": "E", "length": 1 }, { "id": "a17", "x": 2, "y": 0, "dir": "N", "length": 1 }, { "id": "a18", "x": 5, "y": 4, "dir": "E", "length": 1 }], "tutorial": false },
    { "id": 16, "title": "留心远处", "tip": "挡路者可能离得很远，沿整条出界路线检查。", "width": 6, "height": 7, "arrows": [{ "id": "a1", "x": 4, "y": 5, "dir": "S", "length": 2 }, { "id": "a2", "x": 3, "y": 6, "dir": "W", "length": 3 }, { "id": "a3", "x": 1, "y": 6, "dir": "S", "length": 2 }, { "id": "a4", "x": 3, "y": 3, "dir": "W", "length": 2 }, { "id": "a5", "x": 1, "y": 3, "dir": "W", "length": 2 }, { "id": "a6", "x": 0, "y": 2, "dir": "N", "length": 2 }, { "id": "a7", "x": 1, "y": 0, "dir": "E", "length": 2 }, { "id": "a8", "x": 5, "y": 0, "dir": "N", "length": 2 }, { "id": "a9", "x": 2, "y": 1, "dir": "N", "length": 2 }, { "id": "a10", "x": 2, "y": 4, "dir": "W", "length": 2 }, { "id": "a11", "x": 0, "y": 5, "dir": "S", "length": 2 }, { "id": "a12", "x": 2, "y": 0, "dir": "N", "length": 1 }, { "id": "a13", "x": 5, "y": 2, "dir": "E", "length": 2 }, { "id": "a14", "x": 0, "y": 1, "dir": "W", "length": 2 }, { "id": "a15", "x": 0, "y": 6, "dir": "W", "length": 1 }, { "id": "a16", "x": 2, "y": 6, "dir": "S", "length": 2 }, { "id": "a17", "x": 4, "y": 0, "dir": "N", "length": 2 }, { "id": "a18", "x": 3, "y": 1, "dir": "N", "length": 2 }, { "id": "a19", "x": 3, "y": 0, "dir": "N", "length": 1 }], "tutorial": false },
    { "id": 17, "title": "新的纵深", "tip": "这次是八行棋盘，先找最容易确认的出口。", "width": 6, "height": 8, "arrows": [{ "id": "a1", "x": 4, "y": 4, "dir": "E", "length": 2 }, { "id": "a2", "x": 5, "y": 3, "dir": "N", "length": 2 }, { "id": "a3", "x": 3, "y": 1, "dir": "W", "length": 3 }, { "id": "a4", "x": 2, "y": 2, "dir": "S", "length": 2 }, { "id": "a5", "x": 1, "y": 6, "dir": "W", "length": 2 }, { "id": "a6", "x": 0, "y": 5, "dir": "N", "length": 2 }, { "id": "a7", "x": 0, "y": 1, "dir": "N", "length": 2 }, { "id": "a8", "x": 1, "y": 0, "dir": "E", "length": 2 }, { "id": "a9", "x": 4, "y": 0, "dir": "E", "length": 3 }, { "id": "a10", "x": 0, "y": 3, "dir": "W", "length": 2 }, { "id": "a11", "x": 5, "y": 0, "dir": "N", "length": 1 }, { "id": "a12", "x": 1, "y": 7, "dir": "W", "length": 2 }, { "id": "a13", "x": 4, "y": 2, "dir": "E", "length": 2 }, { "id": "a14", "x": 0, "y": 7, "dir": "S", "length": 1 }, { "id": "a15", "x": 5, "y": 2, "dir": "E", "length": 1 }, { "id": "a16", "x": 5, "y": 6, "dir": "E", "length": 2 }, { "id": "a17", "x": 2, "y": 5, "dir": "E", "length": 2 }, { "id": "a18", "x": 3, "y": 7, "dir": "S", "length": 3 }, { "id": "a19", "x": 5, "y": 5, "dir": "E", "length": 2 }, { "id": "a20", "x": 1, "y": 4, "dir": "W", "length": 2 }], "tutorial": false },
    { "id": 18, "title": "逐个清空", "tip": "提示会标出一支可移动箭头，不会替你移走。", "width": 6, "height": 8, "arrows": [{ "id": "a1", "x": 0, "y": 2, "dir": "S", "length": 2 }, { "id": "a2", "x": 0, "y": 7, "dir": "W", "length": 2 }, { "id": "a3", "x": 2, "y": 4, "dir": "S", "length": 2 }, { "id": "a4", "x": 2, "y": 6, "dir": "E", "length": 2 }, { "id": "a5", "x": 5, "y": 5, "dir": "N", "length": 2 }, { "id": "a6", "x": 5, "y": 1, "dir": "N", "length": 2 }, { "id": "a7", "x": 5, "y": 0, "dir": "E", "length": 2 }, { "id": "a8", "x": 4, "y": 3, "dir": "S", "length": 2 }, { "id": "a9", "x": 5, "y": 4, "dir": "E", "length": 2 }, { "id": "a10", "x": 3, "y": 2, "dir": "S", "length": 2 }, { "id": "a11", "x": 3, "y": 5, "dir": "S", "length": 2 }, { "id": "a12", "x": 3, "y": 7, "dir": "S", "length": 2 }, { "id": "a13", "x": 1, "y": 1, "dir": "N", "length": 2 }, { "id": "a14", "x": 1, "y": 0, "dir": "W", "length": 3 }, { "id": "a15", "x": 0, "y": 0, "dir": "W", "length": 1 }, { "id": "a16", "x": 4, "y": 6, "dir": "S", "length": 2 }, { "id": "a17", "x": 0, "y": 3, "dir": "W", "length": 2 }, { "id": "a18", "x": 0, "y": 5, "dir": "W", "length": 2 }, { "id": "a19", "x": 0, "y": 4, "dir": "W", "length": 2 }, { "id": "a20", "x": 4, "y": 7, "dir": "E", "length": 1 }, { "id": "a21", "x": 5, "y": 7, "dir": "E", "length": 1 }, { "id": "a22", "x": 0, "y": 6, "dir": "W", "length": 1 }], "tutorial": false },
    { "id": 19, "title": "最后几步", "tip": "每次成功移除都会减少阻挡，继续从边缘观察。", "width": 6, "height": 8, "arrows": [{ "id": "a1", "x": 3, "y": 7, "dir": "W", "length": 2 }, { "id": "a2", "x": 0, "y": 6, "dir": "N", "length": 2 }, { "id": "a3", "x": 0, "y": 2, "dir": "W", "length": 2 }, { "id": "a4", "x": 4, "y": 6, "dir": "E", "length": 2 }, { "id": "a5", "x": 5, "y": 7, "dir": "S", "length": 2 }, { "id": "a6", "x": 3, "y": 2, "dir": "N", "length": 2 }, { "id": "a7", "x": 2, "y": 1, "dir": "W", "length": 2 }, { "id": "a8", "x": 0, "y": 0, "dir": "N", "length": 2 }, { "id": "a9", "x": 1, "y": 7, "dir": "S", "length": 2 }, { "id": "a10", "x": 2, "y": 5, "dir": "E", "length": 2 }, { "id": "a11", "x": 5, "y": 4, "dir": "N", "length": 2 }, { "id": "a12", "x": 5, "y": 1, "dir": "N", "length": 3 }, { "id": "a13", "x": 5, "y": 0, "dir": "E", "length": 2 }, { "id": "a14", "x": 1, "y": 0, "dir": "N", "length": 2 }, { "id": "a15", "x": 2, "y": 4, "dir": "W", "length": 2 }, { "id": "a16", "x": 1, "y": 4, "dir": "W", "length": 1 }, { "id": "a17", "x": 0, "y": 5, "dir": "W", "length": 1 }, { "id": "a18", "x": 2, "y": 7, "dir": "S", "length": 2 }, { "id": "a19", "x": 0, "y": 4, "dir": "W", "length": 1 }, { "id": "a20", "x": 1, "y": 3, "dir": "W", "length": 2 }, { "id": "a21", "x": 0, "y": 3, "dir": "W", "length": 1 }, { "id": "a22", "x": 3, "y": 0, "dir": "N", "length": 1 }, { "id": "a23", "x": 2, "y": 0, "dir": "N", "length": 1 }], "tutorial": false },
    { "id": 20, "title": "清爽收官", "tip": "不必追赶时间，用自己的节奏完成这一局。", "width": 6, "height": 8, "arrows": [{ "id": "a1", "x": 4, "y": 6, "dir": "N", "length": 2 }, { "id": "a2", "x": 4, "y": 2, "dir": "W", "length": 2 }, { "id": "a3", "x": 0, "y": 2, "dir": "S", "length": 2 }, { "id": "a4", "x": 1, "y": 5, "dir": "E", "length": 2 }, { "id": "a5", "x": 5, "y": 5, "dir": "E", "length": 3 }, { "id": "a6", "x": 1, "y": 1, "dir": "N", "length": 2 }, { "id": "a7", "x": 0, "y": 0, "dir": "W", "length": 3 }, { "id": "a8", "x": 4, "y": 3, "dir": "E", "length": 2 }, { "id": "a9", "x": 3, "y": 4, "dir": "W", "length": 2 }, { "id": "a10", "x": 1, "y": 4, "dir": "W", "length": 2 }, { "id": "a11", "x": 5, "y": 3, "dir": "E", "length": 1 }, { "id": "a12", "x": 4, "y": 1, "dir": "E", "length": 2 }, { "id": "a13", "x": 5, "y": 0, "dir": "N", "length": 2 }, { "id": "a14", "x": 1, "y": 6, "dir": "W", "length": 2 }, { "id": "a15", "x": 5, "y": 7, "dir": "S", "length": 2 }, { "id": "a16", "x": 0, "y": 4, "dir": "W", "length": 1 }, { "id": "a17", "x": 0, "y": 7, "dir": "S", "length": 2 }, { "id": "a18", "x": 1, "y": 3, "dir": "W", "length": 2 }, { "id": "a19", "x": 0, "y": 3, "dir": "W", "length": 1 }, { "id": "a20", "x": 2, "y": 7, "dir": "S", "length": 1 }, { "id": "a21", "x": 3, "y": 7, "dir": "S", "length": 2 }, { "id": "a22", "x": 1, "y": 7, "dir": "S", "length": 1 }, { "id": "a23", "x": 4, "y": 0, "dir": "N", "length": 1 }, { "id": "a24", "x": 5, "y": 4, "dir": "E", "length": 1 }], "tutorial": false },
];
function getLevel(id) {
    const level = exports.LEVELS.find(item => item.id === id);
    if (!level)
        throw new Error('LEVEL_NOT_FOUND');
    return level;
}

},
"src/core/rules.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIRECTIONS = void 0;
exports.arrowCells = arrowCells;
exports.blockingArrow = blockingArrow;
exports.legalArrows = legalArrows;
exports.solveLevel = solveLevel;
exports.validateLevel = validateLevel;
exports.DIRECTIONS = {
    N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, W: { x: -1, y: 0 },
};
function arrowCells(arrow) {
    const d = exports.DIRECTIONS[arrow.dir];
    if (!d)
        return [];
    return Array.from({ length: arrow.length }, (_, n) => ({ x: arrow.x - d.x * n, y: arrow.y - d.y * n }));
}
/** The first other arrow encountered along the head's ray, or null if clear. */
function blockingArrow(level, remaining, arrowId) {
    const arrow = level.arrows.find(a => a.id === arrowId);
    if (!arrow || !remaining.includes(arrowId))
        return null;
    const live = new Set(remaining);
    const occupied = new Map();
    for (const item of level.arrows) {
        if (!live.has(item.id) || item.id === arrowId)
            continue;
        for (const cell of arrowCells(item))
            occupied.set(`${cell.x},${cell.y}`, item.id);
    }
    const d = exports.DIRECTIONS[arrow.dir];
    let x = arrow.x + d.x;
    let y = arrow.y + d.y;
    while (x >= 0 && y >= 0 && x < level.width && y < level.height) {
        const blocker = occupied.get(`${x},${y}`);
        if (blocker)
            return blocker;
        x += d.x;
        y += d.y;
    }
    return null;
}
function legalArrows(level, remaining) {
    const live = new Set(remaining);
    return level.arrows.filter(a => live.has(a.id) && blockingArrow(level, remaining, a.id) === null);
}
/** Removal is monotonic: removing any legal arrow cannot block another arrow. */
function solveLevel(level, initial) {
    let remaining = initial ? [...initial] : level.arrows.map(a => a.id);
    const solution = [];
    if (new Set(remaining).size !== remaining.length || remaining.some(id => !level.arrows.some(a => a.id === id)))
        return null;
    while (remaining.length) {
        const next = legalArrows(level, remaining)[0];
        if (!next)
            return null;
        solution.push(next.id);
        remaining = remaining.filter(id => id !== next.id);
    }
    return solution;
}
function validateLevel(level) {
    const errors = [];
    if (!Number.isInteger(level.id) || level.id < 1)
        errors.push('Invalid level id');
    if (level.width !== 6 || !Number.isInteger(level.height) || level.height < 6 || level.height > 8)
        errors.push('Board must be 6 by 6..8');
    if (!level.title || !level.tip || !Array.isArray(level.arrows) || !level.arrows.length)
        errors.push('Missing level content');
    if (errors.length)
        return errors;
    const ids = new Set();
    const occupied = new Set();
    for (const arrow of level.arrows) {
        if (!arrow.id || ids.has(arrow.id))
            errors.push(`Duplicate or empty arrow id: ${arrow.id}`);
        ids.add(arrow.id);
        if (!exports.DIRECTIONS[arrow.dir]) {
            errors.push(`Invalid direction: ${arrow.id}`);
            continue;
        }
        if (![1, 2, 3].includes(arrow.length) || !Number.isInteger(arrow.x) || !Number.isInteger(arrow.y)) {
            errors.push(`Invalid arrow geometry: ${arrow.id}`);
            continue;
        }
        for (const cell of arrowCells(arrow)) {
            if (cell.x < 0 || cell.y < 0 || cell.x >= level.width || cell.y >= level.height)
                errors.push(`Out of bounds: ${arrow.id}`);
            const key = `${cell.x},${cell.y}`;
            if (occupied.has(key))
                errors.push(`Overlapping cell: ${key}`);
            occupied.add(key);
        }
    }
    if (!errors.length && solveLevel(level) === null)
        errors.push('Unsolvable board');
    return errors;
}

},
"src/view/GameController.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameController = void 0;
const levels_1 = require("src/core/levels.js");
const GameView_1 = require("src/view/GameView.js");
const render_1 = require("src/view/render.js");
class GameController {
    constructor(options) {
        this.visible = true;
        this.messageRemaining = 0;
        this.animationTime = 0;
        this.clockSaveElapsed = 0;
        this.pendingLevel = null;
        this.revision = 1;
        this.options = options;
        this.session = options.session;
        this.clock = options.clockState ?? { playedSeconds: 0, restUntil: 0, reminderShown: false };
        this.view = { page: 'home', modal: null, preferences: options.preferences ?? { sound: false, vibration: true, reducedMotion: false }, message: '', blockedId: null, motion: null, inputLocked: false, restSeconds: Math.max(0, (this.clock.restUntil - Date.now()) / 1000), restNotice: false, capabilities: options.capabilities ?? { sound: true, vibration: true } };
    }
    get currentSession() { return this.session; }
    frame() { return (0, GameView_1.renderGame)({ ...this.view, state: this.session.getState(), canReset: !!this.options.onReset }); }
    snapshot() { return { page: this.view.page, modal: this.view.modal, inputLocked: this.view.inputLocked, state: this.session.getState(), clock: { ...this.clock } }; }
    changed() { this.revision++; }
    feedback(kind) { try {
        this.options.onFeedback?.(kind);
    }
    catch { /* Optional feedback must not interrupt a committed move. */ } }
    notice(message) { this.view.message = message; this.messageRemaining = 3; this.changed(); }
    result(result) {
        if (!result.ok && result.kind === 'rejected') {
            const msg = result.message ?? '';
            this.notice(msg.includes('SAVE') ? '进度未能保存，请检查本机存储。' : msg.includes('COIN') || msg.includes('coin') ? '金币不足，可以免费重新开始。' : msg.includes('HINT') ? '已经为你标出一支可离开的箭头。' : '暂时不能这样操作，再试一次。');
            return false;
        }
        this.changed();
        return result.ok;
    }
    tap(x, y) {
        if (this.view.inputLocked || this.view.restSeconds > 0)
            return;
        const hit = (0, render_1.hitTest)(this.frame(), x, y);
        if (hit)
            this.action(hit.action);
    }
    action(action) {
        if (this.view.inputLocked || this.view.restSeconds > 0)
            return;
        const run = this.session.getState().current;
        switch (action.type) {
            case 'continue': {
                if (!run || run.status === 'won') {
                    const state = this.session.getState();
                    const next = state.completed.length === 20 ? 1 : state.unlockedLevel;
                    if (!this.result(this.session.startLevel(next)))
                        return;
                }
                this.view.page = 'play';
                this.view.modal = null;
                break;
            }
            case 'home':
                this.view.page = 'home';
                this.view.modal = null;
                break;
            case 'levels':
                this.view.page = 'levels';
                this.view.modal = null;
                break;
            case 'level': {
                const id = Number(action.value);
                const hasProgress = run && (run.moves > 0 || run.collisions > 0 || run.usedHint || run.revived);
                if (run && run.status !== 'won' && hasProgress && id !== run.levelId) {
                    this.pendingLevel = id;
                    this.view.modal = 'switchlevel';
                    break;
                }
                if (run && run.status !== 'won' && id === run.levelId) {
                    this.view.page = 'play';
                    this.view.modal = null;
                    break;
                }
                if (this.result(this.session.startLevel(id))) {
                    this.view.page = 'play';
                    this.view.modal = null;
                }
                break;
            }
            case 'switchlevel':
                if (this.pendingLevel !== null && this.result(this.session.startLevel(this.pendingLevel))) {
                    this.view.page = 'play';
                    this.view.modal = null;
                    this.pendingLevel = null;
                }
                break;
            case 'next':
                if (this.result(this.session.nextLevel())) {
                    this.view.page = 'play';
                    this.view.modal = null;
                }
                break;
            case 'modal':
                this.view.modal = action.value;
                break;
            case 'close':
                this.view.modal = null;
                break;
            case 'restart':
                if (this.result(this.session.restart())) {
                    this.view.page = 'play';
                    this.view.modal = null;
                    this.view.message = '';
                    this.view.blockedId = null;
                }
                break;
            case 'hint': {
                // The core recognizes an already-visible hint before checking its price.
                if (this.result(this.session.hint()))
                    this.notice('金色箭头前方畅通，试着点一下。');
                break;
            }
            case 'revive':
                if (this.result(this.session.revive())) {
                    this.view.modal = null;
                    this.notice('机会恢复了，棋盘还是刚才的样子。');
                }
                break;
            case 'arrow': {
                if (!run)
                    return;
                const a = (0, levels_1.getLevel)(run.levelId).arrows.find(v => v.id === action.value);
                if (!a)
                    return;
                const result = this.session.tapArrow(String(action.value));
                if (result.kind === 'blocked' || result.kind === 'failed') {
                    this.view.blockedId = result.blockerId ?? null;
                    this.notice((0, levels_1.getLevel)(run.levelId).tutorial ? '红色箭头挡住了前方，先试试别的方向。' : '前方被挡住了。先移开红色箭头。');
                    this.feedback('blocked');
                }
                else if (result.kind === 'removed' || result.kind === 'won') {
                    this.view.blockedId = null;
                    this.view.message = '';
                    if (!this.view.preferences.reducedMotion) {
                        this.view.motion = { arrow: a, progress: 0 };
                        this.view.inputLocked = true;
                        this.animationTime = 0;
                        this.session.setInputLocked(true);
                    }
                    this.feedback(result.kind === 'won' ? 'win' : 'remove');
                }
                else
                    this.result(result);
                break;
            }
            case 'toggle': {
                const key = action.value;
                if (!['sound', 'vibration', 'reducedMotion'].includes(key))
                    return;
                const next = { ...this.view.preferences, [key]: !this.view.preferences[key] };
                try {
                    this.options.onPreferences?.(next);
                    this.view.preferences = next;
                }
                catch {
                    this.notice('设置未能保存，请稍后重试。');
                }
                break;
            }
            case 'reset': {
                if (!this.options.onReset)
                    return;
                try {
                    this.session = this.options.onReset();
                    this.view.page = 'home';
                    this.view.modal = null;
                    this.view.message = '';
                    this.view.blockedId = null;
                }
                catch {
                    this.notice('清除失败，原有进度已保留。');
                }
                break;
            }
            default: return;
        }
        this.changed();
    }
    update(dtSeconds) {
        if (!Number.isFinite(dtSeconds) || dtSeconds < 0)
            return;
        const dt = Math.min(dtSeconds, 1);
        if (this.clock.restUntil > 0) {
            const remaining = Math.max(0, (this.clock.restUntil - Date.now()) / 1000);
            if (Math.ceil(remaining) !== Math.ceil(this.view.restSeconds)) {
                this.view.restSeconds = remaining;
                this.changed();
            }
            if (remaining === 0) {
                this.clock = { playedSeconds: 0, restUntil: 0, reminderShown: false };
                this.view.restSeconds = 0;
                this.saveClock();
                this.changed();
            }
            return;
        }
        if (!this.visible)
            return;
        if (this.view.motion) {
            this.animationTime += dt;
            this.view.motion.progress = Math.min(1, this.animationTime / .30);
            this.changed();
            if (this.animationTime >= .30) {
                this.view.motion = null;
                this.view.inputLocked = false;
                this.session.setInputLocked(false);
            }
        }
        if (this.messageRemaining > 0) {
            this.messageRemaining -= dt;
            if (this.messageRemaining <= 0) {
                this.view.message = '';
                this.view.blockedId = null;
                this.changed();
            }
        }
        if (this.view.page === 'play' && !this.view.modal && this.session.getState().current?.status === 'playing') {
            this.clock.playedSeconds += dt;
            this.clockSaveElapsed += dt;
            if (this.clock.playedSeconds >= 1800) {
                this.clock.restUntil = Date.now() + 600000;
                this.view.restSeconds = 600;
                this.saveClock();
                this.changed();
            }
            else if (this.clock.playedSeconds >= 1200 && !this.clock.reminderShown) {
                this.clock.reminderShown = true;
                this.view.modal = 'reminder';
                this.saveClock();
                this.changed();
            }
            else if (this.clockSaveElapsed >= 5)
                this.saveClock();
        }
    }
    saveClock() { this.clockSaveElapsed = 0; try {
        this.options.onClockState?.({ ...this.clock });
    }
    catch {
        this.notice('休息记录未能保存。');
    } }
    setVisible(visible) { this.visible = visible; if (!visible)
        this.saveClock(); }
}
exports.GameController = GameController;

},
"src/view/GameView.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.boardLayout = boardLayout;
exports.renderGame = renderGame;
const levels_1 = require("src/core/levels.js");
const C = { paper: '#F5F3EC', ink: '#203B36', muted: '#697970', line: '#E0E4D9', teal: '#267866', pale: '#E4EEE5', white: '#FFFEF9', gold: '#A87A26', amber: '#F2E8CB', red: '#B95C4F', rose: '#F4E4DD' };
function boardLayout(level) {
    const cell = 51;
    return { x: (390 - level.width * cell) / 2, y: 218 + (8 - level.height) * cell / 2, cell };
}
function renderGame(view) {
    const commands = [];
    const hits = [];
    const rect = (x, y, w, h, fill, radius = 0, stroke) => commands.push({ kind: 'rect', x, y, w, h, fill, radius, stroke, lineWidth: 1 });
    const text = (label, x, y, size = 16, color = C.ink, align = 'left', bold = false) => commands.push({ kind: 'text', text: label, x, y, size, color, align, weight: bold ? 'bold' : 'normal' });
    const line = (x1, y1, x2, y2, color = C.line, width = 1) => commands.push({ kind: 'line', x1, y1, x2, y2, color, width });
    const circle = (x, y, radius, fill) => commands.push({ kind: 'circle', x, y, radius, fill });
    const hit = (id, label, x, y, w, h, action, enabled = true) => hits.push({ id, label, x, y, w, h, action, enabled });
    const button = (id, label, x, y, w, h, action, style = 'primary', enabled = true) => {
        const fill = !enabled ? C.line : style === 'primary' ? C.teal : style === 'danger' ? C.rose : style === 'plain' ? C.paper : C.white;
        rect(x, y, w, h, fill, 16, style === 'secondary' ? C.line : undefined);
        text(label, x + w / 2, y + h / 2, 16, !enabled ? C.muted : style === 'primary' ? C.white : style === 'danger' ? C.red : C.ink, 'center', true);
        hit(id, label, x, y, w, h, action, enabled);
    };
    const pill = (label, x, y, w, fill = C.pale, color = C.teal) => { rect(x, y, w, 30, fill, 15); text(label, x + w / 2, y + 15, 12, color, 'center', true); };
    const arrow = (a, level, color, offset = 0, opacity = 1, highlight = false) => {
        const b = boardLayout(level);
        const d = { N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, W: { x: -1, y: 0 } }[a.dir];
        const hx = b.x + (a.x + .5) * b.cell + d.x * offset, hy = b.y + (a.y + .5) * b.cell + d.y * offset;
        const extension = a.length === 1 ? b.cell * .28 : 0;
        const tipx = hx + d.x * b.cell * .23, tipy = hy + d.y * b.cell * .23;
        const tailx = hx - d.x * ((a.length - 1) * b.cell + extension), taily = hy - d.y * ((a.length - 1) * b.cell + extension);
        if (highlight)
            commands.push({ kind: 'line', x1: tailx, y1: taily, x2: tipx, y2: tipy, color: C.amber, width: 25, alpha: opacity });
        commands.push({ kind: 'line', x1: tailx, y1: taily, x2: tipx, y2: tipy, color, width: 7, alpha: opacity });
        const back = 10, side = 9;
        commands.push({ kind: 'polyline', points: [{ x: tipx - d.x * back - d.y * side, y: tipy - d.y * back + d.x * side }, { x: tipx, y: tipy }, { x: tipx - d.x * back + d.y * side, y: tipy - d.y * back - d.x * side }], color, width: 7, alpha: opacity });
    };
    rect(0, 0, 390, 844, C.paper);
    if (view.page === 'home') {
        pill('把复杂，慢慢解开', 24, 32, 134);
        text('箭头小憩', 24, 108, 36, C.ink, 'left', true);
        text('顺着方向，给思绪留一点空。', 26, 153, 15, C.muted);
        // A small original diagram, kept separate from the actual playable boards.
        rect(44, 200, 302, 260, C.white, 28);
        for (let r = 0; r < 4; r++)
            for (let c = 0; c < 5; c++)
                circle(84 + c * 55, 242 + r * 56, 2, C.line);
        const icon = (x, y, dx, dy, length, color) => {
            line(x, y, x + dx * length, y + dy * length, color, 9);
            const ex = x + dx * length, ey = y + dy * length;
            commands.push({ kind: 'polyline', points: [{ x: ex - dx * 12 - dy * 10, y: ey - dy * 12 + dx * 10 }, { x: ex, y: ey }, { x: ex - dx * 12 + dy * 10, y: ey - dy * 12 - dx * 10 }], color, width: 9 });
        };
        icon(84, 242, 1, 0, 110, C.teal);
        icon(249, 242, 0, 1, 112, C.ink);
        icon(139, 298, 0, 1, 112, C.teal);
        icon(304, 410, -1, 0, 110, C.ink);
        text('20 个小关卡 · 按自己的节奏', 195, 490, 14, C.muted, 'center');
        const complete = view.state.completed.length;
        rect(24, 527, 342, 4, C.line, 2);
        rect(24, 527, 342 * complete / 20, 4, C.teal, 2);
        text(`已完成 ${complete} / 20`, 24, 553, 13, C.muted);
        text(`${view.state.coins} 金币`, 366, 553, 13, C.gold, 'right', true);
        const current = view.state.current;
        const label = current && current.status !== 'won' ? `继续第 ${current.levelId} 关` : complete === 20 ? '再来一局' : '开始小憩';
        button('start', label, 24, 596, 342, 58, { type: 'continue' });
        button('levels', '挑选关卡', 24, 668, 342, 52, { type: 'levels' }, 'secondary');
        button('rules', '玩法说明', 24, 739, 160, 44, { type: 'modal', value: 'rules' }, 'plain');
        button('settings', '设置', 206, 739, 160, 44, { type: 'modal', value: 'settings' }, 'plain');
        text('进度只保存在此设备', 195, 812, 11, C.muted, 'center');
    }
    else if (view.page === 'levels') {
        button('home', '‹  返回', 20, 24, 88, 44, { type: 'home' }, 'plain');
        text('挑一关，慢慢来', 24, 111, 27, C.ink, 'left', true);
        text('完成一关，解锁下一关。', 24, 151, 14, C.muted);
        pill(`${view.state.completed.length} / 20 已完成`, 24, 179, 116);
        for (let i = 0; i < 20; i++) {
            const n = i + 1, x = 24 + (i % 4) * 88, y = 242 + Math.floor(i / 4) * 91, enabled = n <= view.state.unlockedLevel, done = view.state.completed.includes(n);
            rect(x, y, 78, 76, done ? C.pale : enabled ? C.white : C.line, 18);
            text(String(n).padStart(2, '0'), x + 39, y + 30, 24, enabled ? C.ink : C.muted, 'center', true);
            text(done ? '已完成' : enabled ? '可挑战' : '待解锁', x + 39, y + 57, 10, done ? C.teal : C.muted, 'center');
            hit(`level-${n}`, `第${n}关${done ? '已完成' : enabled ? '可挑战' : '待解锁'}`, x, y, 78, 76, { type: 'level', value: n }, enabled);
        }
        text('每次清空，都是一点小小的成就。', 195, 751, 13, C.muted, 'center');
        text('前三关是开始，后面慢慢变有趣。', 195, 778, 12, C.muted, 'center');
    }
    else {
        const run = view.state.current;
        if (!run)
            return renderGame({ ...view, page: 'home' });
        const level = (0, levels_1.getLevel)(run.levelId);
        button('back', '‹  返回', 16, 24, 88, 44, { type: 'modal', value: 'leave' }, 'plain');
        text(`第 ${String(level.id).padStart(2, '0')} 关`, 195, 46, 16, C.ink, 'center', true);
        pill(`${view.state.coins} 金币`, 280, 31, 90, C.amber, C.gold);
        text(level.title, 24, 109, 26, C.ink, 'left', true);
        if (level.tutorial)
            pill('放心尝试 · 不扣生命', 24, 138, 146);
        else {
            text('剩余机会', 24, 153, 12, C.muted);
            for (let i = 0; i < 3; i++)
                circle(97 + i * 20, 153, 6, i < run.hearts ? C.teal : C.line);
        }
        text(`${level.arrows.length - run.remaining.length} / ${level.arrows.length} 已移除`, 366, 153, 12, C.muted, 'right');
        text(view.message || level.tip, 195, 190, 13, view.blockedId ? C.red : C.muted, 'center');
        const b = boardLayout(level);
        rect(20, 211, 350, 446, C.white, 24);
        for (let r = 0; r < level.height; r++)
            for (let c = 0; c < level.width; c++)
                circle(b.x + (c + .5) * b.cell, b.y + (r + .5) * b.cell, 1.8, C.line);
        for (const a of level.arrows)
            if (run.remaining.includes(a.id)) {
                const highlight = run.hintId === a.id;
                arrow(a, level, view.blockedId === a.id ? C.red : highlight ? C.gold : C.ink, 0, 1, highlight);
                const d = { N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, W: { x: -1, y: 0 } }[a.dir];
                for (let k = 0; k < a.length; k++) {
                    const x = b.x + (a.x - d.x * k) * b.cell, y = b.y + (a.y - d.y * k) * b.cell;
                    hit(`arrow-${a.id}-${k}`, `箭头${a.id}`, x + 3, y + 3, b.cell - 6, b.cell - 6, { type: 'arrow', value: a.id }, !view.inputLocked && run.status === 'playing');
                }
            }
        if (view.motion)
            arrow(view.motion.arrow, level, C.teal, view.motion.progress * 470, 1 - view.motion.progress);
        text('看准箭头前方，留出一条通路。', 195, 679, 12, C.muted, 'center');
        button('hint', '提示 · 20 金币', 24, 707, 204, 54, { type: 'hint' }, 'primary', !view.inputLocked && run.status === 'playing');
        button('restart', '重新开始', 240, 707, 126, 54, { type: 'modal', value: 'restart' }, 'secondary', !view.inputLocked);
        text('可随时免费重开 · 没有倒计时', 195, 798, 12, C.muted, 'center');
        if ((run.status === 'won' || run.status === 'failed') && !view.motion) {
            commands.push({ kind: 'rect', x: 0, y: 0, w: 390, h: 844, fill: '#203B36', alpha: .42 });
            hits.splice(0);
            rect(24, 232, 342, 394, C.white, 26);
            if (run.status === 'won') {
                circle(195, 284, 24, C.pale);
                text('✓', 195, 284, 25, C.teal, 'center', true);
                const all = view.state.completed.length === 20;
                text(all ? '二十关，都解开了！' : '清空了，真舒服。', 195, 339, 23, C.ink, 'center', true);
                text(run.earnedCoins > 0 ? `首次通关 +${run.earnedCoins} 金币` : '重玩完成，金币不重复发放', 195, 380, 14, run.earnedCoins > 0 ? C.gold : C.muted, 'center');
                text(run.earnedCoins === 0 ? '换个顺序观察，或挑战其他关卡。' : run.usedHint || run.revived ? '慢慢观察，也是一种进步。' : '独立解开，额外奖励已计入。', 195, 411, 12, C.muted, 'center');
                if (level.id < 20)
                    button('next', '下一关', 48, 450, 294, 52, { type: 'next' });
                else
                    button('all-levels', '回看全部关卡', 48, 450, 294, 52, { type: 'levels' });
                button('win-home', '回到首页', 48, 517, 294, 48, { type: 'home' }, 'secondary');
            }
            else {
                circle(195, 284, 24, C.rose);
                text('↻', 195, 284, 27, C.red, 'center', true);
                text('换个方向，再试一次', 195, 339, 23, C.ink, 'center', true);
                text('棋盘会保留，也可以免费重新开始。', 195, 381, 13, C.muted, 'center');
                if (!run.revived)
                    button('revive', '恢复 3 次机会 · 40 金币', 48, 425, 294, 52, { type: 'revive' }, 'primary', view.state.coins >= 40);
                else
                    text('本局已恢复过机会', 195, 451, 14, C.muted, 'center');
                button('retry', '免费重新开始', 48, 490, 294, 50, { type: 'restart' }, 'secondary');
                button('fail-home', '回到首页', 48, 552, 294, 42, { type: 'home' }, 'plain');
            }
        }
    }
    if (view.modal) {
        hits.splice(0);
        commands.push({ kind: 'rect', x: 0, y: 0, w: 390, h: 844, fill: '#203B36', alpha: .42 });
        const modal = view.modal;
        rect(24, 190, 342, 460, C.white, 26);
        const title = { rules: '怎样解开箭头', settings: '按你的习惯', restart: '重新开始这一关？', leave: '先休息一下？', reset: '清除本机进度？', reminder: '已经专注一会儿了', switchlevel: '切换到另一关？' }[modal];
        text(title, 195, 237, 23, C.ink, 'center', true);
        if (modal === 'rules') {
            const rows = ['点一下箭头，它会沿着方向离开。', '前方有别的箭头挡住，就暂时走不了。', '清空棋盘，就能进入下一关。', '前两关放心尝试，之后每关有 3 次机会。', '提示会标出一支能离开的箭头。', '首次过关得金币，重玩不重复发放。'];
            rows.forEach((s, i) => text(s, 46, 295 + i * 39, 13, C.muted));
            text('仅本机保存 · 无广告 · 不上传游戏数据', 195, 554, 11, C.muted, 'center');
            button('close', '明白了', 48, 580, 294, 48, { type: 'close' });
        }
        else if (modal === 'settings') {
            const options = [];
            if (view.capabilities.sound)
                options.push(['sound', '轻声音效']);
            if (view.capabilities.vibration)
                options.push(['vibration', '触感反馈']);
            options.push(['reducedMotion', '减少动态效果']);
            options.forEach(([key, label], i) => {
                const y = 281 + i * 64;
                text(label, 48, y + 20, 15, C.ink);
                button(`setting-${key}`, view.preferences[key] ? '开启' : '关闭', 258, y, 84, 40, { type: 'toggle', value: key }, view.preferences[key] ? 'primary' : 'secondary');
            });
            text('进度保存在此设备，清理缓存可能丢失。', 195, 505, 11, C.muted, 'center');
            if (view.canReset)
                button('reset-open', '清除本机进度', 48, 534, 294, 40, { type: 'modal', value: 'reset' }, 'danger');
            button('close', '完成', 48, 588, 294, 42, { type: 'close' });
        }
        else {
            const lines = modal === 'restart' ? ['本关棋盘和机会将重新开始。', '已经消耗的金币不会返还。'] : modal === 'leave' ? ['当前棋盘会自动保存。', '下次回来，可以接着这一关。'] : modal === 'reset' ? ['关卡、金币和当前棋盘都会清除。', '此操作无法撤销，请确认。'] : modal === 'switchlevel' ? ['当前棋盘的未完成进度将被替换。', '已经完成的关卡和金币会保留。'] : ['看一看远处，让眼睛放松一下。', '小游戏可以等一会儿再继续。'];
            lines.forEach((s, i) => text(s, 195, 323 + i * 35, 14, C.muted, 'center'));
            button('confirm', modal === 'reset' ? '确认清除' : modal === 'restart' ? '免费重新开始' : modal === 'leave' ? '保存并返回' : modal === 'switchlevel' ? '确认切换' : '休息一下', 48, 447, 294, 52, { type: modal === 'reset' ? 'reset' : modal === 'restart' ? 'restart' : modal === 'switchlevel' ? 'switchlevel' : 'home' }, modal === 'reset' ? 'danger' : 'primary');
            button('cancel', modal === 'reminder' ? '知道了' : '再想想', 48, 514, 294, 48, { type: 'close' }, 'secondary');
        }
    }
    if (view.message && (view.modal || view.page !== 'play')) {
        rect(24, 768, 342, 44, C.ink, 14);
        text(view.message, 195, 790, 12, C.white, 'center');
    }
    if (view.restSeconds > 0) {
        hits.splice(0);
        commands.push({ kind: 'rect', x: 0, y: 0, w: 390, h: 844, fill: C.paper });
        circle(195, 280, 55, C.pale);
        text('休', 195, 280, 42, C.teal, 'center', true);
        text('先休息，稍后再继续', 195, 394, 26, C.ink, 'center', true);
        text('进度已经保存。伸展一下，看看远处。', 195, 441, 13, C.muted, 'center');
        const seconds = Math.ceil(view.restSeconds);
        text(`${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`, 195, 512, 38, C.teal, 'center', true);
        text('连续游玩休息提醒', 195, 570, 12, C.muted, 'center');
    }
    return { width: 390, height: 844, commands, hits };
}

},
"src/view/render.js": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hitTest = hitTest;
function hitTest(frame, x, y) {
    return [...frame.hits].reverse().find(hit => hit.enabled && x >= hit.x && y >= hit.y && x <= hit.x + hit.w && y <= hit.y + hit.h);
}

},
"canvas-renderer.mjs": function(module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderCanvas = renderCanvas;
/** Canvas renderer for shared top-left coordinates; text y is its middle. */
function renderCanvas(canvas, frame) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (canvas.width !== Math.round(frame.width * dpr) || canvas.height !== Math.round(frame.height * dpr)) {
        canvas.width = Math.round(frame.width * dpr);
        canvas.height = Math.round(frame.height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, frame.width, frame.height);
    const rounded = (x, y, w, h, r) => {
        r = Math.max(0, Math.min(r, w / 2, h / 2));
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    };
    for (const c of frame.commands) {
        ctx.save();
        ctx.globalAlpha = c.alpha ?? 1;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (c.kind === 'rect') {
            rounded(c.x, c.y, c.w, c.h, c.radius ?? 0);
            ctx.fillStyle = c.fill;
            ctx.fill();
            if (c.stroke) {
                ctx.strokeStyle = c.stroke;
                ctx.lineWidth = c.lineWidth ?? 1;
                ctx.stroke();
            }
        }
        else if (c.kind === 'circle') {
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
            ctx.fillStyle = c.fill;
            ctx.fill();
            if (c.stroke) {
                ctx.strokeStyle = c.stroke;
                ctx.lineWidth = c.lineWidth ?? 1;
                ctx.stroke();
            }
        }
        else if (c.kind === 'line') {
            ctx.beginPath();
            ctx.moveTo(c.x1, c.y1);
            ctx.lineTo(c.x2, c.y2);
            ctx.strokeStyle = c.color;
            ctx.lineWidth = c.width;
            ctx.stroke();
        }
        else if (c.kind === 'polyline') {
            if (c.points.length) {
                ctx.beginPath();
                ctx.moveTo(c.points[0].x, c.points[0].y);
                for (const p of c.points.slice(1))
                    ctx.lineTo(p.x, p.y);
                if (c.closed)
                    ctx.closePath();
                if (c.fill) {
                    ctx.fillStyle = c.fill;
                    ctx.fill();
                }
                ctx.strokeStyle = c.color;
                ctx.lineWidth = c.width;
                ctx.stroke();
            }
        }
        else if (c.kind === 'text') {
            ctx.font = `${c.weight === 'bold' ? '600' : '400'} ${c.size}px "Microsoft YaHei", "PingFang SC", system-ui, sans-serif`;
            ctx.textAlign = c.align ?? 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = c.color;
            ctx.fillText(c.text, c.x, c.y);
        }
        ctx.restore();
    }
}

}};
const cache={};
function require(id){if(cache[id])return cache[id].exports;if(!modules[id])throw new Error('Missing '+id);const m={exports:{}};cache[id]=m;modules[id](m,m.exports,require);return m.exports;}
require('main.mjs');
})();
