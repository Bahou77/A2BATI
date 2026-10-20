import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

interface ProjectRequest {
  name: string;
  email: string;
  phone: string;
  town: string;
  details: string;
}

interface GalleryPhoto {
  title: string;
  src: string;
  full: string;
}

interface Review {
  author: string;
  rating: number;
  text: string;
  date?: string;
  subtitle?: string;
}

interface ReviewsPayload {
  rating?: number;
  count?: number;
  url?: string;
  reviews: Review[];
}

interface ReviewsSummary {
  ratingLabel: string;
  count: number;
  url?: string;
}

const MIN_CARDS_PER_LOOP = 6;

const GALLERY_SIZE = 6;
const ONE_HOUR_MS = 60 * 60 * 1000;

// Tirage déterministe : tous les visiteurs voient les mêmes photos pendant une heure.
export function pickHourlyPhotos<T>(photos: T[], hourIndex: number, count = GALLERY_SIZE): T[] {
  let seed = hourIndex >>> 0;
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const shuffled = [...photos];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

@Component({
  selector: 'app-root',
  imports: [FormsModule, ButtonModule, CardModule],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit, OnDestroy {
  menuOpen = false;
  showPhoneNumber = false;
  formStatus: 'idle' | 'submitting' | 'success' | 'error' = 'idle';
  formErrorMessage = 'L’envoi n’a pas abouti. Réessayez ou contactez-nous par téléphone ou par e-mail.';
  galleryPhotos: GalleryPhoto[] = [];
  galleryStatus: 'loading' | 'loaded' | 'error' = 'loading';
  selectedPhoto: GalleryPhoto | null = null;
  marqueeReviews: Review[] = [];
  reviewsSetSize = 0;
  reviewsDuration = 40;
  reviewsSummary: ReviewsSummary | null = null;
  private allPhotos: GalleryPhoto[] = [];
  private galleryTimer?: ReturnType<typeof setTimeout>;

  request: ProjectRequest = {
    name: '',
    email: '',
    phone: '',
    town: '',
    details: ''
  };

  readonly services = [
    {
      number: '01',
      title: 'Construction',
      text: 'Étude du projet, consultation des entreprises, coordination des corps d’état et suivi jusqu’à la réception.'
    },
    {
      number: '02',
      title: 'Rénovation & extension',
      text: 'Transformer l’existant, optimiser les espaces et piloter vos travaux en toute sérénité.'
    },
    {
      number: '03',
      title: 'Locaux professionnels',
      text: 'Bureaux, commerces, cabinets : conception, rénovation et coordination des interventions.'
    },
    {
      number: '04',
      title: 'Mission ciblée',
      text: 'Faisabilité, analyse de devis ou suivi ponctuel selon vos besoins.'
    }
  ];

  readonly stages = [
    { number: '01', title: 'Préparation du terrain', image: 'photo-1500382017468-9049fed747ef' },
    { number: '02', title: 'Terrassement & réseaux', image: 'photo-1504307651254-35680f356dfd' },
    { number: '03', title: 'Fondations', image: 'photo-1517581177682-a085bb7ffb15' },
    { number: '04', title: 'Plancher & réservation', image: 'photo-1503387762-592deb58ef4e' },
    { number: '05', title: 'Élévation', image: 'photo-1600607687939-ce8a6c25118c' },
    { number: '06', title: 'Clos couvert', image: 'photo-1600585154340-be6161a56a0c' },
    { number: '07', title: 'Aménagement extérieur', image: 'photo-1600566753086-00f18fb6b3ea' },
    { number: '08', title: 'Projet livré', image: 'photo-1600607687920-4e2a09cf159d' }
  ];

  readonly renovationSteps = [
    { title: 'Avant — lecture de l’existant', image: 'photo-1600210492486-724fe5c67fb0' },
    { title: 'Ouvertures & structure', image: 'photo-1600607687939-ce8a6c25118c' },
    { title: 'Second œuvre & isolation', image: 'photo-1600607687920-4e2a09cf159d' },
    { title: 'Finitions & détails', image: 'photo-1600566753086-00f18fb6b3ea' }
  ];

  readonly towns = [
    'Cestas',
    'Bordeaux Métropole',
    'Pessac',
    'Gradignan',
    'Léognan',
    'Bassin d’Arcachon',
    'La Teste-de-Buch',
    'Gujan-Mestras',
    'Arcachon',
    'Agen'
  ];

  ngOnInit(): void {
    void this.loadGallery();
    void this.loadReviews();
  }

  ngOnDestroy(): void {
    clearTimeout(this.galleryTimer);
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  togglePhoneNumber(): void {
    this.showPhoneNumber = !this.showPhoneNumber;
  }

  imageUrl(photoId: string, width = 900): string {
    return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&q=85`;
  }

  async loadGallery(): Promise<void> {
    try {
      const response = await fetch('/gallery/gallery.json');
      if (!response.ok) {
        throw new Error(`Gallery manifest request failed with status ${response.status}.`);
      }

      const photos: unknown = await response.json();
      if (!Array.isArray(photos) || !photos.every(this.isGalleryPhoto)) {
        throw new Error('Gallery manifest has an invalid format.');
      }

      this.allPhotos = photos;
      this.galleryStatus = 'loaded';
      this.refreshGallery();
    } catch (error) {
      console.error('Unable to load the project gallery.', error);
      this.galleryStatus = 'error';
    }
  }

  private refreshGallery(): void {
    const now = Date.now();
    this.galleryPhotos = pickHourlyPhotos(this.allPhotos, Math.floor(now / ONE_HOUR_MS));

    clearTimeout(this.galleryTimer);
    const msUntilNextHour = ONE_HOUR_MS - (now % ONE_HOUR_MS);
    this.galleryTimer = setTimeout(() => this.refreshGallery(), msUntilNextHour + 1000);
  }

  stars(rating: number): string {
    const filled = Math.max(0, Math.min(5, Math.round(rating)));
    return '★'.repeat(filled) + '☆'.repeat(5 - filled);
  }

  async loadReviews(): Promise<void> {
    // Les avis sont saisis à la main dans public/reviews.json.
    const payload = await this.fetchReviews('/reviews.json');

    if (!payload || payload.reviews.length === 0) {
      return;
    }

    if (payload.rating !== undefined && payload.count !== undefined) {
      this.reviewsSummary = {
        ratingLabel: payload.rating.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        count: payload.count,
        url: payload.url
      };
    }

    const repeat = Math.ceil(MIN_CARDS_PER_LOOP / payload.reviews.length);
    const loop = Array.from({ length: repeat }, () => payload.reviews).flat();
    this.reviewsSetSize = loop.length;
    this.reviewsDuration = Math.max(60, loop.length * 14);
    this.marqueeReviews = [...loop, ...loop];
  }

  private async fetchReviews(url: string): Promise<ReviewsPayload | null> {
    try {
      const response = await fetch(url);
      const isJson = response.headers.get('content-type')?.includes('json') ?? false;
      if (!response.ok || !isJson) {
        return null;
      }

      const payload: unknown = await response.json();
      return this.isReviewsPayload(payload) ? payload : null;
    } catch (error) {
      console.error(`Unable to load reviews from ${url}.`, error);
      return null;
    }
  }

  private isReviewsPayload(payload: unknown): payload is ReviewsPayload {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }

    const candidate = payload as Record<string, unknown>;
    return Array.isArray(candidate['reviews']) && candidate['reviews'].every(review =>
      typeof review === 'object' && review !== null
      && typeof (review as Record<string, unknown>)['author'] === 'string'
      && typeof (review as Record<string, unknown>)['rating'] === 'number'
      && typeof (review as Record<string, unknown>)['text'] === 'string'
    );
  }

  openPhoto(photo: GalleryPhoto): void {
    this.selectedPhoto = photo;
  }

  closePhoto(event?: MouseEvent): void {
    if (!event || event.target === event.currentTarget) {
      this.selectedPhoto = null;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.selectedPhoto = null;
    }
  }

  private isGalleryPhoto(photo: unknown): photo is GalleryPhoto {
    if (typeof photo !== 'object' || photo === null) {
      return false;
    }

    const candidate = photo as Record<string, unknown>;
    return typeof candidate['title'] === 'string'
      && typeof candidate['src'] === 'string'
      && typeof candidate['full'] === 'string';
  }

  async submitRequest(): Promise<void> {
    if (this.formStatus === 'submitting') {
      return;
    }

    if (['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) {
      this.formErrorMessage = 'Le formulaire sera actif après le déploiement du site sur Netlify.';
      this.formStatus = 'error';
      return;
    }

    this.formStatus = 'submitting';

    const formData = new URLSearchParams({
      'form-name': 'contact',
      name: this.request.name,
      email: this.request.email,
      phone: this.request.phone,
      town: this.request.town,
      details: this.request.details
    });

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });

      if (!response.ok) {
        console.error(`Netlify Forms submission failed with status ${response.status}.`);
        this.formStatus = 'error';
        return;
      }

      this.formStatus = 'success';
      this.request = { name: '', email: '', phone: '', town: '', details: '' };
    } catch (error) {
      console.error('Unable to submit the contact form to Netlify Forms.', error);
      this.formStatus = 'error';
    }
  }
}
