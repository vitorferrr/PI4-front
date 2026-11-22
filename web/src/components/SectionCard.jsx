import { useId } from 'react';

const cardStyle = {
  minWidth: 0,
  padding: 'clamp(0.75rem, 2vw, 1.5rem)',
  backgroundColor: '#fff',
  border: '1px solid #e1e4e8',
  borderRadius: '8px',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
  boxSizing: 'border-box',
  overflowWrap: 'anywhere',
};

const titleStyle = {
  margin: '0 0 1rem',
  color: '#2c3e50',
  fontSize: '1rem',
  fontWeight: 600,
  lineHeight: 1.4,
};

export default function SectionCard({ title, children, className }) {
  const titleId = useId();

  return (
    <section className={className} style={cardStyle} aria-labelledby={title ? titleId : undefined}>
      {title && <h2 id={titleId} style={titleStyle}>{title}</h2>}
      {children}
    </section>
  );
}
