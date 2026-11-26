import { buildFileViewerDocumentTextChunks } from './model';
import {
  getCurrentFileViewerDocumentAnchor,
  resolveFileViewerScrollContainer,
  scrollToFileViewerDocumentAnchor,
} from './dom';
import {
  cloneFileViewerSearchState,
  createFileViewerDomSearchController,
  createFileViewerDomSearchControllerActionHandlers,
  type FileViewerDomSearchControllerStateTarget,
} from './search';
import type {
  FileViewerAiOptions,
  FileViewerDocumentAnchor,
  FileViewerDocumentChunk,
  FileViewerSearchOptions,
  FileViewerSearchState,
} from '../../contracts/types';

export interface ResolveFileViewerLocationChangeAnchorInput {
  root: HTMLElement | null | undefined;
  anchors: FileViewerDocumentAnchor[];
}

export interface CreateFileViewerDocumentChangeSnapshotInput
  extends ResolveFileViewerLocationChangeAnchorInput {
  searchState: FileViewerSearchState;
}

export interface FileViewerDocumentChangeSnapshot {
  searchState: FileViewerSearchState;
  locationAnchor: FileViewerDocumentAnchor | null;
}

export interface DispatchFileViewerSearchChangeInput {
  state: FileViewerSearchState;
  onChange?: (state: FileViewerSearchState) => void;
}

export interface DispatchFileViewerLocationChangeInput {
  anchor: FileViewerDocumentAnchor | null;
  onChange?: (anchor: FileViewerDocumentAnchor | null) => void;
}

export interface FileViewerDocumentFeatureActionOptions {
  notify?: boolean;
}

export interface FileViewerDocumentFeatureSearchController {
  getAnchors(): FileViewerDocumentAnchor[];
  getSearchState(): FileViewerSearchState;
  observe(): void;
  refreshAnchors(): Promise<FileViewerDocumentAnchor[]>;
  search(query: string): Promise<unknown>;
  clear(): Promise<unknown>;
  next(): Promise<unknown>;
  previous(): Promise<unknown>;
}

export interface CreateFileViewerDocumentFeatureActionsInput {
  root: () => HTMLElement | null | undefined;
  searchController: FileViewerDocumentFeatureSearchController;
  getAiOptions?: () => boolean | FileViewerAiOptions | undefined;
  onSearchChange?: (state: FileViewerSearchState) => void;
  onLocationChange?: (anchor: FileViewerDocumentAnchor | null) => void;
}

export interface FileViewerDocumentFeatureActions {
  refreshDocumentIndex(options?: FileViewerDocumentFeatureActionOptions): Promise<FileViewerDocumentAnchor[]>;
  clearDocumentState(): Promise<FileViewerSearchState>;
  getScrollContainer(): HTMLElement | null;
  searchDocument(query: string): Promise<FileViewerSearchState>;
  clearDocumentSearch(): Promise<FileViewerSearchState>;
  nextSearchResult(): Promise<FileViewerSearchState>;
  previousSearchResult(): Promise<FileViewerSearchState>;
  getSearchState(): FileViewerSearchState;
  collectDocumentAnchors(options?: FileViewerDocumentFeatureActionOptions): Promise<FileViewerDocumentAnchor[]>;
  getCurrentDocumentAnchor(): FileViewerDocumentAnchor | null;
  scrollToLoadedAnchor(
    anchor: FileViewerDocumentAnchor | string | number | null | undefined,
    options?: FileViewerDocumentFeatureActionOptions
  ): boolean;
  scrollToAnchor(
    anchor: FileViewerDocumentAnchor | string | number | null | undefined,
    options?: FileViewerDocumentFeatureActionOptions
  ): Promise<boolean>;
  scrollToLine(line: number, options?: FileViewerDocumentFeatureActionOptions): Promise<boolean>;
  getDocumentTextChunks(options?: boolean | FileViewerAiOptions): FileViewerDocumentChunk[];
}

export interface CreateFileViewerDocumentFeatureControllerActionHandlersInput
  extends Omit<CreateFileViewerDocumentFeatureActionsInput, 'searchController'> {
  searchTarget: FileViewerDomSearchControllerStateTarget;
  searchOptions?: () => boolean | FileViewerSearchOptions | undefined;
  waitForDomUpdate?: () => Promise<void> | void;
  preferredScrollContainer?: () => HTMLElement | null | undefined;
}

export interface FileViewerDocumentFeatureControllerActionHandlers extends FileViewerDocumentFeatureActions {
  destroyDocumentFeatures(): FileViewerSearchState;
}

export const createFileViewerSearchChangeState = (
  state: FileViewerSearchState
): FileViewerSearchState => {
  return cloneFileViewerSearchState(state);
};

export const resolveFileViewerLocationChangeAnchor = ({
  root,
  anchors,
}: ResolveFileViewerLocationChangeAnchorInput) => {
  return getCurrentFileViewerDocumentAnchor(root || null, anchors);
};

export const createFileViewerDocumentChangeSnapshot = ({
  root,
  anchors,
  searchState,
}: CreateFileViewerDocumentChangeSnapshotInput): FileViewerDocumentChangeSnapshot => {
  return {
    searchState: createFileViewerSearchChangeState(searchState),
    locationAnchor: resolveFileViewerLocationChangeAnchor({ root, anchors }),
  };
};

