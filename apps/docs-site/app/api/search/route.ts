import { source } from '@/lib/source';
import { flexsearchFromSource } from 'fumadocs-core/search/flexsearch';

export const revalidate = false;
export const { staticGET: GET } = flexsearchFromSource(source, {
  document: {
    tokenize: 'forward',
  },
});
