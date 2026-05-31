import { useDB } from '../context/DBContext';

interface AvatarProps {
  id: string;
  size?: number;
  ring?: boolean;
}

export default function Avatar({ id, size = 28, ring = false }: AvatarProps) {
  const db = useDB();
  const m = db.byId[id];
  if (!m) return null;
  return (
    <div
      className={'avatar' + (ring ? ' ring' : '')}
      style={{ width: size, height: size, background: m.color, fontSize: size * 0.4 }}
      title={m.name}
    >
      {m.initials}
    </div>
  );
}
