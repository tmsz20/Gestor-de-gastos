import { Category } from '@/domain/models';
import type { IconName } from '@/ui/components/Icon';

/** Formatea un número como moneda ARS */
export function formatCurrency(n: number): string {
  return `$${n.toLocaleString('es-AR')}`;
}

/** Mapea una categoría de gasto a su nombre de ícono UI */
export function categoryIconName(cat: Category): IconName {
  switch (cat) {
    case Category.Comida:
      return 'food';
    case Category.TransporteExtra:
      return 'car';
    case Category.Entretenimiento:
    case Category.TimbaCasino:
      return 'entertainment';
    case Category.Salud:
      return 'health';
    case Category.RopaCalzado:
    case Category.Otros:
      return 'shopping';
    case Category.Imprevistos:
      return 'warning';
    default:
      return 'shopping';
  }
}
