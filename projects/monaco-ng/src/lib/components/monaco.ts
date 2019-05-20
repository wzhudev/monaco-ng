import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  AfterViewInit,
  forwardRef,
  OnDestroy,
  NgZone,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { editor } from 'monaco-editor';
import { MonacoService } from '../monaco.service';
import { EditorMode, EditorOption } from '../typings';
import { inNextTick } from '../utils';
import { fromEvent, Subject } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  takeUntil
} from 'rxjs/operators';

import IEditor = editor.IEditor;
import IDiffEditor = editor.IDiffEditor;
import IDiffEditorModel = editor.IDiffEditorModel;
import ITextModel = editor.ITextModel;
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

  @Output() readonly editorInitialized = new EventEmitter<
    IEditor | IDiffEditor
  >();

  private readonly el: HTMLElement;
  private destroy$ = new Subject<void>();
  private resize$ = new Subject<void>();
  private editorOption: EditorOption = {};
  private editorInstance: IEditor | IDiffEditor;
  private value = '';
  private valueModel: ITextModel | IDiffEditorModel;
  private originalModel: ITextModel;

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

  private setup(option: EditorOption): void {
    inNextTick().subscribe(() => {
      this.editorOption = option;
      this.registerOptionChanges();
      this.initMonacoEditorInstance();
      this.registerResizeChange();

      if (!this.fullControl) {
        this.setValueEmitter();
      }

      this.editorInitialized.next(this.editorInstance);
    });
  }

  private registerOptionChanges(): void {
    // TODO: use `combineLatest` to merge option on the instance.
    this.monacoService.forceUpdateOption$
      .pipe(takeUntil(this.destroy$))
      .subscribe(forcedOpt => {
        this.editorOption = { ...this.editorOption, ...forcedOpt };
        this.updateOptionToMonaco();
      });
  }

  private initMonacoEditorInstance(): void {
    this.ngZone.runOutsideAngular(() => {
      this.editorInstance =
        this.mode === 'normal'
          ? monaco.editor.create(this.el, { ...this.editorOption })
          : monaco.editor.createDiffEditor(this.el, {
              ...(this.editorOption as IDiffEditorConstructionOptions)
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
          this.resize$.next();
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
      if (this.valueModel) {
        (this.valueModel as ITextModel).setValue(this.value);
      } else {
        this.valueModel = monaco.editor.createModel(
          this.value,
          this.editorOption.language
        );
        (this.editorInstance as IEditor).setModel(this.valueModel);
      }
    } else {
      if (this.valueModel) {
        const model = this.valueModel as IDiffEditorModel;
        model.modified.setValue(this.value);
        model.original.setValue(this.originalText);
      } else {
        this.valueModel = monaco.editor.createModel(
          this.value,
          this.editorOption.language
        );
        this.originalModel = monaco.editor.createModel(
          this.originalText,
          this.editorOption.language
        );
        (this.editorInstance as IDiffEditor).setModel({
          original: this.originalModel,
          modified: this.valueModel as ITextModel
        });
      }
    }
  }

  private setValueEmitter(): void {
    const model =
      this.mode === 'normal'
        ? (this.valueModel as ITextModel)
        : (this.valueModel as IDiffEditorModel).modified;

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
      this.editorInstance.updateOptions({ ...this.editorOption });
    }
  }
}
