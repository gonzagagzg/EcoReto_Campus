import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MainLayoutComponent } from './main-layout.component';

describe('MainLayoutComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('monta el header, el sidebar y el outlet de rutas', async () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    await fixture.whenStable();
    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.querySelector('app-header')).toBeTruthy();
    expect(raiz.querySelector('app-sidebar')).toBeTruthy();
    expect(raiz.querySelector('router-outlet')).toBeTruthy();
  });

  it('pinta la barra superior y la navegacion lateral', async () => {
    const fixture = TestBed.createComponent(MainLayoutComponent);
    await fixture.whenStable();
    const raiz = fixture.nativeElement as HTMLElement;

    expect(raiz.querySelector('header.header')).toBeTruthy();
    expect(raiz.querySelector('nav.sidebar')).toBeTruthy();
    // Solo las secciones visibles sin rol de staff.
    expect(raiz.querySelectorAll('nav.sidebar a').length).toBeGreaterThan(0);
  });
});
