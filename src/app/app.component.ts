import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { editor } from 'monaco-editor';
import { MonacoService } from 'projects/monaco-ng/src/public-api';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'monaco-ng';
  dark = false;

  editorOption: editor.IEditorConstructionOptions = {
    scrollBeyondLastLine: false,
    language: 'typescript'
  };

  code = `@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'monaco-ng';

  code // And recursively.
}`;

  originalText = `@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'monaco-ng';
}`;

  constructor(
    private monacoService: MonacoService,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: any
  ) {}

  onModelChange(value: string): void {
    console.log(value);
  }

  onToggleTheme(): void {
    const next = this.dark ? 'vs-dark' : 'vs';
    this.monacoService.updateDefaultOption({ theme: next });
    this.toggleBodyTheme();
  }

  toggleBodyTheme(): void {
    this.renderer.addClass(this.document.body, this.dark ? 'dark' : 'light');
    this.renderer.removeClass(this.document.body, this.dark ? 'light' : 'dark');
  }

  ngOnInit(): void {
    this.toggleBodyTheme();
  }
}