export const createFileViewerDocumentFeatureControllerActionHandlers = ({
  root,
  searchTarget,
  searchOptions,
  waitForDomUpdate,
  preferredScrollContainer,
  getAiOptions,
  onSearchChange,
  onLocationChange,
}: CreateFileViewerDocumentFeatureControllerActionHandlersInput): FileViewerDocumentFeatureControllerActionHandlers => {
  let documentActions: FileViewerDocumentFeatureActions | null = null;
  const searchController = createFileViewerDomSearchController({
    root,
    options: searchOptions,
    waitForDomUpdate,
    preferredScrollContainer: () => preferredScrollContainer?.() ?? documentActions?.getScrollContainer() ?? null,
  });
  const searchActions = createFileViewerDomSearchControllerActionHandlers(searchTarget, searchController);

  documentActions = createFileViewerDocumentFeatureActions({
    root,
    searchController: {
      getAnchors: () => searchTarget.anchors.value,
      getSearchState: () => searchTarget.state,
      observe: searchActions.observe,
      refreshAnchors: searchActions.refreshAnchors,
      search: searchActions.search,
      clear: searchActions.clear,
      next: searchActions.next,
      previous: searchActions.previous,
    },
    getAiOptions,
    onSearchChange,
    onLocationChange,
  });

  return {
    ...documentActions,
    destroyDocumentFeatures: searchActions.destroy,
  };
};

export const dispatchFileViewerSearchChange = ({
  state,
  onChange,
}: DispatchFileViewerSearchChangeInput) => {
  const payload = createFileViewerSearchChangeState(state);
  onChange?.(payload);
  return true;
};

export const dispatchFileViewerLocationChange = ({
  anchor,
  onChange,
}: DispatchFileViewerLocationChangeInput) => {
  onChange?.(anchor);
  return true;
};

export const createFileViewerDocumentFeatureActions = ({
  root,
  searchController,
  getAiOptions,
  onSearchChange,
  onLocationChange,
}: CreateFileViewerDocumentFeatureActionsInput): FileViewerDocumentFeatureActions => {
  const getRoot = () => root() || null;
  const getAnchors = () => searchController.getAnchors();

  const getSearchState = () => createFileViewerSearchChangeState(searchController.getSearchState());

  const notifySearchChange = () => {
    const state = getSearchState();
    dispatchFileViewerSearchChange({
      state,
      onChange: onSearchChange,
    });
    return state;
  };

  const getCurrentDocumentAnchor = () => {
    return resolveFileViewerLocationChangeAnchor({
      root: getRoot(),
      anchors: getAnchors(),
    });
  };

  const notifyLocationChange = () => {
    const anchor = getCurrentDocumentAnchor();
    dispatchFileViewerLocationChange({
      anchor,
      onChange: onLocationChange,
    });
    return anchor;
  };

  const maybeNotifyLocationChange = (actionOptions?: FileViewerDocumentFeatureActionOptions) => {
    if (actionOptions?.notify === false) {
      return getCurrentDocumentAnchor();
    }
    return notifyLocationChange();
  };

  const refreshDocumentIndex = async (actionOptions?: FileViewerDocumentFeatureActionOptions) => {
    searchController.observe();
    const anchors = await searchController.refreshAnchors();
    maybeNotifyLocationChange(actionOptions);
    return anchors;
  };

  const ensureAnchors = async (actionOptions?: FileViewerDocumentFeatureActionOptions) => {
    if (!getAnchors().length) {
      await refreshDocumentIndex(actionOptions);
    }
    return getAnchors();
  };

  const scrollToLoadedAnchor = (
    anchor: FileViewerDocumentAnchor | string | number | null | undefined,
    actionOptions?: FileViewerDocumentFeatureActionOptions
  ) => {
    const result = scrollToFileViewerDocumentAnchor(getRoot(), anchor);
    maybeNotifyLocationChange(actionOptions);
    return result;
  };

  return {
    refreshDocumentIndex,
    async clearDocumentState() {
      await searchController.clear();
      return getSearchState();
    },
    getScrollContainer() {
      return resolveFileViewerScrollContainer(getRoot());
    },
    async searchDocument(query: string) {
      await searchController.search(query);
      return notifySearchChange();
    },
    async clearDocumentSearch() {
      await searchController.clear();
      return notifySearchChange();
    },
    async nextSearchResult() {
      await searchController.next();
      notifyLocationChange();
      return notifySearchChange();
    },
    async previousSearchResult() {
      await searchController.previous();
      notifyLocationChange();
      return notifySearchChange();
    },
    getSearchState,
    async collectDocumentAnchors(actionOptions?: FileViewerDocumentFeatureActionOptions) {
      await refreshDocumentIndex(actionOptions);
      return getAnchors();
    },
    getCurrentDocumentAnchor,
    scrollToLoadedAnchor,
    async scrollToAnchor(
      anchor: FileViewerDocumentAnchor | string | number | null | undefined,
      actionOptions?: FileViewerDocumentFeatureActionOptions
    ) {
      await ensureAnchors(actionOptions);
      return scrollToLoadedAnchor(anchor, actionOptions);
    },
    async scrollToLine(line: number, actionOptions?: FileViewerDocumentFeatureActionOptions) {
      await ensureAnchors(actionOptions);
      return scrollToLoadedAnchor(line, actionOptions);
    },
    getDocumentTextChunks(textOptions?: boolean | FileViewerAiOptions) {
      return buildFileViewerDocumentTextChunks(getAnchors(), textOptions ?? getAiOptions?.());
    },
  };
};
