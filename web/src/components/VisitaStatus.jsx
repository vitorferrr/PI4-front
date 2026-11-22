import { STATUS_VISITA } from '../lib/visitas';
import styles from './VisitaStatus.module.css';

export default function VisitaStatus({ status }) {
  return (
    <span className={`${styles.status} ${styles[status] ?? ''}`}>
      {STATUS_VISITA[status] ?? 'Status não informado'}
    </span>
  );
}
