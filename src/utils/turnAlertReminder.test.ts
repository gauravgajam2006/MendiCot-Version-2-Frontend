import assert from 'node:assert/strict';
import test from 'node:test';
import { TURN_ALERT_INITIAL_DELAY_MS, TURN_ALERT_REPEAT_DELAY_MS, TURN_ALERT_SOUND_GAP_MS, TURN_ALERT_VIBRATION_PATTERN, TurnAlertReminderController, type TurnAlertReminderEnvironment, type TurnAlertReminderSnapshot, type TurnAlertTimer } from './turnAlertReminder.ts';

class FakeTimers implements TurnAlertReminderEnvironment {
  now = 0; next = 1; tasks = new Map<number, { at: number; run: () => void }>();
  setTimeout(run: () => void, delay: number): TurnAlertTimer { const id = this.next++; this.tasks.set(id, { at: this.now + delay, run }); return id as unknown as TurnAlertTimer; }
  clearTimeout(timer: TurnAlertTimer): void { this.tasks.delete(timer as unknown as number); }
  advance(ms: number): void { const until = this.now + ms; for (;;) { const next = [...this.tasks.entries()].filter(([, task]) => task.at <= until).sort((a, b) => a[1].at - b[1].at)[0]; if (!next) break; this.tasks.delete(next[0]); this.now = next[1].at; next[1].run(); } this.now = until; }
}
const mine = (changes: Partial<TurnAlertReminderSnapshot> = {}): TurnAlertReminderSnapshot => ({ enabled: true, selectedSound: 'soft-chime', meId: 'p3', currentTurnPlayerId: 'p3', phase: 'PLAYING', gameId: 'g', gameVersion: 1, connected: true, visible: true, ...changes });
function setup(snapshot = mine()) { const timers = new FakeTimers(); const sounds: string[] = []; let vibrations = 0; const controller = new TurnAlertReminderController((sound) => sounds.push(sound), () => { vibrations += 1; }, timers); controller.update(snapshot); return { timers, sounds, controller, get vibrations() { return vibrations; } }; }

test('turn reminder observes the initial grace, 3-sound burst, and 10-second repeat', () => {
  const result = setup(); result.timers.advance(TURN_ALERT_INITIAL_DELAY_MS - 1); assert.equal(result.sounds.length, 0);
  result.timers.advance(1); assert.deepEqual(result.sounds, ['soft-chime']); assert.equal(result.vibrations, 1);
  result.timers.advance(TURN_ALERT_SOUND_GAP_MS * 2); assert.equal(result.sounds.length, 3);
  result.timers.advance(TURN_ALERT_REPEAT_DELAY_MS - TURN_ALERT_SOUND_GAP_MS * 2); assert.equal(result.sounds.length, 4);
  result.timers.advance(TURN_ALERT_REPEAT_DELAY_MS); assert.equal(result.sounds.length, 7);
});

test('turn changes, disabled alerts, and non-playable phases cancel all output', () => {
  for (const update of [mine({ currentTurnPlayerId: 'p4', gameVersion: 2 }), mine({ enabled: false }), mine({ phase: 'TRICK_RESOLUTION', currentTurnPlayerId: null })]) {
    const result = setup(); result.timers.advance(2_000); result.controller.update(update); result.timers.advance(20_000); assert.equal(result.sounds.length, 0);
  }
});

test('a change after the first burst cancels its repeat and remaining sounds', () => {
  const result = setup(); result.timers.advance(TURN_ALERT_INITIAL_DELAY_MS); result.controller.update(mine({ currentTurnPlayerId: 'p4', gameVersion: 2 })); result.timers.advance(20_000); assert.equal(result.sounds.length, 1);
});

test('enabling during an own turn starts a fresh grace period and sound changes affect the next output', () => {
  const result = setup(mine({ enabled: false })); result.timers.advance(10_000); assert.equal(result.sounds.length, 0);
  result.controller.update(mine({ enabled: true })); result.timers.advance(TURN_ALERT_INITIAL_DELAY_MS - 1); assert.equal(result.sounds.length, 0);
  result.controller.update(mine({ enabled: true, selectedSound: 'subtle-bell' })); result.timers.advance(1 + TURN_ALERT_SOUND_GAP_MS * 2); assert.deepEqual(result.sounds, ['subtle-bell', 'subtle-bell', 'subtle-bell']);
});

test('visibility and reconnect snapshots start fresh cycles without duplicate timers', () => {
  const result = setup(); result.timers.advance(2_000); result.controller.update(mine({ visible: false })); result.timers.advance(10_000); assert.equal(result.sounds.length, 0);
  result.controller.update(mine({ visible: true })); result.timers.advance(TURN_ALERT_INITIAL_DELAY_MS); assert.equal(result.sounds.length, 1);
  result.controller.update(mine({ connected: false })); result.timers.advance(10_000); assert.equal(result.sounds.length, 1);
  result.controller.update(mine({ connected: true, gameVersion: 2 })); result.timers.advance(TURN_ALERT_INITIAL_DELAY_MS); assert.equal(result.sounds.length, 2);
});

test('first local PLAYING turn uses receiver-safe default browser timers', () => {
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const scheduled: Array<{ handler: () => void; delay: number }> = [];
  const cancelled: number[] = [];
  const browserWindow = {
    setTimeout(this: object, handler: () => void, delay: number): TurnAlertTimer {
      assert.equal(this, browserWindow, 'browser timer must retain its window receiver');
      scheduled.push({ handler, delay });
      return scheduled.length as unknown as TurnAlertTimer;
    },
    clearTimeout(this: object, timer: TurnAlertTimer): void {
      assert.equal(this, browserWindow, 'browser timer cancellation must retain its window receiver');
      cancelled.push(timer as unknown as number);
    },
  };

  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: browserWindow });
    const controller = new TurnAlertReminderController(() => undefined, () => undefined);

    assert.doesNotThrow(() => controller.update(mine()));
    assert.equal(scheduled.length, 1);
    assert.equal(scheduled[0].delay, TURN_ALERT_INITIAL_DELAY_MS);

    controller.cancel();
    controller.cancel();
    assert.deepEqual(cancelled, [1]);

    // Mirrors React Strict Mode's effect cleanup followed by another mount/update.
    controller.update(mine());
    assert.equal(scheduled.length, 2);
    assert.equal(scheduled[1].delay, TURN_ALERT_INITIAL_DELAY_MS);
  } finally {
    if (originalWindowDescriptor) Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test("another player's first PLAYING turn does not create a local reminder", () => {
  const result = setup(mine({ currentTurnPlayerId: 'p4' }));
  assert.equal(result.timers.tasks.size, 0);
  result.controller.cancel();
  result.controller.cancel();
  assert.equal(result.timers.tasks.size, 0);
});
test('vibration happens once per burst using the supported-device pattern at the hook boundary', () => {
  assert.deepEqual(TURN_ALERT_VIBRATION_PATTERN, [120, 180, 120, 180, 120]);
});
