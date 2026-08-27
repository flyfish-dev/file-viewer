#!/usr/bin/env python3
from pathlib import Path
from asn1crypto import cms, core, crl, pem, tsp

ROOT = Path(__file__).resolve().parents[1]

class MetaData(core.Sequence):
    _fields = [
        ('hash_protected', core.Boolean),
        ('file_name', core.UTF8String, {'optional': True}),
        ('media_type', core.IA5String, {'optional': True}),
        ('other_meta_data', cms.CMSAttributes, {'optional': True}),
    ]

class TimeStampAndCRL(core.Sequence):
    _fields = [
        ('time_stamp', cms.ContentInfo),
        ('crl', crl.CertificateList, {'optional': True}),
    ]

class TimeStampTokenEvidence(core.SequenceOf):
    _child_spec = TimeStampAndCRL

class Evidence(core.Choice):
    _alternatives = [
        ('tst_evidence', TimeStampTokenEvidence, {'implicit': 0}),
        ('ers_evidence', core.Any, {'implicit': 1}),
        ('other_evidence', core.Any, {'implicit': 2}),
    ]

class TimeStampedData(core.Sequence):
    _fields = [
        ('version', core.Integer),
        ('data_uri', core.IA5String, {'optional': True}),
        ('meta_data', MetaData, {'optional': True}),
        ('content', core.OctetString, {'optional': True}),
        ('temporal_evidence', Evidence),
    ]

OID = '1.2.840.113549.1.9.16.1.31'
cms.ContentType._map[OID] = 'time_stamped_data'
cms.ContentInfo._oid_specs['time_stamped_data'] = TimeStampedData

def der_from_pem(path: Path) -> bytes:
    raw = path.read_bytes()
    if pem.detect(raw):
        _, _, raw = pem.unarmor(raw)
    return raw

content = (ROOT / 'originals/invoice.pdf').read_bytes()
token = cms.ContentInfo.load((ROOT / 'timestamps/invoice-sha256.tst').read_bytes())
root_crl = crl.CertificateList.load(der_from_pem(ROOT / 'certificates/test-root-ca.crl.pem'))
evidence = Evidence(name='tst_evidence', value=TimeStampTokenEvidence([
    TimeStampAndCRL({'time_stamp': token, 'crl': root_crl})
]))
metadata = MetaData({
    'hash_protected': False,
    'file_name': 'invoice.pdf',
    'media_type': 'application/pdf',
})

embedded = TimeStampedData({
    'version': 1,
    'meta_data': metadata,
    'content': content,
    'temporal_evidence': evidence,
})
embedded_ci = cms.ContentInfo({'content_type': 'time_stamped_data', 'content': embedded})
(ROOT / 'timestamps/invoice-embedded.tsd').write_bytes(embedded_ci.dump())

external = TimeStampedData({
    'version': 1,
    'data_uri': 'https://example.invalid/file-viewer-issue-206/invoice.pdf',
    'meta_data': metadata,
    'temporal_evidence': evidence,
})
external_ci = cms.ContentInfo({'content_type': 'time_stamped_data', 'content': external})
(ROOT / 'timestamps/invoice-external-content.tsd').write_bytes(external_ci.dump())

class FlexibleTimeStampResp(core.Sequence):
    _fields = [
        ('status', tsp.PKIStatusInfo),
        ('time_stamp_token', cms.ContentInfo, {'optional': True}),
    ]

rejected = FlexibleTimeStampResp({
    'status': {
        'status': 'rejection',
        'status_string': ['Synthetic rejection: unsupported digest algorithm'],
        'fail_info': {'bad_alg'},
    }
})
(ROOT / 'timestamps/rejected-bad-alg.tsr').write_bytes(rejected.dump())
