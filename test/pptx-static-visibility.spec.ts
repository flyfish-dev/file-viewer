import { describe, expect, it } from 'vitest'
import { getFinalSlideHiddenShapeIds, isFinalSlideShapeHidden } from '../packages/renderers/pptx/src/engine/support/drawing-semantics.js'
import { parse } from '../packages/renderers/pptx/src/engine/support/txml.js'

const setter = (id: string, state: string, fill = 'hold', target = '') => `<p:set><p:cBhvr><p:cTn fill="${fill}"/><p:tgtEl><p:spTgt spid="${id}">${target}</p:spTgt></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="${state}"/></p:to></p:set>`
const timeline = (groups: string[], attrs = '') => parse(`<p:sld><p:timing><p:tnLst><p:par><p:cTn nodeType="tmRoot"><p:childTnLst><p:seq><p:cTn nodeType="mainSeq" ${attrs}><p:childTnLst>${groups.map(g => `<p:par><p:cTn><p:childTnLst>${g}</p:childTnLst></p:cTn></p:par>`).join('')}</p:childTnLst></p:cTn></p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing></p:sld>`, { simplify: true, keepWhitespace: true })

describe('PPTX static main-sequence final visibility', () => {
  it('keeps assembled formulas and replaces only the explicitly exited whole shape', () => {
    const source = timeline([setter('8', 'visible') + setter('9', 'visible'), setter('10', 'visible'), setter('10', 'hidden') + setter('11', 'visible')])
    const original = JSON.stringify(source)
    const hidden = getFinalSlideHiddenShapeIds(source)
    expect([...hidden]).toEqual(['10'])
    for (const id of ['8', '9', '11']) expect(isFinalSlideShapeHidden(hidden, id)).toBe(false)
    expect(JSON.stringify(source)).toBe(original)
  })

  it('does not infer hidden content from absent timing or entrance-only animation', () => {
    expect([...getFinalSlideHiddenShapeIds({})]).toEqual([])
    expect([...getFinalSlideHiddenShapeIds(timeline([setter('10', 'visible') + setter('11', 'visible')]))]).toEqual([])
  })

  it('allows a later main step to reveal the same shape again', () => {
    expect([...getFinalSlideHiddenShapeIds(timeline([setter('10', 'hidden'), setter('10', 'visible')]))]).toEqual([])
  })

  it('retains content for conflicting simultaneous visibility setters', () => {
    expect([...getFinalSlideHiddenShapeIds(timeline([setter('10', 'visible') + setter('10', 'hidden')]))]).toEqual([])
  })

  it('does not turn paragraph-range visibility into whole-shape deletion', () => {
    expect([...getFinalSlideHiddenShapeIds(timeline([setter('10', 'hidden', 'hold', '<p:txEl><p:pRg st="0" end="0"/></p:txEl>')]))]).toEqual([])
  })

  it.each([
    '<p:subSp spid="11"/>', '<p:graphicEl/>', '<p:oleChartEl/>', '<p:bg/>',
    '<p:txEl><p:pRg st="0" end="0"/></p:txEl>', '<x:unknownTarget/>'
  ])('retains the parent for a partial or unknown target: %s', child => {
    expect([...getFinalSlideHiddenShapeIds(timeline([setter('10', 'hidden', 'hold', child)]))]).toEqual([])
    expect([...getFinalSlideHiddenShapeIds(timeline([setter('10', 'hidden'), setter('10', 'hidden', 'hold', child)]))]).toEqual([])
  })

  it('retains content for unknown target attributes', () => {
    const unknown = setter('10', 'hidden').replace('spid="10"', 'spid="10" unknownPart="child"')
    expect([...getFinalSlideHiddenShapeIds(timeline([unknown]))]).toEqual([])
    expect([...getFinalSlideHiddenShapeIds(timeline([setter('10', 'hidden'), unknown]))]).toEqual([])
  })

  it('requires a held supported value and leaves unsupported setters intact', () => {
    for (const [value, fill] of [['hidden', 'remove'], ['collapse', 'hold']]) {
      expect([...getFinalSlideHiddenShapeIds(timeline([setter('10', value, fill)]))]).toEqual([])
    }
  })

  it('does not flatten interactive or repeating sequences', () => {
    const interactive = timeline([`<p:par><p:cTn nodeType="interactiveSeq"><p:childTnLst>${setter('10', 'hidden')}</p:childTnLst></p:cTn></p:par>`])
    expect([...getFinalSlideHiddenShapeIds(interactive)]).toEqual([])
    expect([...getFinalSlideHiddenShapeIds(timeline([setter('10', 'hidden')], 'repeatCount="indefinite"'))]).toEqual([])
  })

  it('matches valid numeric drawing IDs and rejects malformed identity values', () => {
    const hidden = getFinalSlideHiddenShapeIds(timeline([setter('00010', 'hidden')]))
    expect(isFinalSlideShapeHidden(hidden, 10)).toBe(true)
    for (const value of [undefined, '', '__proto__', -1, 2 ** 32, '10.5']) expect(isFinalSlideShapeHidden(hidden, value)).toBe(false)
  })
})
