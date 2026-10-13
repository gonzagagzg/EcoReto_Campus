import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { failoverInterceptor } from './core/interceptors/failover.interceptor';
import { ConfigService } from './core/services/config.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Habilita HttpClient para consumir la API del backend y adjunta el JWT.
    // failoverInterceptor reintenta los GET en el siguiente backend si el
    // activo falla por red o responde 5xx.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, failoverInterceptor])),
    // Carga config.json (editable sin recompilar) antes de arrancar la app.
    // ConfigService usa fetch nativo para no depender de HttpClient aqui.
    {
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: (config: ConfigService) => () => config.load(),
      deps: [ConfigService],
    },
  ],
};
