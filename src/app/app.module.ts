import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BulbOutline, PoweroffOutline } from '@ant-design/icons-angular/icons';
import { NZ_ICONS, NzIconModule, NzSwitchModule } from 'ng-zorro-antd';
import {
  MONACO_CONFIG,
  SiMonacoModule
} from 'projects/monaco-ng/src/public-api';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    FormsModule,
    SiMonacoModule,
    NzSwitchModule,
    NzIconModule
  ],
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
    },
    {
      provide: NZ_ICONS,
      useValue: [BulbOutline, PoweroffOutline]
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
