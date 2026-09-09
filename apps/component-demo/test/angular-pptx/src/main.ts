import { Component, ElementRef, ViewChild, type AfterViewInit, type OnDestroy } from '@angular/core'
import { bootstrapApplication } from '@angular/platform-browser'
import { mountViewer, type ViewerController } from '@file-viewer/web'
import officePreset from '@file-viewer/preset-office'

@Component({
  selector: 'app-root',
  standalone: true,
  template: '<div #host style="height:760px"></div>'
})
class App implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>
  private viewer?: ViewerController

  ngAfterViewInit() {
    const presentation = new URLSearchParams(location.search).has('explicit-worker')
      ? { workerUrl: new URL('file-viewer/vendor/pptx/pptx.worker.js', document.baseURI).href }
      : undefined
    this.viewer = mountViewer(this.host.nativeElement, {
      url: new URL('sample.pptx', document.baseURI).href,
      options: { preset: officePreset, locale: 'en-US', presentation }
    })
  }

  ngOnDestroy() {
    this.viewer?.destroy()
  }
}

bootstrapApplication(App).catch((error) => console.error(error))
