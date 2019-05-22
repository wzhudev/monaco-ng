import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import {
  SiMonacoModule,
  MONACO_CONFIG
} from 'projects/monaco-ng/src/public-api';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, FormsModule, SiMonacoModule],
  providers: [
    {
      provide: MONACO_CONFIG,
      useValue: {
        defaultEditorOption: {
          language: 'typescript',
          fontSize: 14
        },
        onLoad() {
          console.log('load');
        }
      }
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
