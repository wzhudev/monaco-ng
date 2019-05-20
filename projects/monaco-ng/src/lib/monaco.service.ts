import { Injectable, Inject } from '@angular/core';
import { Observable, Subject, of as observableOf, BehaviorSubject } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import {
  MonacoLoadingStatus,
  MonacoConfig,
  MONACO_CONFIG,
  EditorOption
} from './typings';
import { DOCUMENT } from '@angular/platform-browser';
import { getMonacoScriptsCannotBeLoadedError } from './errors';
import { tryTriggerFunc } from './utils';

/**
 *
 */
@Injectable({
  providedIn: 'root'
})
export class MonacoService {
  /**
   * Editor subscribe this to get force updated config.
   */
  forceUpdateOption$: Observable<EditorOption>;

  private config: MonacoConfig;
  private option: EditorOption;
  private document: Document;
  private firstEditorInitialized = false;
  private forceOption: EditorOption = {};
  private force$: Subject<MonacoConfig>;
  private loaded$ = new Subject<boolean>();
  private loadingStatus = MonacoLoadingStatus.UNLOAD;

  constructor(
    @Inject(DOCUMENT) _document: any,
    @Inject(MONACO_CONFIG) _config: MonacoConfig[] | MonacoConfig
  ) {
    this.document = _document;
    this.config = { ...(_config instanceof Array ? _config[0] : _config) };
    this.option = this.config.defaultEditorOption || {};

    this.force$ = new Subject<EditorOption>();
    this.forceUpdateOption$ = this.force$.asObservable();
  }

  /**
   * Monaco component would call this method make sure everything
   * is ready for initializing an editor.
   */
  requestToInit(): Observable<EditorOption> {
    if (this.loadingStatus === MonacoLoadingStatus.LOADED) {
      this.onInit();
      return observableOf(this.getLatestOption());
    }

    if (this.loadingStatus === MonacoLoadingStatus.UNLOAD) {
      this.loadMonacoScript();
    }

    return this.loaded$.asObservable().pipe(
      tap(() => this.onInit()),
      map(() => this.getLatestOption())
    );
  }

  updateDefaultOption(option: EditorOption, force = false): void {
    if (force) {
      this.forceOption = { ...this.forceOption, ...option };
      this.force$.next(this.forceOption);
    }

    this.option = { ...this.option, ...option };
  }

  private loadMonacoScript(): void {
    if (this.loadingStatus === MonacoLoadingStatus.LOADING) {
      return;
    }

    this.loadingStatus = MonacoLoadingStatus.LOADING;

    const assetsRoot = this.config.assetsRoot;
    const vs = assetsRoot ? `${assetsRoot}/vs` : 'assets/vs';
    const windowAsAny = window as any;
    const loadScript = this.document.createElement('script');

    loadScript.type = 'text/javascript';
    loadScript.src = `${vs}/loader.js`;
    loadScript.onload = () => {
      windowAsAny.require.config({
        paths: { vs }
      });
      windowAsAny.require(['vs/editor/editor.main'], () => {
        this.loadingStatus = MonacoLoadingStatus.LOADED;
        this.loaded$.next(true);
        this.loaded$.complete();
        this.onLoad();
      });
    };
    loadScript.onerror = () => {
      throw getMonacoScriptsCannotBeLoadedError(vs);
    };

    this.document.documentElement.appendChild(loadScript);
  }

  private onInit(): void {
    if (!this.firstEditorInitialized) {
      this.firstEditorInitialized = true;
      tryTriggerFunc(this.config.onFirstEditorCreated)();
    }

    tryTriggerFunc(this.config.onInit)();
  }

  private onLoad(): void {
    tryTriggerFunc(this.config.onLoad)();
  }

  private getLatestOption(): EditorOption {
    return { ...this.option, ...this.forceOption };
  }
}
