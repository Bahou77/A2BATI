import { TestBed } from '@angular/core/testing';
import { AppComponent, pickHourlyPhotos } from './app.component';

describe('pickHourlyPhotos', () => {
  const photos = Array.from({ length: 15 }, (_, i) => i);

  it('returns 6 distinct photos and is stable within the same hour', () => {
    const first = pickHourlyPhotos(photos, 500000);

    expect(first.length).toBe(6);
    expect(new Set(first).size).toBe(6);
    expect(pickHourlyPhotos(photos, 500000)).toEqual(first);
  });

  it('changes the selection from one hour to the next', () => {
    expect(pickHourlyPhotos(photos, 500001)).not.toEqual(pickHourlyPhotos(photos, 500000));
  });

  it('returns every photo when there are fewer than 6', () => {
    expect(pickHourlyPhotos([1, 2, 3], 500000).length).toBe(3);
  });
});

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

    const photoButton = fixture.nativeElement.querySelector('.gallery-card-button') as HTMLButtonElement;
    photoButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')?.getAttribute('aria-label'))
      .toBe('Cuisine rénovée');

    app.onDocumentKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('should enlarge the business card from the footer', () => {
    spyOn(window, 'fetch').and.resolveTo(new Response('[]', { status: 200 }));
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const cardButton = fixture.nativeElement.querySelector('.footer-card') as HTMLButtonElement;
    cardButton.click();
    fixture.detectChanges();

    const image = fixture.nativeElement.querySelector('.lightbox-figure img') as HTMLImageElement;
    expect(image.getAttribute('src')).toBe('/carte-visite.webp');

    fixture.componentInstance.onDocumentKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
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
