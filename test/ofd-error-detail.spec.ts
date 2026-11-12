// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import JSZip from 'jszip'
import { parseOfdDocument } from '../packages/renderers/ofd/vendor/dltech/ofd/ofd.js'
afterEach(() => vi.restoreAllMocks())
it.each(['error', 'string', 'object'] as const)('forwards a %s failure without reading or logging its raw detail', async kind => {
 let reads=0
 const error=new Error();Object.defineProperty(error,'message',{get(){reads++;throw new Error('must not inspect before owner')}})
 const reason=kind==='error'?error:kind==='string'?'RAW 原文':{get message(){reads++;return 'RAW object'}}
 vi.spyOn(JSZip,'loadAsync').mockRejectedValue(reason)
 // Assert that no raw value is passed to the console. Actual-console getter behavior is also checked in packed browsers.
 const log=vi.spyOn(console,'log').mockImplementation(()=>{})
 const success=vi.fn(),fail=vi.fn()
 await new Promise<void>(resolve=>parseOfdDocument({ofd:new ArrayBuffer(0),success,fail:value=>{fail(value);resolve()}}))
 expect(success).not.toHaveBeenCalled();expect(fail).toHaveBeenCalledExactlyOnceWith(reason);expect(reads).toBe(0);expect(log).not.toHaveBeenCalled()
})
