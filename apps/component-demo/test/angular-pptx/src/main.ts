import { Component, ElementRef, ViewChild, type AfterViewInit, type OnDestroy } from '@angular/core'
import { bootstrapApplication } from '@angular/platform-browser'
import { mountViewer, type ViewerController } from '@file-viewer/web'
import officePreset from '@file-viewer/preset-office'

@Component({
  selector: 'app-root',
  standalone: true,
  template: '<div #host data-testid="angular-pptx-host" style="height:760px"></div>'
})
class App implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>
  private viewer?: ViewerController
  private unsubscribe?: () => void

  ngAfterViewInit() {
    this.viewer = mountViewer(this.host.nativeElement, {
      url: new URL('sample.pptx', document.baseURI).href,
      options: { preset: officePreset, locale: 'en-US' }
    })
    this.unsubscribe = this.viewer.subscribe((state) => {
      this.host.nativeElement.dataset.viewerState = state.error
        ? 'error'
        : state.loading
          ? 'loading'
          : state.ready
            ? 'ready'
            : 'idle'
    })
  }

  ngOnDestroy() {
    this.unsubscribe?.()
    this.viewer?.destroy()
  }
}

bootstrapApplication(App).catch((error) => console.error(error))
