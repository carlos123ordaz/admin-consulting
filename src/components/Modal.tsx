import { useEffect, type ReactNode } from 'react';
import Icon from './Icon';

interface ModalProps {
  icoName?: string;
  icoBg?: string;
  icoColor?: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  wide?: boolean;
}

export default function Modal({
  icoName, icoBg, icoColor, title, subtitle, onClose, children, footer, wide
}: ModalProps) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog">
        <div className="modal-head">
          {icoName && (
            <div className="mh-ico" style={{ background: icoBg, color: icoColor }}>
              <Icon name={icoName} size={20} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div className="modal-title">{title}</div>
            {subtitle && <div className="modal-sub">{subtitle}</div>}
          </div>
          <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">{footer}</div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  full?: boolean;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, required, full, hint, children }: FieldProps) {
  return (
    <div className={'field' + (full ? ' full' : '')}>
      <label>{label}{required && <span className="req">*</span>}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

interface ColorPickProps {
  value: string;
  onChange: (c: string) => void;
  palette: string[];
}

export function ColorPick({ value, onChange, palette }: ColorPickProps) {
  return (
    <div className="color-pick">
      {palette.map(c => (
        <div key={c} className={'color-dot' + (value === c ? ' sel' : '')}
          style={{ background: c }} onClick={() => onChange(c)} />
      ))}
    </div>
  );
}
