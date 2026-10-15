import { describe, expect, it, vi } from 'vitest'
import { createSpreadsheetRangeNavigation } from '../packages/renderers/spreadsheet/src/spreadsheet/rangeNavigation'
const range = { sheetId: 1, startRow: 29, startCol: 3, endRow: 29, endCol: 4 }
function fixture(ready = Promise.resolve()) {
  const jump = vi.fn(); const clearJump = vi.fn()
  const nav = createSpreadsheetRangeNavigation({ ready, jump, clearJump, getScale: () => 1,
    isVisibleSheet: id => id === 0 || id === 1 })
  return { nav, jump }
}
describe('coordinate navigation lifecycle', () => {
  it('passes exact coordinates without a text search and completes only after scrolling', async () => {
    const {nav,jump} = fixture()
    const result = nav.provider.applyState!({ spreadsheet: { range } })
    await Promise.resolve()
    expect(jump).toHaveBeenCalledWith(range)
    const done = nav.prepare(34,16)
    expect(nav.contains(1,29,3)).toBe(true)
    expect(nav.contains(1,7,3)).toBe(false)
    done!()
    expect((await result).spreadsheet?.status).toBe('applied')
  })
  it.each([{...range,sheetId:2},{...range,startRow:-1},{...range,endRow:1},{...range,endCol:16384},{...range,startCol:1.5}])('rejects hidden or invalid coordinates %j', async target => {
    const {nav,jump}=fixture()
    expect((await nav.provider.applyState!({spreadsheet:{range:target}})).spreadsheet?.status).toBe('rejected')
    expect(jump).not.toHaveBeenCalled()
  })
  it('rejects ranges outside the used sheet without reporting success', async () => {
    const {nav}=fixture(); const result=nav.provider.applyState!({spreadsheet:{range}})
    await Promise.resolve(); expect(nav.prepare(20,16)).toBeNull()
    expect((await result).spreadsheet?.status).toBe('rejected')
  })
  it('cancels an older request and ignores its deferred paint callback', async () => {
    const {nav}=fixture(); const first=nav.provider.applyState!({spreadsheet:{range}})
    await Promise.resolve(); const stale=nav.prepare(34,16)
    const second=nav.provider.applyState!({spreadsheet:{range:{...range,startRow:19,endRow:19}}})
    await Promise.resolve(); stale!()
    expect((await first).spreadsheet?.status).toBe('cancelled')
    expect(nav.provider.getState().spreadsheet?.status).toBe('pending')
    nav.prepare(34,16)!(); expect((await second).spreadsheet?.status).toBe('applied')
  })
  it.each(['cancelled','failed','disposed'] as const)('settles requests on %s', async status => {
    const {nav}=fixture(); const result=nav.provider.applyState!({spreadsheet:{range}})
    await Promise.resolve(); nav.cancel(status)
    expect((await result).spreadsheet?.status).toBe(status)
    expect(nav.contains(1,29,3)).toBe(false)
  })
  it('pre-load requests cannot replace a later request or survive disposal', async () => {
    let resolve!:()=>void; const {nav,jump}=fixture(new Promise<void>(r=>{resolve=r}))
    const first=nav.provider.applyState!({spreadsheet:{range}})
    const second=nav.provider.applyState!({spreadsheet:{range}})
    nav.cancel('disposed'); resolve()
    expect((await first).spreadsheet?.status).toBe('disposed')
    expect((await second).spreadsheet?.status).toBe('disposed')
    expect(jump).not.toHaveBeenCalled()
  })
  it('copies caller input and returned range state', async () => {
    const {nav}=fixture(); const input={...range}
    const result=nav.provider.applyState!({spreadsheet:{range:input}})
    input.endCol=200; await Promise.resolve(); nav.prepare(34,16)!()
    const state=await result; state.spreadsheet!.range!.startRow=0
    expect(nav.provider.getState().spreadsheet?.range).toEqual(range)
  })
})
