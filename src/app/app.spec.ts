import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { ChaosService } from './core/http/chaos';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();
  });

  it('renders the shell with the HTTP log', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.brand')?.textContent).toContain('HttpClient');
    expect(el.querySelector('app-http-log')).not.toBeNull();
  });

  it('toggles the flaky-network simulation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.chaos-note')).toBeNull();

    el.querySelector<HTMLInputElement>('.toggle input')!.click();
    await fixture.whenStable();
    expect(TestBed.inject(ChaosService).enabled()).toBe(true);
    expect(el.querySelector('.chaos-note')).not.toBeNull();
  });
});
