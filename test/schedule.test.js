import assert from 'node:assert/strict'
import { test } from 'vitest'
import {
  intervalLabel,
  MAX_INTERVAL_DAYS,
  normalizeIntervalDays,
} from '../src/utils/schedule.js'

for (const value of [1, 3, 7, 30, 365]) {
  test(`keeps supported interval ${value}`, () => {
    assert.equal(normalizeIntervalDays(value), value)
  })
}

test('clamps interval values to the backend contract', () => {
  assert.equal(normalizeIntervalDays(0), 1)
  assert.equal(normalizeIntervalDays(-20), 1)
  assert.equal(normalizeIntervalDays(MAX_INTERVAL_DAYS + 1), MAX_INTERVAL_DAYS)
  assert.equal(normalizeIntervalDays(''), 7)
  assert.equal(normalizeIntervalDays('3.8'), 3)
})

test('uses a natural label for daily and multi-day schedules', () => {
  assert.equal(intervalLabel(1), '每天')
  assert.equal(intervalLabel(3), '每 3 天')
  assert.equal(intervalLabel(365), '每 365 天')
})
