import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent]
    }).compileComponents();
  });

  it('should create the app', () => {
    spyOn(window, 'fetch').and.resolveTo(new Response('[]', { status: 200 }));
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display project photos in an accessible lightbox', () => {
    spyOn(window, 'fetch').and.resolveTo(new Response('[]', { status: 200 }));
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    app.galleryStatus = 'loaded';
    app.galleryPhotos = [{ title: 'Cuisine rénovée', src: '/gallery/thumbs/cuisine.webp', full: '/gallery/full/cuisine.webp' }];
    fixture.detectChanges();

    const photoButton = fixture.nativeElement.querySelector('.gallery-card') as HTMLButtonElement;
    photoButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')?.getAttribute('aria-label'))
      .toBe('Cuisine rénovée');

    app.onDocumentKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('should toggle the phone number inside the call button', () => {
    spyOn(window, 'fetch').and.resolveTo(new Response('[]', { status: 200 }));
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const callButton = fixture.nativeElement.querySelector('.hero-actions .button-orange') as HTMLButtonElement;
    callButton.click();
    fixture.detectChanges();
    expect(callButton.textContent).toContain('06 63 11 37 51');

    callButton.click();
    fixture.detectChanges();
    expect(callButton.textContent).toContain('Appeler');
    expect(callButton.textContent).not.toContain('06 63 11 37 51');
  });
});
