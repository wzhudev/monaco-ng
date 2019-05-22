import { Component } from '@angular/core';
import { editor } from 'monaco-editor';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'monaco-ng';

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

  onModelChange(value: string): void {
    console.log(value);
  }
}
