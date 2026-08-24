#!/usr/bin/env python3
import hashlib
from pathlib import Path
from asn1crypto import cms, core, tsp

ROOT = Path(__file__).resolve().parents[1]

class MetaData(core.Sequence):
    _fields = [
        ('hash_protected', core.Boolean),
        ('file_name', core.UTF8String, {'optional': True}),
        ('media_type', core.IA5String, {'optional': True}),
        ('other_meta_data', cms.CMSAttributes, {'optional': True}),
    ]
class TimeStampAndCRL(core.Sequence):
    _fields = [('time_stamp', cms.ContentInfo), ('crl', core.Any, {'optional': True})]
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

original = (ROOT / 'originals/invoice.pdf').read_bytes()
for name in ('invoice-embedded.tsd', 'invoice-external-content.tsd'):
    ci = cms.ContentInfo.load((ROOT / 'timestamps' / name).read_bytes())
    tsd = ci['content']
    assert tsd['version'].native == 1
    assert tsd['meta_data']['hash_protected'].native is False
    data = tsd['content'].native if tsd['content'].native is not None else original
    token = tsd['temporal_evidence'].chosen[0]['time_stamp']
    signed_data = token['content']
    tst_info = signed_data['encap_content_info']['content'].parsed
    imprint = tst_info['message_imprint']
    algorithm = imprint['hash_algorithm']['algorithm'].native
    expected = imprint['hashed_message'].native
    actual = hashlib.new(algorithm, data).digest()
    assert actual == expected, f'{name}: message imprint mismatch'
print('TSD checks passed')
