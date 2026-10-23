import assert from 'node:assert/strict'
import { test } from 'vitest'
import {
  buildServiceAddresses,
  compactAddress,
  serviceModeText,
  serviceStateText,
} from '../src/utils/overview.js'

test('shows a compact endpoint while opening the full merged URL', () => {
  const status = {
    mergeMode: true,
    directUrl: 'http://127.0.0.1:3001?api=http://127.0.0.1:3001/secret',
    openUrl: 'http://127.0.0.1:3001?api=http://127.0.0.1:3001/secret',
  }
  assert.deepEqual(buildServiceAddresses(status), [{
    label: '直达地址',
    value: status.directUrl,
    displayValue: '127.0.0.1:3001',
    openValue: status.openUrl,
  }])
})

test('split mode opens the frontend and treats the backend as information only', () => {
  const addresses = buildServiceAddresses({
    mergeMode: false,
    frontUrl: 'http://127.0.0.1:3002/ui',
    backUrl: 'http://127.0.0.1:3101/api',
  })
  assert.equal(addresses[0].openValue, 'http://127.0.0.1:3002/ui')
  assert.equal(addresses[0].displayValue, '127.0.0.1:3002/ui')
  assert.equal(addresses[1].openValue, null)
  assert.equal(addresses[1].displayValue, '127.0.0.1:3101/api')
})

test('unknown status never masquerades as stopped or safe mode', () => {
  assert.equal(serviceStateText({
    status: null,
    loading: true,
    pendingAction: false,
    currentAction: '',
  }), '正在读取')
  assert.equal(serviceStateText({
    status: null,
    loading: false,
    pendingAction: false,
    currentAction: '',
  }), '状态不可用')
  assert.equal(serviceModeText(null, true), '读取中')
  assert.equal(serviceModeText(null, false), '状态未知')
})

test('pending service actions and malformed addresses have explicit labels', () => {
  assert.equal(serviceStateText({
    status: { serviceRunning: true },
    loading: false,
    pendingAction: true,
    currentAction: 'stop',
  }), '正在停止')
  assert.equal(compactAddress('not a url'), 'not a url')
})

test('a stale snapshot is never presented as the current service state', () => {
  assert.equal(serviceStateText({
    status: { serviceRunning: true },
    loading: false,
    stale: true,
  }), '状态待确认')
})
