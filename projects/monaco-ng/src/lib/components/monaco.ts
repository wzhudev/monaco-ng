import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { editor } from 'monaco-editor';
import { BehaviorSubject, combineLatest, fromEvent, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  takeUntil
} from 'rxjs/operators';
import { MonacoService } from '../monaco.service';
import { EditorMode, JoinedEditorOption } from '../typings';
import { inNextTick } from '../utils';

import IEditor = editor.IEditor;
import IDiffEditor = editor.IDiffEditor;
import ITextModel = editor.ITextModel;
import IEditorConstructionOptions = editor.IEditorConstructionOptions;
import IDiffEditorConstructionOptions = editor.IDiffEditorConstructionOptions;

declare const monaco: any;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  selector: 'si-monaco-editor',
  templateUrl: './monaco.html',
  styleUrls: ['./monaco.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MonacoComponent),
      multi: true
    }
  ]
})
export class MonacoComponent
  implements AfterViewInit, ControlValueAccessor, OnChanges, OnDestroy {
  @Input() mode: EditorMode = 'normal';
  @Input() originalText = '';
  @Input() fullControl = false;
  @Input() set editorOption(value: JoinedEditorOption) {
    this.editorOption$.next(value);
  }

  @Output() readonly editorInitialized = new EventEmitter<
    IEditor | IDiffEditor
  >();

  private readonly el: HTMLElement;
  private destroy$ = new Subject<void>();
  private resize$ = new Subject<void>();
  private editorOption$ = new BehaviorSubject<JoinedEditorOption>({});
  private editorInstance: IEditor | IDiffEditor;
  private value = '';
  private modelSet = false;

  private editorOptionCached: JoinedEditorOption = {};

  constructor(
    private monacoService: MonacoService,
    private ngZone: NgZone,
    elementRef: ElementRef
  ) {
    this.el = elementRef.nativeElement;
  }

  ngOnChanges(changes: SimpleChanges): void {}

  /**
   * Initialize a monaco editor instance.
   */
  ngAfterViewInit(): void {
    this.monacoService.requestToInit().subscribe(option => this.setup(option));
  }

  ngOnDestroy(): void {
    this.editorInstance.dispose();

    this.destroy$.next();
    this.destroy$.complete();
  }

  writeValue(value: string): void {
    this.value = value;
    this.setValue();
  }

  registerOnChange(fn: (value: string) => void): any {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  onChange(value: string): void {}

  onTouch(): void {}

  layout(): void {
    this.resize$.next();
  }

  private setup(option: JoinedEditorOption): void {
    inNextTick().subscribe(() => {
      this.editorOptionCached = option;
      this.registerOptionChanges();
      this.initMonacoEditorInstance();
      this.registerResizeChange();
      this.setValue();

      if (!this.fullControl) {
        this.setValueEmitter();
      }

      this.editorInitialized.next(this.editorInstance);
    });
  }

  private registerOptionChanges(): void {
    combineLatest(this.editorOption$, this.monacoService.forceUpdateOption$)
      .pipe(takeUntil(this.destroy$))
      .subscribe(([selfOpt, forcedOpt]) => {
        this.editorOptionCached = {
          ...this.editorOptionCached,
          ...selfOpt,
          ...forcedOpt
        };
        this.updateOptionToMonaco();
      });
  }

  private initMonacoEditorInstance(): void {
    this.ngZone.runOutsideAngular(() => {
      this.editorInstance =
        this.mode === 'normal'
          ? monaco.editor.create(this.el, { ...this.editorOptionCached })
          : monaco.editor.createDiffEditor(this.el, {
              ...(this.editorOptionCached as IDiffEditorConstructionOptions)
            });
    });
  }

  private registerResizeChange(): void {
    this.ngZone.runOutsideAngular(() => {
      fromEvent(window, 'resize')
        .pipe(
          debounceTime(300),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          this.layout();
        });

      this.resize$
        .pipe(
          takeUntil(this.destroy$),
          filter(() => !!this.editorInstance),
          map(() => ({
            width: this.el.clientWidth,
            height: this.el.clientHeight
          })),
          distinctUntilChanged(
            (a, b) => a.width === b.width && a.height === b.height
          ),
          debounceTime(50)
        )
        .subscribe(() => {
          this.editorInstance.layout();
        });
    });
  }

  private setValue(): void {
    if (!this.editorInstance) {
      return;
    }

    if (this.mode === 'normal') {
      if (this.modelSet) {
        (this.editorInstance.getModel() as ITextModel).setValue(this.value);
      } else {
        (this.editorInstance as IEditor).setModel(
          monaco.editor.createModel(
            this.value,
            (this.editorOptionCached as IEditorConstructionOptions).language
          )
        );
        this.modelSet = true;
      }
    } else {
      if (this.modelSet) {
        const model = (this.editorInstance as IDiffEditor).getModel();
        model.modified.setValue(this.value);
        model.original.setValue(this.originalText);
      } else {
        const language = (this.editorOptionCached as any).language;
        (this.editorInstance as IDiffEditor).setModel({
          original: monaco.editor.createModel(this.value, language),
          modified: monaco.editor.createModel(this.originalText, language)
        });
      }
    }
  }

  private setValueEmitter(): void {
    const model = (this.mode === 'normal'
      ? (this.editorInstance as IEditor).getModel()
      : (this.editorInstance as IDiffEditor).getModel().modified) as ITextModel;

    model.onDidChangeContent(() => {
      this.emitValue(model.getValue());
    });
  }

  private emitValue(value: string): void {
    this.value = value;
    this.onChange(value);
  }

  private updateOptionToMonaco(): void {
    if (this.editorInstance) {
      this.editorInstance.updateOptions({ ...this.editorOptionCached });
    }
  }
}
