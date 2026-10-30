import assert from 'node:assert/strict'
import test from 'node:test'
import { offlineEpsgDefinition, resolveCitedCrs } from '../dist/geo3dCrsCatalog.js'

test('authority aliases and canonical names resolve beyond one country or sample', () => {
  for (const name of ['ETRS89 / Poland CS2000 zone 6', 'ETRF2000-PL / CS2000/18', 'PL-2000/18'])
    assert.equal(resolveCitedCrs(`WGS84, WGS84, ${name}`, 1, 9001), 'EPSG:2177')
  assert.equal(resolveCitedCrs('RGF93 / Lambert-93', 1, 9001), 'EPSG:2154')
  assert.match(offlineEpsgDefinition('EPSG:2177'), /\+proj=tmerc/)
  assert.match(offlineEpsgDefinition('EPSG:2154'), /\+proj=lcc/)
})

test('citation authority identifiers are exact, offline and constrained by model', () => {
  for (const name of ['EPSG:2177', 'urn:ogc:def:crs:EPSG::2177', 'https://www.opengis.net/def/crs/EPSG/0/2177'])
    assert.equal(resolveCitedCrs(name, 1, 9001), 'EPSG:2177')
  assert.equal(resolveCitedCrs('EPSG:2177 extra', 1, 9001), undefined)
  assert.equal(resolveCitedCrs('WGS84', 1, 9001), undefined)
  assert.equal(resolveCitedCrs('EPSG:2177', 2), undefined)
  assert.equal(resolveCitedCrs('EPSG:999999999', 1), undefined)
})

test('ambiguous names, conflicting units and uninstalled grids fail explicitly', () => {
  assert.throws(() => resolveCitedCrs('EPSG:2177, EPSG:2154', 1, 9001), /ambiguous/)
  assert.throws(() => resolveCitedCrs('EPSG:2177', 1, 9002), /units/)
  assert.throws(() => resolveCitedCrs('EPSG:2177', undefined, 9002), /units/)
  assert.throws(() => resolveCitedCrs('EPSG:2177', 1, 32767), /units/)
  assert.throws(() => offlineEpsgDefinition('EPSG:27700'), /offline datum grids/)
})
