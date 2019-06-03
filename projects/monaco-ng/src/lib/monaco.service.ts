import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from "@angular/common";
import { BehaviorSubject, Observable, of as observableOf, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { getMonacoScriptsCannotBeLoadedError } from './errors';
import {
  JoinedEditorOption,
  MONACO_CONFIG,
  MonacoConfig,
  MonacoLoadingStatus
} from './typings';
import { tryTriggerFunc } from './utils';

declare const monaco: any;

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
  forceUpdateOption$: Observable<JoinedEditorOption>;

  private config: MonacoConfig;
  private option: JoinedEditorOption;
  private document: Document;
  private firstEditorInitialized = false;
  private forceOption: JoinedEditorOption = {};
  private force$: Subject<JoinedEditorOption>;
  private loaded$ = new Subject<boolean>();
  private loadingStatus = MonacoLoadingStatus.UNLOAD;

  constructor(
    @Inject(DOCUMENT) _document: any,
    @Inject(MONACO_CONFIG) _config: MonacoConfig[] | MonacoConfig
  ) {
    this.document = _document;
    this.config = { ...(_config instanceof Array ? _config[0] : _config) };
    this.option = this.config.defaultEditorOption || {};

    this.force$ = new BehaviorSubject<JoinedEditorOption>({});
    this.forceUpdateOption$ = this.force$.asObservable();
  }

  /**
   * Monaco component would call this method make sure everything
   * is ready for initializing an editor.
   */
  requestToInit(): Observable<JoinedEditorOption> {
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

  updateDefaultOption(option: JoinedEditorOption, force = false): void {
    if (force) {
      this.forceOption = { ...this.forceOption, ...option };
      this.force$.next(this.forceOption);
    }

    this.option = { ...this.option, ...option };

    if (option.theme) {
      monaco.editor.setTheme(option.theme);
    }
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
      tryTriggerFunc(this.config.onFirstEditorInit)();
    }

    tryTriggerFunc(this.config.onInit)();
  }

  private onLoad(): void {
    tryTriggerFunc(this.config.onLoad)();
  }

  private getLatestOption(): JoinedEditorOption {
    return { ...this.option, ...this.forceOption };
  }
}
