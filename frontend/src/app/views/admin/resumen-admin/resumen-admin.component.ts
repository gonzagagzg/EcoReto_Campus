import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AlertaComponent } from '../../../shared/components/alerta/alerta.component';
import { InsigniaComponent } from '../../../shared/components/insignia/insignia.component';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { mensajeDeError } from '../../../shared/utils/error-http';
import type { ResumenAdmin } from '../../../core/models/admin.model';

/** Métricas agregadas del campus: cuentas, retos, evidencias y soporte. */
@Component({
  selector: 'app-resumen-admin',
  imports: [RouterLink, AlertaComponent, InsigniaComponent, LoaderComponent],
  styleUrl: './resumen-admin.component.css',
  templateUrl: './resumen-admin.component.html',
})
export class ResumenAdminComponent {
  private readonly adminService = inject(AdminService);

  protected resumen = signal<ResumenAdmin | null>(null);
  protected cargando = signal(true);
  protected error = signal('');

  constructor() {
    this.adminService.resumen().subscribe({
      next: (resumen) => {
        this.resumen.set(resumen);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(err));
      },
    });
  }
}
